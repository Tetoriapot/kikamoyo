import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { compileFunction } from 'node:vm';
import ts from 'typescript';
const require = createRequire(import.meta.url);

let server, types, presets, codec, brands, colors, composition, engine;
before(async () => {
  server = await createServer({
    configFile: false,
    root: process.cwd(),
    server: { middlewareMode: true },
    appType: 'custom',
    resolve: { alias: { '@': process.cwd() } },
  });
  [types, presets, codec, brands, colors, composition] = await Promise.all(
    [
      '/lib/pattern-types.ts',
      '/data/presets.ts',
      '/lib/project-codec.ts',
      '/lib/brand-palettes.ts',
      '/lib/reference-colors.ts',
      '/lib/composition.ts',
    ].map((path) => server.ssrLoadModule(path)),
  );
  // Keep React in Node's native CJS loader: Vite 8's SSR runner does not resolve
  // React reliably from a Windows path containing non-ASCII characters.
  const dependencies = new Map(
    await Promise.all(
      [
        'pattern-layout',
        'procedural-layout',
        'repeat-layout',
        'seed',
        'composition',
      ].map(async (name) => [
        `@/lib/${name}`,
        await server.ssrLoadModule(`/lib/${name}.ts`),
      ]),
    ),
  );
  const source = await readFile(
    new URL('../lib/pattern-engine.tsx', import.meta.url),
    'utf8',
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  engine = {};
  compileFunction(compiled, ['require', 'exports'])(
    (id) => dependencies.get(id) ?? require(id),
    engine,
  );
});
after(async () => server?.close());

void test('text space preserves one layer, validates bounds and disappears when repeat is enabled', () => {
  const document = types.cloneDocument(presets.PRESETS[0].document);
  document.canvas.seamless = false;
  for (const position of ['left', 'center', 'right']) {
    document.canvas.textSpace = { position, width: 0.4 };
    assert.equal(types.isEditorDocument(document), true);
    const stops = composition.textSpaceStops(document.canvas.textSpace);
    assert.ok(
      stops.every(
        (stop, index) =>
          stop.offset >= 0 &&
          stop.offset <= 1 &&
          (!index || stop.offset >= stops[index - 1].offset),
      ),
    );
    const markup = renderToStaticMarkup(
      createElement(engine.PatternCanvas, { document }),
    );
    assert.match(markup, /<mask /);
    assert.match(markup, /mask="url\(#text-space-/);
    assert.equal(document.layers.length, 1);
  }
  document.canvas.textSpace.width = NaN;
  assert.equal(types.isEditorDocument(document), false);
  document.canvas.textSpace.width = 0.4;
  document.canvas.seamless = true;
  assert.equal(types.isEditorDocument(document), false);
  const normalized = types.normalizeSnapshot({
    sessionVersion: 1,
    document,
    presetId: null,
    presetName: 'Test',
    activeLayerId: document.layers[0].id,
  });
  assert.equal(normalized.document.canvas.textSpace, undefined);
  assert.equal(types.isEditorSnapshot(normalized), true);
});

void test('preview and export preserve dense geometry; transparent text space stays transparent', () => {
  const document = types.cloneDocument(presets.PRESETS[0].document);
  document.layers[0].config.density = 100;
  document.canvas.seamless = false;
  document.canvas.transparent = true;
  document.canvas.textSpace = { position: 'left', width: 0.4 };
  const preview = renderToStaticMarkup(
    createElement(engine.PatternCanvas, { document, maxObjects: 5000 }),
  );
  const exported = renderToStaticMarkup(
    createElement(engine.PatternCanvas, {
      document,
      maxObjects: 5000,
      outputWidth: 2160,
      outputHeight: 2160,
    }),
  );
  const points = (text) => text.match(/(?:points|d|transform)="[^"]*"/g);
  assert.deepEqual(points(preview), points(exported));
  assert.doesNotMatch(exported, /data-export-background/);
  assert.match(exported, /<linearGradient/);
});

void test('reference colors are deterministic and ignore transparent pixels', () => {
  const pixels = new Uint8ClampedArray([
    255, 0, 0, 255, 255, 0, 0, 255, 0, 0, 255, 255, 0, 255, 0, 0,
  ]);
  assert.deepEqual(colors.extractPalette(pixels), ['#ff0000', '#0000ff']);
  assert.deepEqual(
    colors.extractPalette(new Uint8ClampedArray([0, 255, 0, 0])),
    [],
  );
  assert.deepEqual(
    colors.extractPalette(pixels),
    colors.extractPalette(pixels),
  );
  assert.equal(
    brands.isBrandPalette({
      id: 'test',
      name: 'Brand',
      background: '#ffffff',
      colors: ['url(https://example.com)'],
    }),
    false,
  );
});

void test('library backup preserves versions, trash and palettes, merges without overwrite, and rejects invalid input', () => {
  const project = codec.createLocalProject(
    'Work',
    types.parseEditorSnapshot(presets.PRESETS[0].document),
  );
  const library = {
    projects: [project],
    trash: [codec.createLocalProject('Deleted', project.versions[0].snapshot)],
    brandPalettes: [
      {
        id: 'brand',
        name: 'Brand',
        background: '#ffffff',
        colors: ['#ff0000', '#0000ff'],
      },
    ],
  };
  const restored = codec.decodeLibraryBackup(
    codec.encodeLibraryBackup(library),
  );
  assert.deepEqual(restored, library);
  assert.deepEqual(codec.mergeLibraryBackup(library, restored), library);
  const changed = structuredClone(restored);
  changed.projects[0].name = 'Changed';
  changed.brandPalettes[0].name = 'Changed';
  const merged = codec.mergeLibraryBackup(library, changed);
  assert.equal(merged.projects.length, 2);
  assert.equal(merged.brandPalettes.length, 2);
  assert.notEqual(merged.projects[0].id, merged.projects[1].id);
  assert.equal(merged.projects[0].name, 'Work');
  assert.throws(() =>
    codec.decodeLibraryBackup(
      JSON.stringify({ format: 'kikamoyo-library', fileVersion: 99, library }),
    ),
  );
  const invalid = structuredClone(library);
  invalid.brandPalettes[0].colors = ['invalid'];
  assert.throws(() =>
    codec.decodeLibraryBackup(codec.encodeLibraryBackup(invalid)),
  );
  const full = {
    ...library,
    projects: Array.from({ length: 20 }, () =>
      codec.createLocalProject('Kept', project.versions[0].snapshot),
    ),
  };
  assert.throws(() => codec.mergeLibraryBackup(full, library));
  assert.equal(full.projects.length, 20);
});

void test('projects and brand colors migrate and save atomically with failure protection', () => {
  const data = new Map();
  let fail = false;
  const oldPalette = {
    id: 'old',
    name: 'Old',
    background: '#ffffff',
    colors: ['#112233'],
  };
  data.set(brands.BRAND_PALETTE_KEY, JSON.stringify([oldPalette]));
  globalThis.window = {
    localStorage: {
      getItem: (key) => data.get(key) ?? null,
      setItem: (key, value) => {
        if (fail) throw new Error('QuotaExceededError');
        data.set(key, value);
      },
    },
  };
  try {
    assert.deepEqual(codec.readBrandPalettes(), [oldPalette]);
    const project = codec.createLocalProject(
      'Kept',
      types.parseEditorSnapshot(presets.PRESETS[0].document),
    );
    codec.writeProjectLibrary({ projects: [project], trash: [] });
    assert.deepEqual(codec.readBrandPalettes(), [oldPalette]);
    const before = data.get('kikamoyo.library.v2');
    fail = true;
    assert.throws(() =>
      codec.writeProjectLibrary({
        projects: [],
        trash: [project],
        brandPalettes: [],
      }),
    );
    assert.equal(data.get('kikamoyo.library.v2'), before);
    fail = false;
    codec.writeBrandPalettes([]);
    assert.deepEqual(codec.readLocalProjects(), [project]);
    assert.deepEqual(codec.readBrandPalettes(), []);
  } finally {
    delete globalThis.window;
  }
});
