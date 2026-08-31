import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  checkPwaVersion,
  isValidVersion,
  startPwaVersionSync,
  type PwaVersionSyncOptions,
} from './pwa-version-sync'

function options(overrides: Partial<PwaVersionSyncOptions> = {}) {
  const update = vi.fn().mockResolvedValue(undefined)
  return {
    installedVersion: '0.8.2',
    isOnline: () => true,
    fetcher: vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ version: '0.9.0' }), { status: 200 }),
      ),
    serviceWorker: {
      ready: Promise.resolve({ update }),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    },
    onUpdating: vi.fn(),
    onUpToDate: vi.fn(),
    reload: vi.fn(),
    ...overrides,
  }
}

describe('PWA version synchronization', () => {
  afterEach(() => vi.restoreAllMocks())

  it('does nothing when the remote version matches the installed version', async () => {
    const config = options({
      fetcher: vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ version: '0.8.2' }), { status: 200 }),
        ),
    })

    await expect(checkPwaVersion(config)).resolves.toBe(false)
    expect(config.onUpdating).not.toHaveBeenCalled()
    expect(config.onUpToDate).toHaveBeenCalledOnce()
  })

  it.each(['0.9.0', '0.8.1'])(
    'updates when the differing deployed version is %s',
    async (remoteVersion) => {
      const config = options({
        fetcher: vi.fn().mockResolvedValue(
          new Response(JSON.stringify({ version: remoteVersion }), {
            status: 200,
          }),
        ),
      })

      await expect(checkPwaVersion(config)).resolves.toBe(true)
      expect(config.onUpdating).toHaveBeenCalledWith(remoteVersion)
      const registration = await config.serviceWorker.ready
      expect(registration.update).toHaveBeenCalledOnce()
    },
  )

  it('ignores an invalid version and failed requests', async () => {
    const invalid = options({
      fetcher: vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ version: 'latest' }), { status: 200 }),
        ),
    })
    const failed = options({ fetcher: vi.fn().mockRejectedValue(new Error()) })

    await expect(checkPwaVersion(invalid)).resolves.toBe(false)
    await expect(checkPwaVersion(failed)).resolves.toBe(false)
    expect(invalid.onUpdating).not.toHaveBeenCalled()
    expect(failed.onUpdating).not.toHaveBeenCalled()
  })

  it('does not request a version while offline and checks when online returns', async () => {
    const config = options({ isOnline: () => false })
    const stop = startPwaVersionSync(config)
    expect(config.fetcher).not.toHaveBeenCalled()

    config.isOnline = () => true
    window.dispatchEvent(new Event('online'))
    await vi.waitFor(() => expect(config.fetcher).toHaveBeenCalledOnce())
    stop()
  })

  it('leaves persisted progress untouched while updating', async () => {
    localStorage.setItem(
      'tripwise-progress',
      JSON.stringify({ done: ['item'] }),
    )
    const config = options()

    await checkPwaVersion(config)

    expect(localStorage.getItem('tripwise-progress')).toBe(
      JSON.stringify({ done: ['item'] }),
    )
  })

  it('validates strict release versions', () => {
    expect(isValidVersion('0.9.0')).toBe(true)
    expect(isValidVersion('v0.9.0')).toBe(false)
    expect(isValidVersion('0.9')).toBe(false)
  })
})
