import type { ApifableConfig, ApifableUserConfig } from '../types'
import { access, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

export const defaultConfig: ApifableConfig = {
  spec: {
    path: 'openapi.yaml',
  },
}

export function getConfigPath(cwd = process.cwd()): string {
  return join(cwd, 'apifable.config.json')
}

function resolveConfig(config: ApifableUserConfig): ApifableConfig {
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
    return resolveConfig(JSON.parse(content) as ApifableUserConfig)
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
