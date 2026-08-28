import fs from 'node:fs'
import path from 'node:path'

import { itinerarySchema, citySchema, manifestSchema } from '../src/data/schema'

const DATA_DIR = path.resolve('src/data')
const MANIFEST_FILE = path.join(DATA_DIR, 'manifest.json')

type ManifestItinerary = {
  id: string
  file: string
  name?: string
}

type Manifest = {
  itineraries: ManifestItinerary[]
  cities: string[]
}

function readJson(filePath: string): unknown {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`)
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch (error) {
    throw new Error(
      `Invalid JSON in ${path.basename(filePath)}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    )
  }
}

function formatZodError(error: unknown): string[] {
  if (
    error &&
    typeof error === 'object' &&
    'issues' in error &&
    Array.isArray(error.issues)
  ) {
    return error.issues.map((issue) => {
      const issuePath =
        Array.isArray(issue.path) && issue.path.length
          ? issue.path.join('.')
          : '<root>'

      return `${issuePath}: ${issue.message}`
    })
  }

  return [error instanceof Error ? error.message : String(error)]
}

function validateFile(
  filePath: string,
  schema: { parse: (value: unknown) => unknown },
): boolean {
  const relativePath = path.relative(process.cwd(), filePath)

  try {
    const data = readJson(filePath)
    schema.parse(data)

    console.log(`✅ ${relativePath}`)
    return true
  } catch (error) {
    console.error(`\n❌ ${relativePath}`)

    for (const message of formatZodError(error)) {
      console.error(`   ${message}`)
    }

    return false
  }
}

function resolveDataFile(file: string): string {
  return path.resolve(DATA_DIR, file)
}

console.log('Tripwise DATA Zod validation')
console.log('============================\n')

let hasErrors = false

//
// 1. Validate manifest
//

let manifest: Manifest

try {
  const rawManifest = readJson(MANIFEST_FILE)

  manifest = manifestSchema.parse(rawManifest) as Manifest

  console.log('✅ src/data/manifest.json')
} catch (error) {
  hasErrors = true

  console.error('❌ src/data/manifest.json')

  for (const message of formatZodError(error)) {
    console.error(`   ${message}`)
  }

  console.error('\nCannot discover the DATA files from an invalid manifest.')

  process.exit(1)
}

//
// 2. Validate every itinerary declared by manifest
//

console.log('\nItineraries:')

for (const itinerary of manifest.itineraries) {
  const filePath = resolveDataFile(itinerary.file)

  if (!validateFile(filePath, itinerarySchema)) {
    hasErrors = true
  }
}

//
// 3. Validate every city declared by manifest
//

console.log('\nCities:')

for (const cityFile of manifest.cities) {
  const filePath = resolveDataFile(cityFile)

  if (!validateFile(filePath, citySchema)) {
    hasErrors = true
  }
}

//
// 4. Final result
//

console.log('\n============================')

if (hasErrors) {
  console.error('❌ DATA validation FAILED.')
  process.exit(1)
}

console.log(
  `Validated ${manifest.itineraries.length} itinerary(s) and ` +
    `${manifest.cities.length} city file(s).`,
)

console.log('✅ DATA validation PASSED.')
process.exit(0)
