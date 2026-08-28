import { describe, expect, it, vi } from 'vitest'
import manifest from '../data/manifest.json'
import {
  createRuntimeData,
  fetchRuntimeData,
  resolveActiveItinerary,
  type JsonFetcher,
} from './data'
import type { Itinerary } from './data/schema'

const authoredFiles = Object.fromEntries(
  Object.entries(
    import.meta.glob('../data/{itineraries,cities}/*.json', {
      eager: true,
      import: 'default',
    }),
  ).map(([file, value]) => [
    `./${file.replace(/^..\/data\//, '').replace(/\\/g, '/')}`,
    value,
  ]),
)

function runtimeFetcher(resources: Record<string, unknown>): JsonFetcher {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = input.toString()
    const resource = resources[url]
    return new Response(
      resource === undefined ? undefined : JSON.stringify(resource),
      {
        status: resource === undefined ? 404 : 200,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  })
}

describe('runtime DATA delivery', () => {
  it('resolves empty, single, multiple, valid, and stale manifest selections generically', () => {
    const alpha: Itinerary = {
      id: 'alpha',
      name: 'Alpha',
      days: [
        {
          date: '2026-01-01',
          items: [
            {
              itemId: 'alpha-item',
              startTime: '09:00',
              title: 'Alpha item',
              transport: { mode: 'walk' },
            },
          ],
        },
      ],
    }
    const beta: Itinerary = { ...alpha, id: 'beta', name: 'Beta' }

    expect(resolveActiveItinerary([], null)).toBeUndefined()
    expect(resolveActiveItinerary([alpha], null)).toBe(alpha)
    expect(resolveActiveItinerary([alpha], 'stale')).toBe(alpha)
    expect(resolveActiveItinerary([alpha, beta], null)).toBeUndefined()
    expect(resolveActiveItinerary([alpha, beta], 'beta')).toBe(beta)
    expect(resolveActiveItinerary([alpha, beta], 'stale')).toBeUndefined()
  })

  it('loads the authored package from independently requestable DATA resources', async () => {
    const fetcher = runtimeFetcher(
      Object.fromEntries([
        ['/data/manifest.json', manifest],
        ...Object.entries(authoredFiles).map(([path, value]) => [
          `/data/${path.replace(/^\.\//, '')}`,
          value,
        ]),
      ]),
    )

    const data = await fetchRuntimeData(fetcher)

    expect(data.datasets.itineraries.map((itinerary) => itinerary.id)).toEqual(
      manifest.itineraries.map((itinerary) => itinerary.id),
    )
    expect(data.datasets.cities).toHaveLength(manifest.cities.length)
    for (const entry of manifest.itineraries)
      expect(data.itineraries.get(entry.id)).toBeDefined()
    expect(fetcher).toHaveBeenCalledWith('/data/manifest.json')
    for (const path of [
      ...manifest.itineraries.map((entry) => entry.file),
      ...manifest.cities,
    ])
      expect(fetcher).toHaveBeenCalledWith(`/data/${path.replace(/^\.\//, '')}`)
  })

  it('uses canonical package validation to reject a missing referenced file', () => {
    const missingFile = manifest.cities[0]
    const files = { ...authoredFiles }
    delete files[missingFile]

    expect(() => createRuntimeData(manifest, files)).toThrow(
      'Missing referenced DATA file',
    )
  })

  it('uses canonical package validation to reject invalid cross-references', () => {
    const itineraryFile = manifest.itineraries[0].file
    const invalidItinerary = structuredClone(authoredFiles[itineraryFile]) as {
      days: { items: Array<Record<string, unknown>> }[]
    }
    const locationItem = invalidItinerary.days
      .flatMap((day) => day.items)
      .find((item) => 'locationId' in item)
    if (locationItem === undefined) throw new Error('Expected a location item')
    locationItem.locationId = 'not-a-location'

    expect(() =>
      createRuntimeData(manifest, {
        ...authoredFiles,
        [itineraryFile]: invalidItinerary,
      }),
    ).toThrow('Unknown location')
  })
})
