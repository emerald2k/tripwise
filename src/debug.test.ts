import { describe, expect, it } from 'vitest'
import { debugEnabled, diagnosticFor } from './debug'

describe('debug diagnostics', () => {
  const error = new Error('internal DATA URL and validation details')

  it('shows diagnostics only with DEV and VITE_DEBUG=true', () => {
    expect(debugEnabled({ DEV: true, VITE_DEBUG: 'true' })).toBe(true)
    expect(diagnosticFor(error, { DEV: true, VITE_DEBUG: 'true' })).toContain(
      'internal DATA URL',
    )
  })

  it('hides diagnostics without the explicit development flag', () => {
    expect(debugEnabled({ DEV: true, VITE_DEBUG: 'false' })).toBe(false)
    expect(diagnosticFor(error, { DEV: true, VITE_DEBUG: 'false' })).toBe(
      undefined,
    )
  })

  it('hides diagnostics in production regardless of VITE_DEBUG', () => {
    expect(debugEnabled({ DEV: false, VITE_DEBUG: 'true' })).toBe(false)
    expect(diagnosticFor(error, { DEV: false, VITE_DEBUG: 'true' })).toBe(
      undefined,
    )
  })
})
