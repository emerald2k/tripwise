import {
  citySchema,
  itinerarySchema,
  manifestSchema,
  type City,
  type Itinerary,
} from '../data/schema'

type DataFiles = Record<string, unknown>

function validDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`)
  return (
    !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value
  )
}

function normalizedFile(value: string) {
  return value.replace(/\\/g, '/').replace(/^\.?\/?/, './')
}

function fileValue(files: DataFiles, path: string) {
  const key = Object.keys(files).find(
    (candidate) => normalizedFile(candidate) === path,
  )
  return key === undefined ? undefined : files[key]
}

function assertPackagePath(value: string, kind: 'itinerary' | 'city') {
  const normalized = normalizedFile(value)
  const prefix = kind === 'itinerary' ? './itineraries/' : './cities/'
  if (
    normalized !== value ||
    !normalized.startsWith(prefix) ||
    !normalized.endsWith('.json') ||
    normalized.includes('/../') ||
    normalized.includes('//')
  ) {
    throw new Error(`Invalid ${kind} file path: ${value}`)
  }
  return normalized
}

function validateItinerary(
  itineraryInput: unknown,
  locationIds: Set<string>,
  itemIds: Set<string>,
) {
  const itinerary = itinerarySchema.parse(itineraryInput)
  const dayDates = new Set<string>()
  let previousDay = ''
  for (const day of itinerary.days) {
    if (!validDate(day.date)) throw new Error(`Invalid day date: ${day.date}`)
    if (dayDates.has(day.date))
      throw new Error(`Duplicate day date: ${day.date}`)
    if (day.date < previousDay)
      throw new Error(`Days on ${itinerary.id} are not chronological`)
    dayDates.add(day.date)
    previousDay = day.date
    let previousTime = ''
    for (const item of day.items) {
      if (itemIds.has(item.itemId))
        throw new Error(`Duplicate itemId: ${item.itemId}`)
      itemIds.add(item.itemId)
      if (item.startTime < previousTime)
        throw new Error(`Items on ${day.date} are not chronological`)
      previousTime = item.startTime
      if ('locationId' in item && !locationIds.has(item.locationId)) {
        throw new Error(`Unknown location: ${item.locationId}`)
      }
    }
  }
  return itinerary
}

export function validateItineraryData(
  itineraryInput: unknown,
  citiesInput: unknown[],
) {
  const cities = citiesInput.map((city) => citySchema.parse(city))
  const knownCityIds = new Set<string>()
  const locationIds = new Set<string>()
  for (const city of cities) {
    if (knownCityIds.has(city.cityId))
      throw new Error(`Duplicate cityId: ${city.cityId}`)
    knownCityIds.add(city.cityId)
    for (const location of city.locations) {
      if (locationIds.has(location.locationId))
        throw new Error(`Duplicate locationId: ${location.locationId}`)
      locationIds.add(location.locationId)
    }
  }
  const itinerary = validateItinerary(
    itineraryInput,
    locationIds,
    new Set<string>(),
  )
  return { itinerary, cities }
}

export function validateDataPackage(manifestInput: unknown, files: DataFiles) {
  const manifest = manifestSchema.parse(manifestInput)
  const expected = new Set<string>()
  const itineraryIds = new Set<string>()
  const itineraryFiles = new Set<string>()
  for (const entry of manifest.itineraries) {
    const file = assertPackagePath(entry.file, 'itinerary')
    if (itineraryIds.has(entry.id))
      throw new Error(`Duplicate itinerary id: ${entry.id}`)
    if (itineraryFiles.has(file))
      throw new Error(`Duplicate itinerary file: ${file}`)
    itineraryIds.add(entry.id)
    itineraryFiles.add(file)
    expected.add(file)
  }
  const cityFiles = new Set<string>()
  for (const fileInput of manifest.cities) {
    const file = assertPackagePath(fileInput, 'city')
    if (cityFiles.has(file)) throw new Error(`Duplicate city file: ${file}`)
    cityFiles.add(file)
    expected.add(file)
  }
  const available = new Set(Object.keys(files).map(normalizedFile))
  for (const file of expected)
    if (!available.has(file))
      throw new Error(`Missing referenced DATA file: ${file}`)
  for (const file of available)
    if (!expected.has(file)) throw new Error(`Unreferenced DATA file: ${file}`)

  const cities: City[] = []
  const knownCityIds = new Set<string>()
  const locationIds = new Set<string>()
  for (const file of cityFiles) {
    const city = citySchema.parse(fileValue(files, file))
    if (knownCityIds.has(city.cityId))
      throw new Error(`Duplicate cityId: ${city.cityId}`)
    knownCityIds.add(city.cityId)
    for (const location of city.locations) {
      if (locationIds.has(location.locationId))
        throw new Error(`Duplicate locationId: ${location.locationId}`)
      locationIds.add(location.locationId)
    }
    cities.push(city)
  }

  const itineraries: Itinerary[] = []
  for (const entry of manifest.itineraries) {
    const file = normalizedFile(entry.file)
    const itinerary = validateItinerary(
      fileValue(files, file),
      locationIds,
      new Set<string>(),
    )
    if (itinerary.id !== entry.id)
      throw new Error(`Itinerary id does not match manifest: ${file}`)
    if (itinerary.name !== entry.name)
      throw new Error(`Itinerary name does not match manifest: ${file}`)
    itineraries.push(itinerary)
  }
  return { manifest, itineraries, cities }
}
