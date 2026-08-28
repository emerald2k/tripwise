import { manifestSchema, type City, type Itinerary } from './data/schema'
import { validateDataPackage } from './domain/validation'

type DataFiles = Record<string, unknown>

export interface RuntimeData {
  datasets: ReturnType<typeof validateDataPackage>
  itineraries: Map<string, Itinerary>
  cities: City[]
  locations: Map<string, City['locations'][number]>
  locationCities: Map<string, string>
}

let runtimeData: RuntimeData | undefined
let loadingRuntimeData: Promise<RuntimeData> | undefined

function dataUrl(path: string) {
  return `/data/${path.replace(/^\.\//, '')}`
}

async function readJson(fetcher: typeof fetch, url: string) {
  const response = await fetcher(url)
  if (!response.ok) throw new Error(`Unable to load DATA resource: ${url}`)
  return response.json()
}

export function createRuntimeData(
  manifest: unknown,
  files: DataFiles,
): RuntimeData {
  const datasets = validateDataPackage(manifest, files)
  const itineraries = new Map(
    datasets.itineraries.map((itinerary) => [itinerary.id, itinerary] as const),
  )
  const cities = datasets.cities
  const locations = new Map(
    cities.flatMap((city) =>
      city.locations.map(
        (location) => [location.locationId, location] as const,
      ),
    ),
  )
  const locationCities = new Map(
    cities.flatMap((city) =>
      city.locations.map(
        (location) => [location.locationId, city.name] as const,
      ),
    ),
  )

  return { datasets, itineraries, cities, locations, locationCities }
}

export async function fetchRuntimeData(
  fetcher: typeof fetch = fetch,
): Promise<RuntimeData> {
  const manifest = await readJson(fetcher, '/data/manifest.json')
  const packageManifest = manifestSchema.parse(manifest)
  const paths = [
    ...packageManifest.itineraries.map((entry) => entry.file),
    ...packageManifest.cities,
  ]
  const values = await Promise.all(
    paths.map(
      async (path) => [path, await readJson(fetcher, dataUrl(path))] as const,
    ),
  )
  return createRuntimeData(manifest, Object.fromEntries(values))
}

export function loadRuntimeData() {
  loadingRuntimeData ??= fetchRuntimeData()
  return loadingRuntimeData
}

export function initializeRuntimeData(data: RuntimeData) {
  runtimeData = data
}

export function getRuntimeData(): RuntimeData {
  if (runtimeData === undefined) {
    throw new Error('Runtime DATA has not been initialized')
  }
  return runtimeData
}

export function readActiveItineraryId() {
  return typeof localStorage === 'undefined'
    ? null
    : localStorage.getItem('tripwise.activeItineraryId')
}

export function persistActiveItineraryId(id: string) {
  localStorage.setItem('tripwise.activeItineraryId', id)
}
