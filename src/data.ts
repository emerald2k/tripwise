import manifest from '../data/manifest.json'
import { validateDataPackage } from './domain/validation'

const dataFiles = Object.fromEntries(
  Object.entries(
    import.meta.glob('../data/{itineraries,cities}/*.json', {
      eager: true,
      import: 'default',
    }),
  ).map(([file, value]) => [
    `./${file.replace(/^\.\.\/data\//, '').replace(/\\/g, '/')}`,
    value,
  ]),
)

export const datasets = validateDataPackage(manifest, dataFiles)
export const itineraries = new Map(
  datasets.itineraries.map((itinerary) => [itinerary.id, itinerary] as const),
)
export const cities = datasets.cities
export const locations = new Map(
  cities.flatMap((city) =>
    city.locations.map((location) => [location.locationId, location] as const),
  ),
)
export const locationCities = new Map(
  cities.flatMap((city) =>
    city.locations.map((location) => [location.locationId, city.name] as const),
  ),
)

export function readActiveItineraryId() {
  return typeof localStorage === 'undefined'
    ? null
    : localStorage.getItem('tripwise.activeItineraryId')
}

export function persistActiveItineraryId(id: string) {
  localStorage.setItem('tripwise.activeItineraryId', id)
}
