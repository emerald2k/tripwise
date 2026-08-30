import { describe, expect, it } from 'vitest'
import { extractItineraryDayNumber } from './itinerary'

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
