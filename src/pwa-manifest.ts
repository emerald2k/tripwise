import { brand } from './brand'

export const pwaManifest = {
  name: brand.name,
  short_name: brand.name,
  start_url: '/',
  display: 'standalone',
  theme_color: '#101318',
  background_color: '#101318',
  icons: [
    {
      src: '/icon.svg',
      sizes: '192x192',
      type: 'image/svg+xml',
      purpose: 'any maskable',
    },
  ],
} as const
