import { readdir, readFile } from 'node:fs/promises'
import { join, relative, resolve } from 'node:path'
import { validateDataPackage } from '../src/domain/validation'

async function load(name: string) {
  return JSON.parse(await readFile(resolve(process.cwd(), name), 'utf8'))
}

try {
  const root = process.cwd()
  const manifest = await load('data/manifest.json')
  const files: Record<string, unknown> = {}
  for (const directory of ['itineraries', 'cities']) {
    const directoryPath = join(root, 'data', directory)
    const entries = await readdir(directoryPath, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.json')) continue
      const absolute = join(directoryPath, entry.name)
      const key = `./${relative(join(root, 'data'), absolute).replace(/\\/g, '/')}`
      files[key] = await load(absolute)
    }
  }
  validateDataPackage(manifest, files)
  const ro = await load('i18n/ro.json')
  const en = await load('i18n/en.json')
  const roKeys = Object.keys(ro).sort().join(',')
  if (roKeys !== Object.keys(en).sort().join(','))
    throw new Error('RO/EN translation keys do not match')
  console.log('DATA validation passed')
} catch (error) {
  console.error('DATA validation failed')
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
}
