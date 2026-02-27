import type { ApifableConfig, ApifableUserConfig } from '../types'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

export const defaultConfig: ApifableConfig = {
  spec: 'openapi.yaml',
  types: {
    output: 'src/types/',
    commonFileName: 'common',
  },
}

export function getConfigPath(cwd = process.cwd()): string {
  return join(cwd, 'apifable.config.json')
}

function resolveConfig(config: ApifableUserConfig): ApifableConfig {
  return {
    ...defaultConfig,
    ...config,
    types: {
      ...defaultConfig.types,
      ...config.types,
    },
  }
}

export async function readConfig(cwd?: string): Promise<ApifableConfig | null> {
  const configPath = getConfigPath(cwd)
  try {
    const content = await readFile(configPath, 'utf-8')
    return resolveConfig(JSON.parse(content) as ApifableUserConfig)
  } catch {
    return null
  }
}

export async function writeConfig(config: ApifableUserConfig, cwd?: string): Promise<void> {
  const configPath = getConfigPath(cwd)
  const resolved = resolveConfig(config)
  await writeFile(configPath, `${JSON.stringify(resolved, null, 2)}\n`, 'utf-8')
}

export async function configExists(cwd?: string): Promise<boolean> {
  const configPath = getConfigPath(cwd)
  try {
    await readFile(configPath)
    return true
  } catch {
    return false
  }
}
