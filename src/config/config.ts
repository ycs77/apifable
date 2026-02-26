import type { ApifableConfig } from '../types'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

export function getConfigPath(cwd = process.cwd()): string {
  return join(cwd, 'apifable.config.json')
}

export async function readConfig(cwd?: string): Promise<ApifableConfig | null> {
  const configPath = getConfigPath(cwd)
  try {
    const content = await readFile(configPath, 'utf-8')
    return JSON.parse(content) as ApifableConfig
  } catch {
    return null
  }
}

export async function writeConfig(config: ApifableConfig, cwd?: string): Promise<void> {
  const configPath = getConfigPath(cwd)
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf-8')
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
