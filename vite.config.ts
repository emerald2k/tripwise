import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { pwaManifest } from './src/pwa-manifest'

function webManifest(): Plugin {
  const source = `${JSON.stringify(pwaManifest, null, 2)}\n`

  return {
    name: 'web-manifest',
    configureServer(server) {
      server.middlewares.use('/manifest.webmanifest', (_request, response) => {
        response.setHeader('Content-Type', 'application/manifest+json')
        response.end(source)
      })
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'manifest.webmanifest',
        source,
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), webManifest()],
})
