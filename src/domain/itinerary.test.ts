import { describe, expect, it } from 'vitest'
import canadaItinerary from '../../data/itineraries/canada-2026.json'
import halkidikiItinerary from '../../data/itineraries/halkidiki-2026.json'
import {
  deriveItineraryDayNumber,
  deriveItineraryDayMetadata,
  extractItineraryDayNumber,
  getInitialItineraryDayNumber,
} from './itinerary'

describe('extractItineraryDayNumber', () => {
  it.each([
    ['Ziua 0 · București → Halkidiki', 0],
    ['Ziua 1 · Sosire și deconectare la malul mării', 1],
    ['Ziua 2 · ...', 2],
    ['Day 3 · Arrival', 3],
  ])('extracts %i from an explicit itinerary day title', (title, number) => {
    expect(extractItineraryDayNumber(title)).toBe(number)
  })

  it('does not invent a number when the title has no explicit day pattern', () => {
    expect(
      extractItineraryDayNumber('București → Montréal · Prima seară'),
    ).toBe(undefined)
  })

  it('does not derive a number from a calendar date', () => {
    expect(extractItineraryDayNumber('2026-09-05')).toBe(undefined)
  })
})

describe('deriveItineraryDayNumber', () => {
  it('uses the explicit title number, including Day 0', () => {
    const day = { date: '2026-09-05', title: 'Ziua 0 · Plecare' }
    expect(deriveItineraryDayNumber({ days: [day] }, day)).toBe(0)
  })

  it('keeps an explicit title number over the canonical ordinal', () => {
    const day = { date: '2026-09-05', title: 'Day 5 · Arrival' }
    expect(deriveItineraryDayNumber({ days: [day] }, day)).toBe(5)
  })

  it('uses Day 0 only when departure is before destination arrival', () => {
    expect(
      getInitialItineraryDayNumber({
        departureDate: '2026-09-03',
        destinationArrivalDate: '2026-09-04',
      }),
    ).toBe(0)
  })

  it('uses Day 1 when departure and destination arrival share a calendar date', () => {
    expect(
      getInitialItineraryDayNumber({
        departureDate: '2026-09-03',
        destinationArrivalDate: '2026-09-03',
      }),
    ).toBe(1)
  })

  it('increments subsequent transport and arrival days from Day 0', () => {
    const itinerary = {
      journey: {
        departureDate: '2026-09-03',
        destinationArrivalDate: '2026-09-06',
      },
      days: [
        { date: '2026-09-03' },
        { date: '2026-09-04' },
        { date: '2026-09-05' },
        { date: '2026-09-06' },
      ],
    }
    expect(
      itinerary.days.map((day) => deriveItineraryDayNumber(itinerary, day)),
    ).toEqual([0, 1, 2, 3])
  })

  it('derives Canada day numbers from its same-day canonical journey metadata', () => {
    expect(
      canadaItinerary.days.map((day) =>
        deriveItineraryDayNumber(canadaItinerary, day),
      ),
    ).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  })

  it("keeps Halkidiki's explicit numbers authoritative", () => {
    expect(
      halkidikiItinerary.days.map((day) =>
        deriveItineraryDayNumber(halkidikiItinerary, day),
      ),
    ).toEqual([0, 1, 2, 3, 4, 5])
  })

  it('derives the total from canonical days', () => {
    expect(
      deriveItineraryDayMetadata(canadaItinerary, canadaItinerary.days[0]),
    ).toEqual({ currentDayNumber: 1, totalDays: canadaItinerary.days.length })
  })

  it('compares calendar-date strings without timestamp conversion', () => {
    expect(
      getInitialItineraryDayNumber({
        departureDate: '2026-09-03',
        destinationArrivalDate: '2026-09-04',
      }),
    ).toBe(0)
  })

  it('does not invent a number for a day outside the canonical itinerary', () => {
    expect(
      deriveItineraryDayNumber(
        { days: [] },
        { date: '2026-09-05', title: 'Unnumbered day' },
      ),
    ).toBe(undefined)
  })
})
