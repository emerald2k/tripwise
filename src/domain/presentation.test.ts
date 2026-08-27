import { describe, expect, it } from 'vitest'
import { isCompactStatus } from './presentation'

describe('timeline presentation', () => {
  it('keeps pending items in the normal presentation', () => {
    expect(isCompactStatus(undefined)).toBe(false)
  })

  it.each(['done', 'skipped'] as const)(
    'uses compact presentation for %s items',
    (status) => {
      expect(isCompactStatus(status)).toBe(true)
    },
  )
})
