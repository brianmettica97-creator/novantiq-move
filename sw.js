// Service worker de NOVANTIQ Move: permite instalar la app y usarla sin conexión.
//
// Estrategia:
//   - HTML, CSS y JS: primero la red (así siempre se ve la última versión publicada);
//     si no hay conexión, se usa la copia guardada.
//   - Imágenes: primero la copia guardada (son pesadas y no cambian); si no está, la red.
// Cambiá CACHE_VERSION cuando quieras forzar que se descarte todo lo guardado.

const CACHE_VERSION = 'novantiq-move-v1';
const CORE = ['./', './index.html', './manifest.webmanifest', './assets/icons/icon-192.png', './assets/icons/favicon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_VERSION);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    if (request.mode === 'navigate') return cache.match('./index.html');
    throw new Error('Sin conexión y sin copia guardada');
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_VERSION);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  // Solo se manejan pedidos GET de la propia app; todo lo demás va directo a la red
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(request.destination === 'image' ? cacheFirst(request) : networkFirst(request));
});
