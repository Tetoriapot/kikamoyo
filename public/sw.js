const CACHE = 'kikamoyo-v5';
const SHELL_KEY = '/__kikamoyo_app_shell__';
const CORE = [
  '/manifest.webmanifest',
  '/favicon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-512.png',
  '/apple-touch-icon.png',
];
const ASSET_PATH =
  /(?:\.(?:js|css|mjs|json|svg|png|webp|jpg|jpeg|woff2?)(?:$|\?))|(?:\/_next\/)|(?:\/assets\/)/i;

function sameOrigin(url) {
  return new URL(url, self.location.origin).origin === self.location.origin;
}

function referencesFromPatterns(text, baseUrl, patterns) {
  const references = new Set();
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      try {
        const url = new URL(match[1], baseUrl);
        if (
          url.origin === self.location.origin &&
          ASSET_PATH.test(`${url.pathname}${url.search}`)
        )
          references.add(url.href);
      } catch {
        /* Ignore malformed or data URLs. */
      }
    }
  }
  return [...references];
}

function htmlAssetReferences(text, baseUrl) {
  return referencesFromPatterns(text, baseUrl, [
    /(?:src|href)=["']([^"']+)["']/g,
  ]);
}

function cssAssetReferences(text, baseUrl) {
  return referencesFromPatterns(text, baseUrl, [
    /@import\s+(?:url\()?\s*["']?([^"')\s;]+)["']?\s*\)?/g,
    /url\(["']?([^"')]+)["']?\)/g,
  ]);
}

async function cacheAssetTree(cache, input, seen = new Set()) {
  const url = new URL(input, self.location.origin).href;
  if (!sameOrigin(url) || seen.has(url)) return;
  seen.add(url);
  const response = await fetch(url, {
    cache: 'reload',
    credentials: 'same-origin',
  });
  if (!response.ok) return;
  await cache.put(url, response.clone());
  const type = response.headers.get('content-type') || '';
  if (!type.includes('text/css')) return;
  const dependencies = cssAssetReferences(await response.text(), url);
  await Promise.allSettled(
    dependencies.map((dependency) => cacheAssetTree(cache, dependency, seen)),
  );
}

async function precacheShell() {
  const cache = await caches.open(CACHE);
  const response = await fetch('/', {
    cache: 'reload',
    credentials: 'same-origin',
  });
  if (!response.ok) throw new Error('App shell request failed');
  const html = await response.clone().text();
  await cache.put(SHELL_KEY, response);
  const references = htmlAssetReferences(html, self.location.origin);
  await Promise.allSettled([
    ...CORE.map((url) => cacheAssetTree(cache, url)),
    ...references.map((url) => cacheAssetTree(cache, url)),
  ]);
}

self.addEventListener('install', (event) => {
  event.waitUntil(precacheShell());
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)),
        ),
      ),
  );
  self.clients.claim();
});

async function navigationResponse(request, event) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      event.waitUntil(
        (async () => {
          const cache = await caches.open(CACHE);
          const html = await response.clone().text();
          await cache.put(SHELL_KEY, response.clone());
          const references = htmlAssetReferences(html, request.url);
          await Promise.allSettled(
            references.map((url) => cacheAssetTree(cache, url)),
          );
        })(),
      );
    }
    return response;
  } catch {
    return (await caches.match(SHELL_KEY)) || Response.error();
  }
}

async function assetResponse(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok && sameOrigin(request.url)) {
    const cache = await caches.open(CACHE);
    await cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  if (new URL(request.url).pathname.startsWith('/api/')) return;
  if (request.mode === 'navigate') {
    event.respondWith(navigationResponse(request, event));
    return;
  }
  if (!sameOrigin(request.url)) return;
  if (
    ASSET_PATH.test(new URL(request.url).pathname) ||
    ['script', 'style', 'font', 'image'].includes(request.destination)
  ) {
    event.respondWith(assetResponse(request));
    return;
  }
  event.respondWith(
    fetch(request).catch(
      async () => (await caches.match(request)) || Response.error(),
    ),
  );
});
