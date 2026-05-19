/* Vocab-SRS service worker — cache-first for shell, stale-while-revalidate for data.
 *
 * Versioning: semver MAJOR.MINOR.PATCH.
 *   MAJOR — breaking schema / storage / sync changes (rare)
 *   MINOR — new user-visible features
 *   PATCH — bug fixes, copy / style tweaks
 * Bumping CACHE_VERSION forces all PWA clients to re-download the shell on
 * next launch, so use it whenever shell HTML/JS/CSS materially changes.
 */
const CACHE_VERSION = 'vocab-srs-1.0.1';
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Skip cross-origin (audio MP3s from dictionaryapi.dev) — let browser handle directly
  if (url.origin !== self.location.origin) return;

  // Data files: stale-while-revalidate so new pipeline runs propagate
  if (url.pathname.includes('/data/')) {
    e.respondWith(
      caches.open(CACHE_VERSION).then(async (cache) => {
        const cached = await cache.match(req);
        const networkPromise = fetch(req).then(res => {
          if (res.ok) cache.put(req, res.clone());
          return res;
        }).catch(() => cached);
        return cached || networkPromise;
      })
    );
    return;
  }

  // Shell: cache-first
  e.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(res => {
      if (res.ok && res.type === 'basic') {
        const clone = res.clone();
        caches.open(CACHE_VERSION).then(c => c.put(req, clone));
      }
      return res;
    }))
  );
});
