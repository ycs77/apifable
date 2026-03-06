import type { AuthConfig } from '../types'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { z } from 'zod'

const authConfigSchema = z.object({
  headers: z.record(z.string(), z.string()).optional(),
}).loose()

export function getAuthPath(cwd = process.cwd()): string {
  return join(cwd, '.apifable', 'auth.json')
}

export async function readAuth(cwd?: string): Promise<AuthConfig | null> {
  const authPath = getAuthPath(cwd)
  try {
    const content = await readFile(authPath, 'utf-8')
    let parsed: unknown

    try {
      parsed = JSON.parse(content)
    } catch (err) {
      throw new Error(`Invalid JSON in ${authPath}: ${(err as Error).message}`)
    }

    const result = authConfigSchema.safeParse(parsed)
    if (!result.success) {
      const issue = result.error.issues[0]
      const fieldPath = issue.path.length > 0 ? issue.path.join('.') : '(root)'
      throw new Error(`Invalid auth config in ${authPath}: ${fieldPath}: ${issue.message}`)
    }

    return result.data
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw err
  }
}
