import { readAuth } from './auth.ts'
import { readConfig } from './config.ts'
import { expandHeaderValues } from './env.ts'

export async function resolveHeaders(cwd?: string): Promise<Record<string, string> | undefined> {
  const [config, auth] = await Promise.all([readConfig(cwd), readAuth(cwd)])

  const merged = {
    ...(config?.spec.headers ?? {}),
    ...(auth?.headers ?? {}),
  }

  if (Object.keys(merged).length === 0) return undefined

  return expandHeaderValues(merged)
}
