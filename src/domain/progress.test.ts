import { beforeEach, describe, expect, it } from 'vitest'
import { readProgress, resetItineraryProgress, setItemStatus } from './progress'

describe('local progress', () => {
  beforeEach(() => localStorage.clear())
  it('sets and removes only a stable item status', () => {
    const initial = {}
    const done = setItemStatus(initial, 'trip', '2026-08-27', 'item', 'done')
    expect(done.trip['2026-08-27'].item).toBe('done')
    const skipped = setItemStatus(
      done,
      'trip',
      '2026-08-27',
      'other',
      'skipped',
    )
    expect(skipped.trip['2026-08-27'].other).toBe('skipped')
    const undone = setItemStatus(skipped, 'trip', '2026-08-27', 'item')
    expect(undone.trip['2026-08-27'].item).toBeUndefined()
  })

  it('ignores invalid local statuses', () => {
    localStorage.setItem(
      'tripwise.progress',
      JSON.stringify({ trip: { day: { item: 'complete', other: 'done' } } }),
    )
    expect(readProgress()).toEqual({ trip: { day: { other: 'done' } } })
  })
  it('resets one itinerary without touching another', () => {
    const store = {
      trip: { day: { item: 'done' as const } },
      other: { day: { item: 'skipped' as const } },
    }
    expect(resetItineraryProgress(store, 'trip')).toEqual({
      other: store.other,
    })
  })
})
