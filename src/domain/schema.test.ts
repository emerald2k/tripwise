import { describe, expect, it } from 'vitest'
import {
  citySchema,
  itemSchema,
  itinerarySchema,
  manifestSchema,
  type Day,
} from '../data/schema'
import { localDate } from './date'
import { currentItem, dayProgress, sortItems } from './itinerary'
import { validateDataPackage, validateItineraryData } from './validation'

const day: Day = {
  date: '2026-08-27',
  items: [
    {
      itemId: 'first',
      title: 'First',
      startTime: '08:00',
      locationId: 'location',
      progress: true,
    },
    {
      itemId: 'second',
      title: 'Second',
      startTime: '12:00',
      locationId: 'location',
      progress: true,
    },
    {
      itemId: 'later',
      title: 'Later',
      startTime: '20:00',
      locationId: 'location',
    },
  ],
}

describe('itinerary domain rules', () => {
  it('discriminates location and transport items using canonical fields', () => {
    expect(
      itemSchema.parse({
        itemId: 'location',
        title: 'Place',
        startTime: '10:00',
        locationId: 'place',
      }),
    ).toHaveProperty('locationId')
    expect(
      itemSchema.parse({
        itemId: 'ride',
        title: 'Walk',
        startTime: '10:30',
        transport: { mode: 'walk' },
      }),
    ).toHaveProperty('transport')
    expect(() =>
      itemSchema.parse({
        itemId: 'invalid',
        title: 'Invalid',
        startTime: '10:00',
      }),
    ).toThrow()
    expect(() =>
      itinerarySchema.parse({
        id: 'trip',
        name: 'Trip',
        days: [
          { ...day, items: [{ ...day.items[0], transport: { mode: 'walk' } }] },
        ],
      }),
    ).toThrow()
  })

  it('rejects invalid item fields and values', () => {
    expect(() =>
      itemSchema.parse({
        itemId: 'location',
        title: 'Place',
        startTime: '10:00',
        locationId: 'place',
        unknown: true,
      }),
    ).toThrow()
    expect(() =>
      itemSchema.parse({
        itemId: 'ride',
        title: 'Walk',
        startTime: '10:30',
        transport: { mode: 'walking' },
      }),
    ).toThrow()
    expect(() =>
      itemSchema.parse({
        itemId: 'ride',
        title: 'Walk',
        startTime: '10:30',
        transport: { mode: 'walk' },
        progress: true,
      }),
    ).toThrow()
    expect(() =>
      itemSchema.parse({
        itemId: 'ride',
        title: 'Walk',
        startTime: '10:30',
        transport: { mode: 'walk', durationMinutes: 0 },
      }),
    ).toThrow()
    expect(() =>
      itemSchema.parse({
        itemId: 'location',
        title: 'Place',
        startTime: '25:00',
        locationId: 'place',
      }),
    ).toThrow()
    expect(() =>
      itemSchema.parse({
        itemId: 'location',
        title: 'Place',
        startTime: '10:00',
        locationId: 'place',
        durationMinutes: 1.5,
      }),
    ).toThrow()
    expect(() =>
      citySchema.parse({
        cityId: 'city',
        name: 'City',
        locations: [{ locationId: 'place', name: 'Place', category: 'visit' }],
      }),
    ).toThrow()
  })

  it('sorts items by start time without mutating the source', () => {
    const items = [day.items[1], day.items[0]]
    expect(sortItems(items).map((item) => item.itemId)).toEqual([
      'first',
      'second',
    ])
    expect(items.map((item) => item.itemId)).toEqual(['second', 'first'])
  })

  it('resolves the latest eligible, incomplete item only for today', () => {
    const now = new Date(2026, 7, 27, 13, 0)
    expect(currentItem(day, {}, now)?.itemId).toBe('second')
    expect(currentItem(day, { second: 'done' }, now)?.itemId).toBe('first')
    expect(currentItem(day, {}, new Date(2026, 7, 28, 13, 0))).toBeNull()
  })

  it('classifies day progress without fabricating past item statuses', () => {
    expect(dayProgress({ ...day, date: '2026-08-26' }, {}, '2026-08-27')).toBe(
      'complete',
    )
    expect(dayProgress(day, {}, '2026-08-27')).toBe('none')
    expect(dayProgress(day, { first: 'skipped' }, '2026-08-27')).toBe('partial')
    expect(
      dayProgress(day, { first: 'done', second: 'done' }, '2026-08-27'),
    ).toBe('complete')
  })

  it('uses the device local date', () => {
    expect(localDate(new Date(2026, 0, 2, 23, 59))).toBe('2026-01-02')
  })

  it('rejects unknown location references and legacy fields', () => {
    expect(() =>
      validateItineraryData(
        {
          id: 'trip',
          name: 'Trip',
          days: [
            {
              date: '2026-08-27',
              items: [
                {
                  itemId: 'item',
                  title: 'Place',
                  startTime: '10:00',
                  locationId: 'missing',
                },
              ],
            },
          ],
        },
        [],
      ),
    ).toThrow(/Unknown location/)
    expect(() =>
      itinerarySchema.parse({
        id: 'trip',
        name: 'Trip',
        startDate: '2026-08-27',
        endDate: '2026-08-27',
        days: [day],
      }),
    ).toThrow()
    expect(() =>
      validateItineraryData(
        {
          id: 'trip',
          name: 'Trip',
          days: [
            {
              date: '2026-02-31',
              items: [
                {
                  itemId: 'item',
                  title: 'Place',
                  startTime: '10:00',
                  locationId: 'location',
                },
              ],
            },
          ],
        },
        [
          {
            cityId: 'city',
            name: 'City',
            locations: [
              { locationId: 'location', name: 'Place', category: 'other' },
            ],
          },
        ],
      ),
    ).toThrow(/Invalid day date/)
  })

  it('rejects duplicate item and location IDs', () => {
    const city = {
      cityId: 'city',
      name: 'City',
      locations: [
        { locationId: 'location', name: 'Place', category: 'other' as const },
      ],
    }
    expect(() =>
      validateItineraryData(
        {
          id: 'trip',
          name: 'Trip',
          days: [
            {
              date: '2026-08-27',
              items: [
                {
                  itemId: 'same',
                  title: 'First',
                  startTime: '10:00',
                  locationId: 'location',
                },
                {
                  itemId: 'same',
                  title: 'Second',
                  startTime: '11:00',
                  locationId: 'location',
                },
              ],
            },
          ],
        },
        [city],
      ),
    ).toThrow(/Duplicate itemId/)
    expect(() =>
      validateItineraryData(
        {
          id: 'trip',
          name: 'Trip',
          days: [
            {
              date: '2026-08-27',
              items: [
                {
                  itemId: 'item',
                  title: 'Place',
                  startTime: '10:00',
                  locationId: 'location',
                },
              ],
            },
          ],
        },
        [city, { ...city, cityId: 'other-city' }],
      ),
    ).toThrow(/Duplicate locationId/)
  })

  it('validates manifest references and file consistency', () => {
    const manifest = {
      itineraries: [
        { id: 'trip', file: './itineraries/trip.json', name: 'Trip' },
      ],
      cities: ['./cities/city.json'],
    }
    const itinerary = { id: 'trip', name: 'Trip', days: [day] }
    const city = {
      cityId: 'city',
      name: 'City',
      locations: [
        { locationId: 'location', name: 'Place', category: 'other' as const },
      ],
    }
    expect(manifestSchema.parse(manifest)).toEqual(manifest)
    expect(
      validateDataPackage(manifest, {
        './itineraries/trip.json': itinerary,
        './cities/city.json': city,
      }).itineraries[0].id,
    ).toBe('trip')
    expect(() =>
      validateDataPackage(manifest, { './cities/city.json': city }),
    ).toThrow(/Missing referenced DATA file/)
    expect(() =>
      validateDataPackage(manifest, {
        './itineraries/trip.json': { ...itinerary, id: 'other-trip' },
        './cities/city.json': city,
      }),
    ).toThrow(/Itinerary id does not match manifest/)
  })

  it('allows empty manifest collections', () => {
    expect(manifestSchema.parse({ itineraries: [], cities: [] })).toEqual({
      itineraries: [],
      cities: [],
    })
  })

  it('rejects invalid manifest itinerary entries', () => {
    expect(() =>
      manifestSchema.parse({
        itineraries: [
          { id: '', file: './itineraries/trip.json', name: 'Trip' },
        ],
        cities: [],
      }),
    ).toThrow()
  })

  it('rejects invalid manifest city entries', () => {
    expect(() =>
      manifestSchema.parse({ itineraries: [], cities: [''] }),
    ).toThrow()
  })
})
