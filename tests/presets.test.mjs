import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { after, before, test } from 'node:test';
import { createServer } from 'vite';

let server;
let presetModule;
let typeModule;
let seedModule;
let layoutModule;
let omakaseModule;
let proceduralModule;

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
  proceduralModule = await server.ssrLoadModule('/lib/procedural-layout.ts');
});

after(async () => {
  await server?.close();
});

void test('the current preset corpus is neutral while frozen legacy corpora remain available', () => {
  const {
    ALL_PRESETS,
    LEGACY_ALL_PRESETS,
    LEGACY_PRESETS,
    PRESETS,
    STYLE_PRESETS,
  } = presetModule;
  assert.equal(PRESETS.length, 100);
  assert.equal(new Set(PRESETS.map((preset) => preset.id)).size, 100);
  assert.ok(PRESETS.every((preset) => preset.document.layers.length === 3));
  assert.ok(PRESETS.every((preset) => preset.document.canvas.seamless));
  assert.equal(LEGACY_PRESETS.length, 100);
  assert.equal(STYLE_PRESETS.length, 17);
  assert.equal(ALL_PRESETS.length, 117);
  assert.equal(LEGACY_ALL_PRESETS.length, 117);
  assert.equal(
    new Set(ALL_PRESETS.map((preset) => preset.id)).size,
    ALL_PRESETS.length,
  );
  assert.ok(
    ALL_PRESETS.every((preset) => typeModule.isEditorDocument(preset.document)),
  );
  assert.ok(
    LEGACY_ALL_PRESETS.every((preset) =>
      typeModule.isEditorDocument(preset.document),
    ),
  );

  const forbiddenName = /accent|detail|アクセント|ディテール|ディティール/i;
  const forbiddenId = /(?:^|[-_])(?:accent|detail)(?=$|[-_])/i;
  const currentLayers = ALL_PRESETS.flatMap((preset) => preset.document.layers);
  assert.ok(currentLayers.every((layer) => !forbiddenName.test(layer.name)));
  assert.ok(currentLayers.every((layer) => !forbiddenId.test(layer.id)));
  assert.ok(
    PRESETS.every(
      (preset) => preset.document.layers[1].id === `${preset.id}-layer-2`,
    ),
  );
  assert.ok(
    PRESETS.every(
      (preset) => preset.document.layers[2].id === `${preset.id}-layer-3`,
    ),
  );
  assert.ok(
    PRESETS.every((preset) => preset.document.layers[1].name === 'レイヤー 2'),
  );
  assert.ok(
    PRESETS.every((preset) => preset.document.layers[2].name === 'レイヤー 3'),
  );
});

void test('the complete shape and placement registries are available', () => {
  for (const type of ['lowPoly', 'glassShards', 'geoCollage', 'quarterTiles'])
    assert.ok(typeModule.PATTERN_TYPES.includes(type));
  assert.equal(typeModule.PLACEMENT_TYPES.length, 15);
});

void test('required search tags are represented', () => {
  const required = [
    'simple',
    'minimal',
    'dot',
    'circle',
    'line',
    'stripe',
    'square',
    'triangle',
    'hexagon',
    'wave',
    'zigzag',
    'japanese',
    'retro',
    'pop',
    'cute',
    'cool',
    'dark',
    'gold',
    'artdeco',
    'scifi',
    'cyber',
    'magic',
    'fantasy',
    'trpg',
    'background',
    'seamless',
    'print',
    'web',
  ];
  const tags = new Set(
    presetModule.ALL_PRESETS.flatMap((preset) => preset.tags),
  );
  for (const tag of required) assert.ok(tags.has(tag), `missing tag: ${tag}`);
  for (const tag of [
    'abstract',
    'lowpoly',
    'polygon',
    'shards',
    'collage',
    'quarter',
  ])
    assert.ok(tags.has(tag), `missing style tag: ${tag}`);
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
  assert.equal(
    typeModule.parseEditorSnapshot(valid)?.presetName,
    '復元した模様',
  );

  const noLayers = typeModule.cloneDocument(valid);
  noLayers.layers = [];
  assert.equal(typeModule.isEditorDocument(noLayers), false);

  const duplicateLayer = typeModule.cloneDocument(valid);
  duplicateLayer.layers[1].id = duplicateLayer.layers[0].id;
  assert.equal(typeModule.isEditorDocument(duplicateLayer), false);

  const unknownPlacement = typeModule.cloneDocument(valid);
  unknownPlacement.layers[0].config.placement = 'unknown';
  assert.equal(typeModule.isEditorDocument(unknownPlacement), false);

  const currentGeneration = {
    sessionVersion: 1,
    document: valid,
    presetId: null,
    presetName: 'v3 generation',
    activeLayerId: valid.layers[0].id,
    generation: { kind: 'omakase', category: 'all', algorithmVersion: 3 },
  };
  assert.equal(typeModule.isEditorSnapshot(currentGeneration), true);
});

void test('omakase v1 and v2 remain byte-stable while v3 uses the current corpus', () => {
  const legacy = omakaseModule.generateOmakase(472981, 'all', 1);
  assert.equal(legacy.preset.id, 'circle-032');
  assert.equal(legacy.preset.name, 'バブル');
  assert.equal(legacy.generation.algorithmVersion, 1);
  assert.equal(
    createHash('sha256').update(JSON.stringify(legacy.document)).digest('hex'),
    '529703c01a8ef053ad4d02b88664571b92b1e1882f6a4fe90dbf268cf6b8d49b',
  );
  assert.deepEqual(
    omakaseModule.inferLegacyOmakaseGeneration(legacy.document),
    legacy.generation,
  );
  const alteredLegacy = structuredClone(legacy.document);
  alteredLegacy.canvas.background = '#123456';
  assert.equal(
    omakaseModule.inferLegacyOmakaseGeneration(alteredLegacy),
    undefined,
  );

  const legacyV2 = omakaseModule.generateOmakase(472981, 'all', 2);
  assert.equal(legacyV2.preset.id, 'line-020');
  assert.equal(legacyV2.generation.algorithmVersion, 2);
  assert.equal(
    createHash('sha256')
      .update(JSON.stringify(legacyV2.document))
      .digest('hex'),
    '49763b3f703562ec4072cb08f2f2240281170d2bc439ece83231038b2aaf9901',
  );

  const first = omakaseModule.generateOmakase(472981, 'all');
  const second = omakaseModule.generateOmakase(472981, 'all');
  assert.deepEqual(first, second);
  assert.equal(first.generation.algorithmVersion, 3);
  assert.equal(first.document.seed, 472981);
  assert.notDeepEqual(
    first.document,
    omakaseModule.generateOmakase(472982, 'all').document,
  );
  assert.ok(
    first.document.layers.every(
      (layer) => !/(?:^|[-_])(?:accent|detail)(?=$|[-_])/i.test(layer.id),
    ),
  );
  assert.ok(
    ['lowPoly', 'glassShards', 'geoCollage', 'quarterTiles'].includes(
      omakaseModule.generateOmakase(123456, 'abstract').document.layers[0].type,
    ),
  );
  assert.ok(
    ['lowPoly', 'glassShards', 'geoCollage', 'quarterTiles'].includes(
      omakaseModule.generateOmakase(123456, 'abstract', 2).document.layers[0]
        .type,
    ),
  );
});

void test('low-poly facets are deterministic, bounded, finite, and periodic at tile edges', () => {
  const layer = structuredClone(
    presetModule.STYLE_PRESETS[0].document.layers[0],
  );
  const first = proceduralModule.createLowPolyFacets(
    layer,
    512,
    512,
    381244,
    220,
    5,
    true,
  );
  const second = proceduralModule.createLowPolyFacets(
    layer,
    512,
    512,
    381244,
    220,
    5,
    true,
  );
  assert.deepEqual(first, second);
  assert.notDeepEqual(
    first,
    proceduralModule.createLowPolyFacets(layer, 512, 512, 381245, 220, 5, true),
  );
  assert.ok(first.length > 20 && first.length <= 220);
  assert.ok(
    first
      .flatMap((facet) => facet.points)
      .every(
        ([x, y]) =>
          Number.isFinite(x) &&
          Number.isFinite(y) &&
          x >= 0 &&
          x <= 512 &&
          y >= 0 &&
          y <= 512,
      ),
  );

  const edgeValues = (axis, value, otherAxis) =>
    [
      ...new Set(
        first
          .flatMap((facet) => facet.points)
          .filter((point) => Math.abs(point[axis] - value) < 1e-8)
          .map((point) => point[otherAxis].toFixed(8)),
      ),
    ].sort((a, b) => a.localeCompare(b));
  assert.deepEqual(edgeValues(0, 0, 1), edgeValues(0, 512, 1));
  assert.deepEqual(edgeValues(1, 0, 0), edgeValues(1, 512, 0));

  const smallScale = structuredClone(layer);
  const largeScale = structuredClone(layer);
  smallScale.scale = 0.5;
  largeScale.scale = 2;
  assert.ok(
    proceduralModule.createLowPolyFacets(
      largeScale,
      512,
      512,
      381244,
      220,
      5,
      true,
    ).length <
      proceduralModule.createLowPolyFacets(
        smallScale,
        512,
        512,
        381244,
        220,
        5,
        true,
      ).length,
  );
});

void test('shards keep complete seamless copies within the object budget', () => {
  const layer = structuredClone(
    presetModule.STYLE_PRESETS.find(
      (preset) => preset.document.layers[0].type === 'glassShards',
    ).document.layers[0],
  );
  const shards = proceduralModule.createShardPolygons(
    layer,
    256,
    256,
    928441,
    240,
    5,
    true,
  );
  assert.ok(shards.length > 10 && shards.length <= 240);
  assert.ok(
    shards
      .flatMap((shard) => shard.points)
      .every(([x, y]) => Number.isFinite(x) && Number.isFinite(y)),
  );
  assert.ok(
    shards.some((shard) =>
      shard.key
        .split(':')
        .slice(1)
        .some((value) => value !== '0'),
    ),
  );
});

void test('quarter-circle tiles use deterministic right-angle rotations', () => {
  const layer = structuredClone(
    presetModule.STYLE_PRESETS.find(
      (preset) => preset.document.layers[0].type === 'quarterTiles',
    ).document.layers[0],
  );
  const tiles = proceduralModule.createQuarterCircleTiles(
    layer,
    512,
    512,
    824113,
    160,
    4,
  );
  assert.ok(tiles.length > 8 && tiles.length <= 160);
  assert.ok(
    tiles.every(
      (tile) =>
        Number.isFinite(tile.x) &&
        Number.isFinite(tile.y) &&
        tile.rotation % 90 === 0,
    ),
  );
  assert.deepEqual(
    tiles,
    proceduralModule.createQuarterCircleTiles(layer, 512, 512, 824113, 160, 4),
  );

  const smallScale = structuredClone(layer);
  const largeScale = structuredClone(layer);
  smallScale.scale = 0.5;
  largeScale.scale = 1.5;
  const smallTiles = proceduralModule.createQuarterCircleTiles(
    smallScale,
    512,
    512,
    824113,
    160,
    4,
  );
  const largeTiles = proceduralModule.createQuarterCircleTiles(
    largeScale,
    512,
    512,
    824113,
    160,
    4,
  );
  assert.ok(largeTiles[0].size > smallTiles[0].size);
});

void test('non-square radial and random layouts use the true canvas bounds', () => {
  const layer = structuredClone(presetModule.INITIAL_PRESET.document.layers[0]);
  layer.config.placement = 'radial';
  layer.config.roughness = 0;
  layer.config.jitterPosition = 0;
  layer.config.jitterRotation = 0;
  layer.config.jitterSize = 0;
  const radial = layoutModule.createBaseInstances(
    layer,
    1080,
    1920,
    123456,
    200,
    4,
  );
  const averageX =
    radial.reduce((sum, item) => sum + item.x, 0) / radial.length;
  const averageY =
    radial.reduce((sum, item) => sum + item.y, 0) / radial.length;
  assert.ok(Math.abs(averageX - 540) < 1e-8);
  assert.ok(Math.abs(averageY - 960) < 1e-8);

  layer.config.placement = 'random';
  const random = layoutModule.createBaseInstances(
    layer,
    1080,
    1920,
    123456,
    200,
    4,
  );
  assert.ok(
    random.every(
      (item) => item.x >= 0 && item.x <= 1080 && item.y >= 0 && item.y <= 1920,
    ),
  );
  assert.deepEqual(
    random,
    layoutModule.createBaseInstances(layer, 1080, 1920, 123456, 200, 4),
  );
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
  const signatures = ['grid', 'offsetGrid', 'brick', 'hexGrid', 'tile'].map(
    (placement) => {
      layer.config.placement = placement;
      return layoutModule
        .createBaseInstances(layer, 512, 512, 123456, 200, 4)
        .slice(0, 12)
        .map(
          (item) =>
            `${item.x.toFixed(2)},${item.y.toFixed(2)},${item.rotation.toFixed(2)}`,
        )
        .join('|');
    },
  );
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
  const source = [
    {
      key: '0',
      x: 64,
      y: 64,
      rotation: 0,
      scaleX: 1.52,
      scaleY: 1.52,
      opacity: 1,
      colorIndex: 0,
    },
  ];
  const copies = layoutModule.addSeamlessCopies(source, layer, 128, 1);
  assert.ok(
    copies.length > 1,
    'the first orbit remains complete even when the object budget is one',
  );
  assert.ok(
    copies.some((item) => /:(?:-?2|-?3):/.test(item.key)),
    'copies extend past the immediately adjacent tile',
  );
});
