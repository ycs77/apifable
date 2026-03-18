import type { ApifableConfig, ApifableUserConfig } from '../types.ts'
import { access, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { z } from 'zod'

const apifableUserConfigSchema = z.object({
  spec: z.object({
    path: z.string().optional(),
    url: z.string().optional(),
    headers: z.record(z.string(), z.string()).optional(),
  }).loose().optional(),
}).loose()

export const defaultConfig: ApifableConfig = {
  spec: {
    path: 'openapi.yaml',
  },
}

export function getConfigPath(cwd = process.cwd()): string {
  return join(cwd, 'apifable.config.json')
}

export function resolveConfig(config: ApifableUserConfig): ApifableConfig {
  return {
    spec: {
      path: config.spec?.path ?? defaultConfig.spec.path,
      url: config.spec?.url,
      headers: config.spec?.headers,
    },
  }
}

export async function readConfig(cwd?: string): Promise<ApifableConfig | null> {
  const configPath = getConfigPath(cwd)
  try {
    const content = await readFile(configPath, 'utf-8')
    let parsed: unknown

    try {
      parsed = JSON.parse(content)
    } catch (err) {
      throw new Error(`Invalid JSON in ${configPath}: ${(err as Error).message}`)
    }

    const result = apifableUserConfigSchema.safeParse(parsed)
    if (!result.success) {
      const issue = result.error.issues[0]
      const fieldPath = issue.path.length > 0 ? issue.path.join('.') : '(root)'
      throw new Error(`Invalid config in ${configPath}: ${fieldPath}: ${issue.message}`)
    }

    return resolveConfig(result.data as ApifableUserConfig)
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw err
  }
}

export async function writeConfig(config: ApifableUserConfig, cwd?: string): Promise<void> {
  const configPath = getConfigPath(cwd)
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf-8')
}

export async function configExists(cwd?: string): Promise<boolean> {
  const configPath = getConfigPath(cwd)
  try {
    await access(configPath)
    return true
  } catch {
    return false
  }
}
