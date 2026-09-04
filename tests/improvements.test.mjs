import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createServer } from 'vite';

let server;
let presets;
let types;
let repeat;
let exportPlan;
let locks;
let purposes;
let summary;
let search;
let projectCodec;

before(async () => {
  server = await createServer({
    configFile: false,
    root: process.cwd(),
    server: { middlewareMode: true },
    appType: 'custom',
    resolve: { alias: { '@': process.cwd() } },
  });
  [
    presets,
    types,
    repeat,
    exportPlan,
    locks,
    purposes,
    summary,
    search,
    projectCodec,
  ] = await Promise.all([
    server.ssrLoadModule('/data/presets.ts'),
    server.ssrLoadModule('/lib/pattern-types.ts'),
    server.ssrLoadModule('/lib/repeat-layout.ts'),
    server.ssrLoadModule('/lib/export-plan.ts'),
    server.ssrLoadModule('/lib/random-locks.ts'),
    server.ssrLoadModule('/data/purpose-presets.ts'),
    server.ssrLoadModule('/lib/pattern-summary.ts'),
    server.ssrLoadModule('/lib/preset-search.ts'),
    server.ssrLoadModule('/lib/project-codec.ts'),
  ]);
});

after(async () => server?.close());

void test('repeat plans expose stable fundamental cells', () => {
  assert.deepEqual(repeat.getRepeatPlan('straight', 256), {
    width: 256,
    height: 256,
    placements: [{ key: 'normal', x: 0, y: 0, scaleX: 1, scaleY: 1 }],
  });
  assert.equal(repeat.getRepeatPlan('halfDrop', 256).width, 512);
  assert.equal(repeat.getRepeatPlan('halfDrop', 256).placements.length, 3);
  assert.deepEqual(
    [
      repeat.getRepeatPlan('mirrorX', 128).width,
      repeat.getRepeatPlan('mirrorX', 128).height,
    ],
    [256, 128],
  );
  assert.deepEqual(
    [
      repeat.getRepeatPlan('mirrorBoth', 128).width,
      repeat.getRepeatPlan('mirrorBoth', 128).height,
    ],
    [256, 256],
  );
});

void test('new repeat modes remain optional and validated', () => {
  const legacy = types.cloneDocument(presets.INITIAL_PRESET.document);
  assert.equal(legacy.canvas.repeatMode, undefined);
  assert.equal(types.isEditorDocument(legacy), true);
  legacy.canvas.repeatMode = 'halfDrop';
  assert.equal(types.isEditorDocument(legacy), true);
  legacy.canvas.repeatMode = 'unknown';
  assert.equal(types.isEditorDocument(legacy), false);
});

void test('export sizing preserves source coordinates and computes print pixels', () => {
  assert.deepEqual(
    exportPlan.computeExportViewBox(1200, 630, 1080, 1080, 'cover'),
    { x: 285, y: 0, width: 630, height: 630 },
  );
  const contain = exportPlan.computeExportViewBox(
    1200,
    630,
    1080,
    1080,
    'contain',
  );
  assert.equal(contain.width, 1200);
  assert.equal(contain.height, 1200);
  assert.deepEqual(exportPlan.printPixelSize(210, 297, 'mm', 300, 3), {
    width: 2551,
    height: 3579,
  });
});

void test('random channel locks preserve requested artwork channels', () => {
  const current = types.cloneDocument(presets.PRESETS[0].document);
  const candidate = types.cloneDocument(presets.STYLE_PRESETS[0].document);
  const colorLocked = locks.mergeLockedRandomChannels(current, candidate, {
    palette: true,
    shape: false,
    placement: false,
  });
  assert.deepEqual(colorLocked.palette, current.palette);
  assert.equal(colorLocked.canvas.background, current.canvas.background);
  const structureLocked = locks.mergeLockedRandomChannels(current, candidate, {
    palette: false,
    shape: true,
    placement: true,
  });
  assert.equal(structureLocked.seed, current.seed);
  assert.equal(structureLocked.layers[0].type, current.layers[0].type);
  assert.equal(
    structureLocked.layers[0].config.placement,
    current.layers[0].config.placement,
  );
});

void test('purpose presets and bilingual descriptions cover common use cases', () => {
  assert.equal(purposes.PURPOSE_PRESETS.length, 7);
  assert.equal(
    new Set(purposes.PURPOSE_PRESETS.map((item) => item.id)).size,
    7,
  );
  assert.ok(
    purposes.PURPOSE_PRESETS.every(
      (item) => item.width >= 64 && item.height >= 64,
    ),
  );
  const japanese = summary.describePattern(
    presets.STYLE_PRESETS[0].document,
    'ja',
  );
  const english = summary.describePattern(
    presets.STYLE_PRESETS[0].document,
    'en',
  );
  assert.match(japanese, /ローポリ/);
  assert.match(english, /low-poly/);
});

void test('Japanese feature words find tagged presets', () => {
  assert.ok(
    presets.ALL_PRESETS.some((preset) =>
      search.matchesPresetSearch(preset, 'ポリゴン'),
    ),
  );
  assert.ok(
    presets.ALL_PRESETS.some((preset) =>
      search.matchesPresetSearch(preset, '和風'),
    ),
  );
  assert.equal(
    search.matchesPresetSearch(presets.ALL_PRESETS[0], '存在しない検索語'),
    false,
  );
});

void test('project JSON round-trips as an imported copy with named versions', () => {
  const snapshot = {
    sessionVersion: 1,
    document: types.cloneDocument(presets.INITIAL_PRESET.document),
    presetId: presets.INITIAL_PRESET.id,
    presetName: presets.INITIAL_PRESET.name,
    activeLayerId: presets.INITIAL_PRESET.document.layers[0].id,
  };
  const project = projectCodec.createLocalProject('テスト', snapshot);
  const withVersion = projectCodec.addProjectVersion(
    project,
    snapshot,
    '確認版',
  );
  const imported = projectCodec.decodeProjectFile(
    projectCodec.encodeProjectFile(withVersion),
  );
  assert.notEqual(imported.id, withVersion.id);
  assert.equal(imported.versions.length, 2);
  assert.equal(imported.versions[0].label, '確認版');
  assert.equal(types.isEditorSnapshot(imported.versions[0].snapshot), true);
});
