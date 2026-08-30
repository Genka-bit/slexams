// ======================================
// SLExam Pro - Service Worker
// ======================================

const CACHE_NAME = "slexams-pro-v1";

const APP_FILES = [
    "./",
    "./index.html",
    "./manifest.json"
];


// ======================================
// INSTALL
// ======================================

self.addEventListener(
    "install",
    event => {

        event.waitUntil(

            caches.open(CACHE_NAME)
                .then(cache => {

                    return cache.addAll(
                        APP_FILES
                    );

                })

        );

        self.skipWaiting();

    }
);


// ======================================
// ACTIVATE
// ======================================

self.addEventListener(
    "activate",
    event => {

        event.waitUntil(

            caches.keys()
                .then(cacheNames => {

                    return Promise.all(

                        cacheNames
                            .filter(
                                name =>
                                    name !==
                                    CACHE_NAME
                            )
                            .map(
                                name =>
                                    caches.delete(name)
                            )

                    );

                })

        );

        self.clients.claim();

    }
);


// ======================================
// FETCH
// ======================================

self.addEventListener(
    "fetch",
    event => {

        event.respondWith(

            fetch(event.request)
                .catch(() => {

                    return caches.match(
                        event.request
                    );

                })

        );

    }
);
