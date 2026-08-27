const CACHE = 'tripwise-v1'
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest']
self.addEventListener('install', (event) =>
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  ),
)
self.addEventListener('activate', (event) =>
  event.waitUntil(self.clients.claim()),
)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((response) => {
          if (
            response.ok &&
            (event.request.url.includes('/data/') ||
              event.request.url.includes('/assets/'))
          ) {
            const copy = response.clone()
            if (event.request.url.includes('/data/'))
              copy
                .json()
                .then((data) => {
                  const valid =
                    data &&
                    typeof data === 'object' &&
                    ((typeof data.id === 'string' &&
                      typeof data.name === 'string' &&
                      Array.isArray(data.days)) ||
                      (typeof data.cityId === 'string' &&
                        typeof data.name === 'string' &&
                        Array.isArray(data.locations)))
                  if (valid)
                    caches
                      .open(CACHE)
                      .then((cache) =>
                        cache.put(event.request, response.clone()),
                      )
                })
                .catch(() => {})
            else
              caches
                .open(CACHE)
                .then((cache) => cache.put(event.request, response.clone()))
          }
          return response
        })
        .catch(() => cached || caches.match('/index.html'))
      return cached || network
    }),
  )
})
