const CACHE_NAME = 'lomas-ddh-v2';

const ASSETS = [
    './',
    './index.html',
    './Reporte_Sondaje.html',
    './manifest.json',
    './pozos.json',
    './icon-192.png'
];

// 1. Instalación: Guardar archivos base en caché
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[Service Worker] Guardando archivos base en caché');
            return cache.addAll(ASSETS);
        })
    );
    self.skipWaiting();
});

// 2. Activación: Limpieza de cachés obsoletas
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        console.log('[Service Worker] Eliminando caché antigua:', key);
                        return caches.delete(key);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// 3. Intercepción de solicitudes de red (Fetch)
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Estrategia Network-First para pozos.json (Siempre prioriza datos frescos del servidor)
    if (url.pathname.endsWith('pozos.json')) {
        event.respondWith(
            fetch(event.request)
                .then((networkResponse) => {
                    if (networkResponse.ok) {
                        const clone = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                    }
                    return networkResponse;
                })
                .catch(() => caches.match(event.request))
        );
        return;
    }

    // Para el resto de archivos: Cache-First con respaldo de red
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }
            return fetch(event.request).then((networkResponse) => {
                if (!networkResponse || networkResponse.status !== 200 || (networkResponse.type !== 'basic' && networkResponse.type !== 'cors')) {
                    return networkResponse;
                }
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache);
                });
                return networkResponse;
            });
        })
    );
});
