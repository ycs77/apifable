import type { ParsedSpec, SpecCache } from '../types'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { CACHE_VERSION } from '../types'

function getCachePath(cwd = process.cwd()): string {
  return join(cwd, '.apifable', 'cache', 'cache.json')
}

export async function readCache(hash: string, cwd?: string): Promise<ParsedSpec | null> {
  try {
    const cachePath = getCachePath(cwd)
    const content = await readFile(cachePath, 'utf-8')
    const cache = JSON.parse(content) as SpecCache
    if (cache.version !== CACHE_VERSION || cache.hash !== hash) {
      return null
    }
    return cache.spec
  } catch {
    return null
  }
}

export async function writeCache(hash: string, spec: ParsedSpec, cwd?: string): Promise<void> {
  const cachePath = getCachePath(cwd)
  await mkdir(dirname(cachePath), { recursive: true })
  const cache: SpecCache = {
    version: CACHE_VERSION,
    hash,
    cachedAt: new Date().toISOString(),
    spec,
  }
  await writeFile(cachePath, JSON.stringify(cache, null, 2), 'utf-8')
}
