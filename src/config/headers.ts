import { readAuth } from './auth'
import { readConfig } from './config'
import { expandHeaderValues } from './env'

export async function resolveHeaders(cwd?: string): Promise<Record<string, string> | undefined> {
  const [config, auth] = await Promise.all([readConfig(cwd), readAuth(cwd)])

  const merged = {
    ...(config?.spec.headers ?? {}),
    ...(auth?.headers ?? {}),
  }

  if (Object.keys(merged).length === 0) return undefined

  return expandHeaderValues(merged)
}
