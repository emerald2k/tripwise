import { describe, expect, it } from 'vitest'
import {
  citySchema,
  itemSchema,
  itinerarySchema,
  manifestSchema,
  type Day,
} from '../data/schema'
import canadaItinerary from '../../data/itineraries/canada-2026.json'
import { localDate } from './date'
import {
  activeLocationItems,
  currentItem,
  dayProgress,
  nextItem,
  sortItems,
} from './itinerary'
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
const journey = {
  departureDate: '2026-08-27',
  destinationArrivalDate: '2026-08-27',
}

describe('active Location Item intervals', () => {
  const intervalDay = {
    date: '2026-08-27',
    items: [
      {
        itemId: 'location-a',
        title: 'Location A',
        startTime: '08:00',
        locationId: 'a',
        durationMinutes: 30,
      },
      {
        itemId: 'transport',
        title: 'Transfer',
        startTime: '08:30',
        transport: { mode: 'walk' as const },
      },
      {
        itemId: 'location-b',
        title: 'Location B',
        startTime: '10:00',
        locationId: 'b',
      },
      {
        itemId: 'location-c',
        title: 'Location C',
        startTime: '11:00',
        locationId: 'c',
        durationMinutes: 60,
      },
    ],
  } satisfies Day

  const at = (hours: number, minutes: number) =>
    new Date(2026, 7, 27, hours, minutes)

  it('uses the next Location start time before final-duration fallback', () => {
    expect(
      activeLocationItems(intervalDay, at(8, 0)).map((item) => item.itemId),
    ).toEqual(['location-a'])
    expect(
      activeLocationItems(intervalDay, at(9, 29)).map((item) => item.itemId),
    ).toEqual(['location-a'])
    expect(
      activeLocationItems(intervalDay, at(10, 0)).map((item) => item.itemId),
    ).toEqual(['location-b'])
    expect(
      activeLocationItems(intervalDay, at(11, 30)).map((item) => item.itemId),
    ).toEqual(['location-c'])
    expect(activeLocationItems(intervalDay, at(12, 0))).toEqual([])
  })

  it('does not infer an interval for a final Location without a valid duration', () => {
    const withoutFinalDuration = {
      ...intervalDay,
      items: intervalDay.items.slice(0, -1),
    } satisfies Day
    expect(activeLocationItems(withoutFinalDuration, at(11, 30))).toEqual([])
  })
})

const behaviorDay: Day = {
  date: '2026-08-27',
  items: [
    {
      itemId: 'first',
      title: 'First',
      startTime: '10:00',
      locationId: 'location',
      durationMinutes: 60,
      progress: true,
    },
    {
      itemId: 'second',
      title: 'Second',
      startTime: '12:00',
      locationId: 'location',
      durationMinutes: 60,
      progress: true,
    },
    {
      itemId: 'final',
      title: 'Final',
      startTime: '20:00',
      locationId: 'location',
      progress: true,
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
        journey,
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
        transport: {
          mode: 'walk',
          flightStatusUrl: 'https://www.flightradar24.com/data/flights/af636',
        },
      }),
    ).toThrow(/flightStatusUrl is only valid for flight transport/)
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

  it('keeps the Canada flight-status URLs in canonical flight DATA', () => {
    const parsedCanadaItinerary = itinerarySchema.parse(canadaItinerary)
    const statusUrls = parsedCanadaItinerary.days.flatMap((day) =>
      day.items.flatMap((item) =>
        'transport' in item && item.transport.mode === 'flight'
          ? [item.transport.flightStatusUrl]
          : [],
      ),
    )
    expect(statusUrls).toEqual([
      'https://www.flightradar24.com/data/flights/af636',
      'https://www.flightradar24.com/data/flights/af0344',
      'https://www.flightradar24.com/data/flights/kl0672',
      'https://www.flightradar24.com/data/flights/kl1373',
    ])
  })

  it('requires valid chronological journey calendar dates on the first itinerary day', () => {
    const itinerary = {
      id: 'trip',
      name: 'Trip',
      journey,
      days: [day],
    }
    expect(() =>
      validateItineraryData(
        {
          ...itinerary,
          journey: {
            ...journey,
            departureDate: '2026-02-31',
          },
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
    ).toThrow(/Invalid journey departure date/)
    expect(() =>
      validateItineraryData(
        {
          ...itinerary,
          journey: {
            departureDate: '2026-08-28',
            destinationArrivalDate: '2026-08-27',
          },
        },
        [],
      ),
    ).toThrow(/after destination arrival/)
    expect(() =>
      validateItineraryData(
        {
          ...itinerary,
          journey: {
            departureDate: '2026-08-26',
            destinationArrivalDate: '2026-08-27',
          },
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
    ).toThrow(/does not match first itinerary day/)
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

  it('resolves CURRENT and UP NEXT at deterministic time boundaries', () => {
    const beforeFirst = new Date(2026, 7, 27, 9, 59)
    expect(currentItem(behaviorDay, {}, beforeFirst)).toBeNull()
    expect(nextItem(behaviorDay, {}, beforeFirst)?.itemId).toBe('first')

    const firstStart = new Date(2026, 7, 27, 10, 0)
    expect(currentItem(behaviorDay, {}, firstStart)?.itemId).toBe('first')
    expect(nextItem(behaviorDay, {}, firstStart)?.itemId).toBe('second')

    const duringFirst = new Date(2026, 7, 27, 10, 30)
    expect(currentItem(behaviorDay, {}, duringFirst)?.itemId).toBe('first')

    const betweenItems = new Date(2026, 7, 27, 11, 59)
    expect(currentItem(behaviorDay, {}, betweenItems)?.itemId).toBe('first')
    expect(nextItem(behaviorDay, {}, betweenItems)?.itemId).toBe('second')

    const secondStart = new Date(2026, 7, 27, 12, 0)
    expect(currentItem(behaviorDay, {}, secondStart)?.itemId).toBe('second')

    const firstEnd = new Date(2026, 7, 27, 11, 0)
    expect(currentItem(behaviorDay, {}, firstEnd)?.itemId).toBe('first')

    const afterFinal = new Date(2026, 7, 27, 20, 1)
    expect(currentItem(behaviorDay, {}, afterFinal)?.itemId).toBe('final')
    expect(nextItem(behaviorDay, {}, afterFinal)).toBeNull()
  })

  it('excludes manual statuses from CURRENT and UP NEXT and restores them on UNDO', () => {
    const now = new Date(2026, 7, 27, 13, 0)
    expect(currentItem(behaviorDay, { second: 'done' }, now)?.itemId).toBe(
      'first',
    )
    expect(currentItem(behaviorDay, { second: 'skipped' }, now)?.itemId).toBe(
      'first',
    )
    expect(
      nextItem(behaviorDay, { first: 'done', second: 'done' }, now)?.itemId,
    ).toBe('final')
    expect(
      nextItem(behaviorDay, { first: 'skipped', second: 'skipped' }, now)
        ?.itemId,
    ).toBe('final')
    expect(currentItem(behaviorDay, {}, now)?.itemId).toBe('second')
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
    expect(dayProgress(behaviorDay, {}, '2026-08-28')).toBe('complete')
    expect(dayProgress(behaviorDay, {}, '2026-08-26')).toBe('none')
    expect(
      dayProgress(
        { ...behaviorDay, items: [behaviorDay.items[0]] },
        {},
        '2026-08-27',
      ),
    ).toBe('none')
  })

  it('uses the device local date', () => {
    expect(localDate(new Date(2026, 0, 2, 23, 59))).toBe('2026-01-02')
    expect(localDate(new Date(2026, 0, 3, 0, 0))).toBe('2026-01-03')
  })

  it('rejects unknown location references and legacy fields', () => {
    expect(() =>
      validateItineraryData(
        {
          id: 'trip',
          name: 'Trip',
          journey,
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
          journey,
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
          journey,
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
    const itinerary = { id: 'trip', name: 'Trip', journey, days: [day] }
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
