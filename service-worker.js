
const CACHE_NAME = "papeleria-v1";

const ARCHIVOS_BASE = [
    "./",
    "./index.html",
    "./login.html",
    "./manifest.json",
    "./iconos/icon-192.png",
    "./iconos/icon-512.png"
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(ARCHIVOS_BASE))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((nombres) =>
            Promise.all(
                nombres
                    .filter((nombre) =>
                        nombre.startsWith("papeleria-") &&
                        nombre !== CACHE_NAME
                    )
                    .map((nombre) => caches.delete(nombre))
            )
        ).then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", (event) => {
    const solicitud = event.request;

    if (
        solicitud.method !== "GET" ||
        new URL(solicitud.url).origin !== self.location.origin
    ) {
        return;
    }

    event.respondWith(
        caches.match(solicitud).then((respuestaCache) => {
            if (respuestaCache) {
                return respuestaCache;
            }

            return fetch(solicitud).then((respuesta) => {
                if (respuesta.ok) {
                    const copia = respuesta.clone();

                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(solicitud, copia);
                    });
                }

                return respuesta;
            });
        })
    );
});
