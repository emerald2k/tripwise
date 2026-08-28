import '@testing-library/jest-dom/vitest'
import manifest from '../../data/manifest.json'
import montreal from '../../data/cities/montreal.json'
import quebecCity from '../../data/cities/quebec-city.json'
import canada2026 from '../../data/itineraries/canada-2026.json'
import { createRuntimeData, initializeRuntimeData } from '../data'

initializeRuntimeData(
  createRuntimeData(manifest, {
    './cities/montreal.json': montreal,
    './cities/quebec-city.json': quebecCity,
    './itineraries/canada-2026.json': canada2026,
  }),
)
