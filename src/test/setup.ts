import '@testing-library/jest-dom/vitest'
import manifest from '../../data/manifest.json'
import { createRuntimeData, initializeRuntimeData } from '../data'

const dataFiles = Object.fromEntries(
  Object.entries(
    import.meta.glob('../../data/{itineraries,cities}/*.json', {
      eager: true,
      import: 'default',
    }),
  ).map(([file, value]) => [
    `./${file.replace(/^..\/..\/data\//, '').replace(/\\/g, '/')}`,
    value,
  ]),
)

initializeRuntimeData(createRuntimeData(manifest, dataFiles))
