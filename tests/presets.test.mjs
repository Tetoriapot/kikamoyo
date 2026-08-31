import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createServer } from 'vite';

let server;
let presetModule;
let typeModule;
let seedModule;
let layoutModule;
let omakaseModule;

before(async () => {
  server = await createServer({
    configFile: false,
    root: process.cwd(),
    server: { middlewareMode: true },
    appType: 'custom',
    resolve: { alias: { '@': process.cwd() } },
  });
  presetModule = await server.ssrLoadModule('/data/presets.ts');
  typeModule = await server.ssrLoadModule('/lib/pattern-types.ts');
  seedModule = await server.ssrLoadModule('/lib/seed.ts');
  layoutModule = await server.ssrLoadModule('/lib/pattern-layout.ts');
  omakaseModule = await server.ssrLoadModule('/lib/omakase.ts');
});

after(async () => {
  await server?.close();
});

void test('100 presets are unique and generated from settings', () => {
  const { PRESETS } = presetModule;
  assert.equal(PRESETS.length, 100);
  assert.equal(new Set(PRESETS.map((preset) => preset.id)).size, 100);
  assert.ok(PRESETS.every((preset) => preset.document.layers.length === 3));
  assert.ok(PRESETS.every((preset) => preset.document.canvas.seamless));
});

void test('the complete shape and placement registries are available', () => {
  assert.equal(typeModule.PATTERN_TYPES.length, 19);
  assert.equal(typeModule.PLACEMENT_TYPES.length, 15);
});

void test('required search tags are represented', () => {
  const required = ['simple', 'minimal', 'dot', 'circle', 'line', 'stripe', 'square', 'triangle', 'hexagon', 'wave', 'zigzag', 'japanese', 'retro', 'pop', 'cute', 'cool', 'dark', 'gold', 'artdeco', 'scifi', 'cyber', 'magic', 'fantasy', 'trpg', 'background', 'seamless', 'print', 'web'];
  const tags = new Set(presetModule.PRESETS.flatMap((preset) => preset.tags));
  for (const tag of required) assert.ok(tags.has(tag), `missing tag: ${tag}`);
});

void test('the same seed and channel always reproduce the same jitter', () => {
  const a = seedModule.hashUnit(472981, 'layer-1', 42, 3);
  const b = seedModule.hashUnit(472981, 'layer-1', 42, 3);
  const differentChannel = seedModule.hashUnit(472981, 'layer-1', 42, 4);
  assert.equal(a, b);
  assert.notEqual(a, differentChannel);
  assert.ok(a >= 0 && a < 1);
});

void test('the first launch is the intended Memphis sample', () => {
  assert.equal(presetModule.INITIAL_PRESET.name, '80sメンフィス');
});

void test('editor documents and legacy snapshots are validated deeply', () => {
  const valid = typeModule.cloneDocument(presetModule.INITIAL_PRESET.document);
  assert.equal(typeModule.isEditorDocument(valid), true);
  assert.equal(typeModule.parseEditorSnapshot(valid)?.presetName, '復元した模様');

  const noLayers = typeModule.cloneDocument(valid);
  noLayers.layers = [];
  assert.equal(typeModule.isEditorDocument(noLayers), false);

  const duplicateLayer = typeModule.cloneDocument(valid);
  duplicateLayer.layers[1].id = duplicateLayer.layers[0].id;
  assert.equal(typeModule.isEditorDocument(duplicateLayer), false);

  const unknownPlacement = typeModule.cloneDocument(valid);
  unknownPlacement.layers[0].config.placement = 'unknown';
  assert.equal(typeModule.isEditorDocument(unknownPlacement), false);
});

void test('the same seed and category reproduce the complete omakase document', () => {
  const first = omakaseModule.generateOmakase(472981, 'all');
  const second = omakaseModule.generateOmakase(472981, 'all');
  assert.deepEqual(first, second);
  assert.equal(first.generation.algorithmVersion, 1);
  assert.equal(first.document.seed, 472981);
  assert.notDeepEqual(first.document, omakaseModule.generateOmakase(472982, 'all').document);
});

void test('non-square radial and random layouts use the true canvas bounds', () => {
  const layer = structuredClone(presetModule.INITIAL_PRESET.document.layers[0]);
  layer.config.placement = 'radial';
  layer.config.roughness = 0;
  layer.config.jitterPosition = 0;
  layer.config.jitterRotation = 0;
  layer.config.jitterSize = 0;
  const radial = layoutModule.createBaseInstances(layer, 1080, 1920, 123456, 200, 4);
  const averageX = radial.reduce((sum, item) => sum + item.x, 0) / radial.length;
  const averageY = radial.reduce((sum, item) => sum + item.y, 0) / radial.length;
  assert.ok(Math.abs(averageX - 540) < 1e-8);
  assert.ok(Math.abs(averageY - 960) < 1e-8);

  layer.config.placement = 'random';
  const random = layoutModule.createBaseInstances(layer, 1080, 1920, 123456, 200, 4);
  assert.ok(random.every((item) => item.x >= 0 && item.x <= 1080 && item.y >= 0 && item.y <= 1920));
  assert.deepEqual(random, layoutModule.createBaseInstances(layer, 1080, 1920, 123456, 200, 4));
});

void test('grid, offset, brick, honeycomb, and tile placements have distinct coordinates', () => {
  const layer = structuredClone(presetModule.INITIAL_PRESET.document.layers[0]);
  Object.assign(layer.config, {
    gap: 48,
    density: 60,
    roughness: 0,
    jitterPosition: 0,
    jitterRotation: 0,
    jitterSize: 0,
  });
  const signatures = ['grid', 'offsetGrid', 'brick', 'hexGrid', 'tile'].map((placement) => {
    layer.config.placement = placement;
    return layoutModule.createBaseInstances(layer, 512, 512, 123456, 200, 4)
      .slice(0, 12)
      .map((item) => `${item.x.toFixed(2)},${item.y.toFixed(2)},${item.rotation.toFixed(2)}`)
      .join('|');
  });
  assert.equal(new Set(signatures).size, signatures.length);
});

void test('large seamless motifs receive complete copies beyond adjacent tiles', () => {
  const layer = structuredClone(presetModule.INITIAL_PRESET.document.layers[0]);
  layer.type = 'rectangles';
  layer.scale = 2.4;
  layer.rotation = 45;
  layer.config.size = 140;
  layer.config.aspectX = 2.2;
  layer.config.aspectY = 1;
  const source = [{ key: '0', x: 64, y: 64, rotation: 0, scaleX: 1.52, scaleY: 1.52, opacity: 1, colorIndex: 0 }];
  const copies = layoutModule.addSeamlessCopies(source, layer, 128, 1);
  assert.ok(copies.length > 1, 'the first orbit remains complete even when the object budget is one');
  assert.ok(copies.some((item) => /:(?:-?2|-?3):/.test(item.key)), 'copies extend past the immediately adjacent tile');
});
