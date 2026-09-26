import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

function pngDimensions(buffer) {
  assert.equal(buffer.subarray(1, 4).toString(), 'PNG');
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

void test('the manifest contains install and maskable icons with matching raster sizes', async () => {
  const manifest = JSON.parse(
    await readFile('public/manifest.webmanifest', 'utf8'),
  );
  const required = [
    ['icon-192.png', 192],
    ['icon-512.png', 512],
    ['icon-maskable-512.png', 512],
  ];
  for (const [name, size] of required) {
    assert.ok(manifest.icons.some((icon) => icon.src === name));
    assert.deepEqual(pngDimensions(await readFile(`public/${name}`)), {
      width: size,
      height: size,
    });
  }
  assert.deepEqual(
    pngDimensions(await readFile('public/apple-touch-icon.png')),
    { width: 180, height: 180 },
  );
  assert.equal(manifest.id, './');
  assert.equal(manifest.start_url, './');
  assert.equal(manifest.scope, './');
});

void test('the service worker separates navigation fallback from asset misses', async () => {
  const worker = await readFile('public/sw.js', 'utf8');
  assert.match(worker, /request\.mode === 'navigate'/);
  assert.match(worker, /SHELL_KEY/);
  assert.match(worker, /cacheAssetTree/);
  assert.doesNotMatch(worker, /cached \|\| caches\.match\('\/'\)/);
  assert.match(worker, /kikamoyo-v6/);
  assert.match(worker, /self\.registration\.scope/);
  assert.match(worker, /pathname\.startsWith\(API_PATH\)/);
  assert.match(worker, /htmlAssetReferences/);
  assert.match(worker, /cssAssetReferences/);
  assert.doesNotMatch(worker, /type\.includes\('javascript'\)/);
});
