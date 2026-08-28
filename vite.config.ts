import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
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

function runtimeData(): Plugin {
  const dataDirectory = fileURLToPath(new URL('./data', import.meta.url))
  const manifest = JSON.parse(
    readFileSync(join(dataDirectory, 'manifest.json'), 'utf8'),
  ) as {
    itineraries: { file: string }[]
    cities: string[]
  }
  const files = [
    'manifest.json',
    ...manifest.itineraries.map((entry) => entry.file.replace(/^\.\//, '')),
    ...manifest.cities.map((file) => file.replace(/^\.\//, '')),
  ]

  return {
    name: 'runtime-data',
    configureServer(server) {
      server.middlewares.use('/data', (request, response, next) => {
        const path = new URL(request.url ?? '/', 'http://localhost').pathname
        const file = path.replace(/^\//, '')
        if (!files.includes(file)) return next()
        response.setHeader('Content-Type', 'application/json')
        response.end(readFileSync(join(dataDirectory, file)))
      })
    },
    generateBundle() {
      for (const file of files) {
        this.emitFile({
          type: 'asset',
          fileName: `data/${file}`,
          source: readFileSync(join(dataDirectory, file)),
        })
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), webManifest(), runtimeData()],
})
