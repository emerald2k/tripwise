import { appVersion } from './version'
import {
  cacheValidatedDataPackage,
  dataCachePrefix,
  readActiveDataCacheName,
  removeStaleDataCaches,
  setActiveDataCacheName,
  type DataCacheStorage,
} from './offline-cache'

interface ExtendableEvent extends Event {
  waitUntil(promise: Promise<unknown>): void
}

interface FetchEvent extends ExtendableEvent {
  request: Request
  respondWith(response: Promise<Response>): void
}

interface ServiceWorkerScope {
  location: Location
  skipWaiting(): Promise<void>
  clients: { claim(): Promise<void> }
  addEventListener(
    type: 'install' | 'activate',
    listener: (event: ExtendableEvent) => void,
  ): void
  addEventListener(type: 'fetch', listener: (event: FetchEvent) => void): void
}

const worker = globalThis as unknown as ServiceWorkerScope
const cacheStorage = caches as unknown as DataCacheStorage
const appCacheName = `tripwise-app-v${appVersion}`
const metadataCacheName = 'tripwise-data-meta'
const dataPointerUrl = new URL(
  '/__tripwise-data',
  worker.location.origin,
).toString()
const appShell = ['/', '/index.html', '/manifest.webmanifest', '/icon.svg']
let dataUpdate: Promise<void> | undefined

function isSameOrigin(request: Request) {
  return new URL(request.url).origin === worker.location.origin
}

function isDataRequest(request: Request) {
  return new URL(request.url).pathname.startsWith('/data/')
}

function isVersionRequest(request: Request) {
  return new URL(request.url).pathname === '/version.json'
}

async function cacheAppResponse(request: Request, response: Response) {
  if (!response.ok) return response
  const cache = await cacheStorage.open(appCacheName)
  await cache.put(request, response.clone())
  return response
}

async function cacheFirstAppRequest(request: Request) {
  const cache = await cacheStorage.open(appCacheName)
  const cached = await cache.match(request)
  if (cached !== undefined) return cached
  try {
    return await cacheAppResponse(request, await fetch(request))
  } catch (error) {
    if (request.mode !== 'navigate') throw error
    const shell = await cache.match('/index.html')
    if (shell === undefined) throw error
    return shell
  }
}

function appResourceUrls(index: string) {
  return [...index.matchAll(/(?:src|href)="([^"]+)"/g)]
    .map((match) => match[1])
    .filter((resource) => resource.startsWith('/'))
}

async function cacheAppShell() {
  const cache = await cacheStorage.open(appCacheName)
  const indexResponse = await fetch('/index.html')
  if (!indexResponse.ok)
    throw new Error('Unable to cache application resource: /index.html')
  const index = await indexResponse.clone().text()
  const resources = new Set([...appShell, ...appResourceUrls(index)])
  await Promise.all(
    [...resources].map(async (resource) => {
      const response =
        resource === '/index.html'
          ? indexResponse.clone()
          : await fetch(resource)
      if (!response.ok)
        throw new Error(`Unable to cache application resource: ${resource}`)
      await cache.put(resource, response)
    }),
  )
}

async function updateDataPackage() {
  if (dataUpdate !== undefined) return dataUpdate
  const cacheName = `${dataCachePrefix}${appVersion}-${Date.now()}`
  dataUpdate = (async () => {
    await cacheValidatedDataPackage(
      cacheStorage,
      (input, init) => fetch(input, { ...init, cache: 'no-store' }),
      worker.location.origin,
      cacheName,
    )
    await setActiveDataCacheName(
      cacheStorage,
      metadataCacheName,
      dataPointerUrl,
      cacheName,
    )
    await removeStaleDataCaches(cacheStorage, cacheName)
  })().finally(() => {
    dataUpdate = undefined
  })
  return dataUpdate
}

async function cacheFirstDataRequest(request: Request, event: FetchEvent) {
  const url = new URL(request.url)
  const pinnedCacheName = url.searchParams.get('tripwise-data-cache')
  if (pinnedCacheName) {
    const cache = await cacheStorage.open(pinnedCacheName)
    const pinned = await cache.match(url.origin + url.pathname)
    if (pinned !== undefined) return pinned
  }

  const activeCacheName = await readActiveDataCacheName(
    cacheStorage,
    metadataCacheName,
    dataPointerUrl,
  )
  if (activeCacheName !== undefined) {
    const cache = await cacheStorage.open(activeCacheName)
    const cached = await cache.match(request)
    if (cached !== undefined) {
      event.waitUntil(updateDataPackage().catch(() => undefined))
      if (url.pathname === '/data/manifest.json') {
        const headers = new Headers(cached.headers)
        headers.set('X-Tripwise-Data-Cache', activeCacheName)
        return new Response(cached.body, {
          status: cached.status,
          statusText: cached.statusText,
          headers,
        })
      }
      return cached
    }
  }

  await updateDataPackage()
  const updatedName = await readActiveDataCacheName(
    cacheStorage,
    metadataCacheName,
    dataPointerUrl,
  )
  if (updatedName === undefined)
    throw new Error('DATA cache was not initialized')
  const updated = await (await cacheStorage.open(updatedName)).match(request)
  if (updated === undefined)
    throw new Error(`Missing cached DATA: ${request.url}`)
  return updated
}

worker.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([cacheAppShell(), updateDataPackage()]).then(() =>
      worker.skipWaiting(),
    ),
  )
})

worker.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const activeDataCacheName = await readActiveDataCacheName(
        cacheStorage,
        metadataCacheName,
        dataPointerUrl,
      )
      const names = await cacheStorage.keys()
      await Promise.all(
        names
          .filter(
            (name) => name.startsWith('tripwise-app-') && name !== appCacheName,
          )
          .map((name) => cacheStorage.delete(name)),
      )
      await removeStaleDataCaches(cacheStorage, activeDataCacheName)
      await worker.clients.claim()
    })(),
  )
})

worker.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || !isSameOrigin(event.request)) return
  if (isVersionRequest(event.request)) {
    event.respondWith(fetch(event.request))
    return
  }
  event.respondWith(
    isDataRequest(event.request)
      ? cacheFirstDataRequest(event.request, event)
      : cacheFirstAppRequest(event.request),
  )
})
