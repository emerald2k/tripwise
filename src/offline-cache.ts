import { fetchRuntimeData, type JsonFetcher } from './data'

export interface DataCache {
  put(request: RequestInfo | URL, response: Response): Promise<void>
  match(request: RequestInfo | URL): Promise<Response | undefined>
}

export interface DataCacheStorage {
  open(name: string): Promise<DataCache>
  delete(name: string): Promise<boolean>
  keys(): Promise<string[]>
}

export const dataCachePrefix = 'tripwise-data-'

export async function cacheValidatedDataPackage(
  cacheStorage: DataCacheStorage,
  fetcher: JsonFetcher,
  origin: string,
  cacheName: string,
) {
  const responses = new Map<string, Response>()
  await fetchRuntimeData(async (input, init) => {
    const url = new URL(input.toString(), origin).toString()
    const response = await fetcher(url, init)
    if (response.ok) responses.set(url, response.clone())
    return response
  })

  const cache = await cacheStorage.open(cacheName)
  await Promise.all(
    [...responses].map(([url, response]) => cache.put(url, response)),
  )
}

export async function readActiveDataCacheName(
  cacheStorage: DataCacheStorage,
  metadataCacheName: string,
  pointerUrl: string,
) {
  const metadata = await cacheStorage.open(metadataCacheName)
  const pointer = await metadata.match(pointerUrl)
  if (pointer === undefined) return undefined
  const { cacheName } = (await pointer.json()) as { cacheName?: unknown }
  return typeof cacheName === 'string' ? cacheName : undefined
}

export async function setActiveDataCacheName(
  cacheStorage: DataCacheStorage,
  metadataCacheName: string,
  pointerUrl: string,
  cacheName: string,
) {
  const metadata = await cacheStorage.open(metadataCacheName)
  await metadata.put(
    pointerUrl,
    new Response(JSON.stringify({ cacheName }), {
      headers: { 'Content-Type': 'application/json' },
    }),
  )
}

export async function removeStaleDataCaches(
  cacheStorage: DataCacheStorage,
  activeCacheName: string | undefined,
) {
  const names = await cacheStorage.keys()
  await Promise.all(
    names
      .filter(
        (name) =>
          name.startsWith(dataCachePrefix) &&
          !name.startsWith('tripwise-data-meta') &&
          name !== activeCacheName,
      )
      .map((name) => cacheStorage.delete(name)),
  )
}
