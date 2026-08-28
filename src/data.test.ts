import { describe, expect, it, vi } from 'vitest'
import manifest from '../data/manifest.json'
import montreal from '../data/cities/montreal.json'
import quebecCity from '../data/cities/quebec-city.json'
import canada2026 from '../data/itineraries/canada-2026.json'
import { createRuntimeData, fetchRuntimeData } from './data'

const authoredFiles = {
  './cities/montreal.json': montreal,
  './cities/quebec-city.json': quebecCity,
  './itineraries/canada-2026.json': canada2026,
}

function runtimeFetcher(resources: Record<string, unknown>) {
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
  }) as unknown as typeof fetch
}

describe('runtime DATA delivery', () => {
  it('loads the authored package from independently requestable DATA resources', async () => {
    const fetcher = runtimeFetcher({
      '/data/manifest.json': manifest,
      '/data/cities/montreal.json': montreal,
      '/data/cities/quebec-city.json': quebecCity,
      '/data/itineraries/canada-2026.json': canada2026,
    })

    const data = await fetchRuntimeData(fetcher)

    expect(data.datasets.itineraries).toEqual([canada2026])
    expect(data.datasets.cities).toEqual([montreal, quebecCity])
    expect(data.locations.get('montreal-old-port-montr-al')?.name).toBe(
      'Old Port Montréal',
    )
    expect(fetcher).toHaveBeenCalledWith('/data/manifest.json')
    expect(fetcher).toHaveBeenCalledWith('/data/cities/montreal.json')
    expect(fetcher).toHaveBeenCalledWith('/data/itineraries/canada-2026.json')
  })

  it('uses canonical package validation to reject a missing referenced file', () => {
    expect(() =>
      createRuntimeData(manifest, {
        './cities/montreal.json': montreal,
        './itineraries/canada-2026.json': canada2026,
      }),
    ).toThrow('Missing referenced DATA file')
  })

  it('uses canonical package validation to reject invalid cross-references', () => {
    const invalidItinerary = structuredClone(canada2026) as {
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
        './itineraries/canada-2026.json': invalidItinerary,
      }),
    ).toThrow('Unknown location')
  })
})
