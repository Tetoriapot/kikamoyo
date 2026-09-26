import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

function restoreEnvironment(name, value) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

void test('the GitHub Pages target emits a prefix-aware static export', async () => {
  const previousTarget = process.env.DEPLOY_TARGET;
  const previousBasePath = process.env.NEXT_PUBLIC_BASE_PATH;
  const previousSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  try {
    process.env.DEPLOY_TARGET = 'github-pages';
    process.env.NEXT_PUBLIC_BASE_PATH = '/sample-repository/';
    process.env.NEXT_PUBLIC_SITE_URL =
      'https://example.github.io/sample-repository/';
    const { default: config } = await import(
      `../next.config.ts?pages=${Date.now()}`
    );
    assert.equal(config.output, 'export');
    assert.equal(config.basePath, undefined);
    assert.equal(
      config.assetPrefix,
      'https://example.github.io/sample-repository',
    );
    assert.equal(config.trailingSlash, true);
  } finally {
    restoreEnvironment('DEPLOY_TARGET', previousTarget);
    restoreEnvironment('NEXT_PUBLIC_BASE_PATH', previousBasePath);
    restoreEnvironment('NEXT_PUBLIC_SITE_URL', previousSiteUrl);
  }
});

void test('the default build keeps its server-capable configuration', async () => {
  const previousTarget = process.env.DEPLOY_TARGET;
  try {
    delete process.env.DEPLOY_TARGET;
    const { default: config } = await import(
      `../next.config.ts?default=${Date.now()}`
    );
    assert.deepEqual(config, {});
  } finally {
    restoreEnvironment('DEPLOY_TARGET', previousTarget);
  }
});

void test('the Pages workflow publishes the Vinext client artifact', async () => {
  const workflow = await readFile('.github/workflows/pages.yml', 'utf8');
  assert.match(workflow, /actions\/configure-pages@v6/);
  assert.match(workflow, /NEXT_PUBLIC_BASE_PATH:.*pages\.outputs\.base_path/);
  assert.match(workflow, /NEXT_PUBLIC_SITE_URL:.*pages\.outputs\.base_url/);
  assert.match(workflow, /NEXT_PUBLIC_CLOUD_ENABLED: 'false'/);
  assert.match(workflow, /run: test -f dist\/client\/index\.html/);
  assert.match(workflow, /path: dist\/client/);
  assert.match(workflow, /actions\/deploy-pages@v5/);
});
