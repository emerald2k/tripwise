import { describe, expect, it, vi } from 'vitest'
import manifest from '../data/manifest.json'
import montreal from '../data/cities/montreal.json'
import quebecCity from '../data/cities/quebec-city.json'
import canada2026 from '../data/itineraries/canada-2026.json'
import {
  cacheValidatedDataPackage,
  dataCachePrefix,
  readActiveDataCacheName,
  removeStaleDataCaches,
  setActiveDataCacheName,
  type DataCache,
  type DataCacheStorage,
} from './offline-cache'

class MemoryCache implements DataCache {
  readonly entries = new Map<string, Response>()

  async put(request: RequestInfo | URL, response: Response) {
    this.entries.set(request.toString(), response.clone())
  }

  async match(request: RequestInfo | URL) {
    return this.entries.get(request.toString())?.clone()
  }
}

class MemoryCacheStorage implements DataCacheStorage {
  readonly caches = new Map<string, MemoryCache>()

  async open(name: string) {
    let cache = this.caches.get(name)
    if (cache === undefined) {
      cache = new MemoryCache()
      this.caches.set(name, cache)
    }
    return cache
  }

  async delete(name: string) {
    return this.caches.delete(name)
  }

  async keys() {
    return [...this.caches.keys()]
  }
}

function dataFetcher(resources: Record<string, unknown>) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const value = resources[input.toString()]
    return new Response(
      value === undefined ? undefined : JSON.stringify(value),
      {
        status: value === undefined ? 404 : 200,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  })
}

const origin = 'https://tripwise.test'
const resources = {
  [`${origin}/data/manifest.json`]: manifest,
  [`${origin}/data/cities/montreal.json`]: montreal,
  [`${origin}/data/cities/quebec-city.json`]: quebecCity,
  [`${origin}/data/itineraries/canada-2026.json`]: canada2026,
}

describe('offline DATA cache', () => {
  it('stores a complete package only after canonical validation succeeds', async () => {
    const cacheStorage = new MemoryCacheStorage()
    await cacheValidatedDataPackage(
      cacheStorage,
      dataFetcher(resources),
      origin,
      `${dataCachePrefix}candidate`,
    )

    const cache = await cacheStorage.open(`${dataCachePrefix}candidate`)
    expect(await cache.match(`${origin}/data/manifest.json`)).toBeDefined()
    expect(
      await cache.match(`${origin}/data/itineraries/canada-2026.json`),
    ).toBeDefined()
    expect(
      await cache.match(`${origin}/data/cities/montreal.json`),
    ).toBeDefined()
  })

  it('keeps the prior cache when a network package fails validation', async () => {
    const cacheStorage = new MemoryCacheStorage()
    const activeName = `${dataCachePrefix}active`
    const activeCache = await cacheStorage.open(activeName)
    await activeCache.put(
      `${origin}/data/manifest.json`,
      new Response(JSON.stringify(manifest)),
    )
    const invalidItinerary = structuredClone(canada2026) as {
      days: { items: Array<Record<string, unknown>> }[]
    }
    const locationItem = invalidItinerary.days
      .flatMap((day) => day.items)
      .find((item) => 'locationId' in item)
    if (locationItem === undefined) throw new Error('Expected a location item')
    locationItem.locationId = 'unknown-location'

    await expect(
      cacheValidatedDataPackage(
        cacheStorage,
        dataFetcher({
          ...resources,
          [`${origin}/data/itineraries/canada-2026.json`]: invalidItinerary,
        }),
        origin,
        `${dataCachePrefix}candidate`,
      ),
    ).rejects.toThrow('Unknown location')
    expect(
      await activeCache.match(`${origin}/data/manifest.json`),
    ).toBeDefined()
    expect(cacheStorage.caches.has(`${dataCachePrefix}candidate`)).toBe(false)
  })

  it('switches active packages through metadata and removes stale candidates', async () => {
    const cacheStorage = new MemoryCacheStorage()
    const metadata = 'tripwise-data-meta'
    const pointer = `${origin}/__tripwise-data`
    await cacheStorage.open(`${dataCachePrefix}previous`)
    await cacheStorage.open(`${dataCachePrefix}current`)
    await setActiveDataCacheName(
      cacheStorage,
      metadata,
      pointer,
      `${dataCachePrefix}current`,
    )

    expect(await readActiveDataCacheName(cacheStorage, metadata, pointer)).toBe(
      `${dataCachePrefix}current`,
    )
    await removeStaleDataCaches(cacheStorage, `${dataCachePrefix}current`)
    expect(cacheStorage.caches.has(`${dataCachePrefix}previous`)).toBe(false)
    expect(cacheStorage.caches.has(`${dataCachePrefix}current`)).toBe(true)
    expect(await readActiveDataCacheName(cacheStorage, metadata, pointer)).toBe(
      `${dataCachePrefix}current`,
    )
  })
})
