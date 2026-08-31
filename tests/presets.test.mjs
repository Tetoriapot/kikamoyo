import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createServer } from 'vite';

let server;
let presetModule;
let typeModule;
let seedModule;

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
