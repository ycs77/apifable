import type { AuthConfig } from '../types'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export function getAuthPath(cwd = process.cwd()): string {
  return join(cwd, '.apifable', 'auth.json')
}

export async function readAuth(cwd?: string): Promise<AuthConfig | null> {
  const authPath = getAuthPath(cwd)
  try {
    const content = await readFile(authPath, 'utf-8')
    return JSON.parse(content) as AuthConfig
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw err
  }
}
