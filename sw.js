const CACHE_NAME = 'markitdown-v1.0.29';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './manifest.json',
  './favicon.png',
  './Opening.md',
  './MarkdownGuide.md'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all([
        ...keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)),
        self.clients.claim()
      ]);
    })
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(caches.match(e.request).then((res) => res || fetch(e.request)));
});

self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
