import { afterEach, describe, expect, it, vi } from 'vitest'
import { registerServiceWorker } from './service-worker-registration'

describe('service worker registration', () => {
  afterEach(() => vi.restoreAllMocks())

  it('does nothing when Service Workers are unavailable', () => {
    expect(() => registerServiceWorker('/sw.js', undefined)).not.toThrow()
  })

  it('contains a rejected registration without surfacing an error', async () => {
    const register = vi.fn().mockRejectedValue(new Error('registration failed'))
    registerServiceWorker('/sw.js', { register })
    window.dispatchEvent(new Event('load'))

    await Promise.resolve()

    expect(register).toHaveBeenCalledWith('/sw.js', {
      scope: '/',
      type: 'module',
    })
  })
})
