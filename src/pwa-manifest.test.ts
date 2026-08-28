import { describe, expect, it } from 'vitest'
import { brand } from './brand'
import { pwaManifest } from './pwa-manifest'

describe('PWA manifest', () => {
  it('uses the configured customer-facing brand name', () => {
    expect(pwaManifest.name).toBe(brand.name)
    expect(pwaManifest.short_name).toBe(brand.name)
    expect(pwaManifest.name).not.toBe('Tripwise')
  })

  it('retains the canonical application icon', () => {
    expect(pwaManifest.icons).toEqual([
      {
        src: '/icon.svg',
        sizes: '192x192',
        type: 'image/svg+xml',
        purpose: 'any maskable',
      },
    ])
  })
})
