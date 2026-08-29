import { describe, expect, it } from 'vitest'
import { formatDurationMinutes } from './duration'

describe('formatDurationMinutes', () => {
  it.each([
    [0, undefined],
    [1, '1 min'],
    [45, '45 min'],
    [59, '59 min'],
    [60, '1h'],
    [61, '1h 1m'],
    [90, '1h 30m'],
    [119, '1h 59m'],
    [120, '2h'],
    [150, '2h 30m'],
    [245, '4h 5m'],
    [undefined, undefined],
    [-1, undefined],
    [1.5, undefined],
    [Number.NaN, undefined],
  ])('formats %s minutes as %s', (minutes, expected) => {
    expect(formatDurationMinutes(minutes)).toBe(expected)
  })
})
