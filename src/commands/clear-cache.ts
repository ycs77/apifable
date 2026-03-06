import { access, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { intro, log, outro } from '@clack/prompts'
import c from 'picocolors'

export async function clearCache(cwd?: string): Promise<void> {
  intro(c.bgBlue(' apifable clear-cache '))

  const cacheDir = join(cwd ?? process.cwd(), '.apifable', 'cache')

  try {
    await access(cacheDir)
  } catch {
    log.info('No cache found.')
    outro('Done.')
    return
  }

  try {
    await rm(cacheDir, { recursive: true })
    log.success(`Cache cleared: ${c.cyan(cacheDir)}`)
  } catch (err) {
    log.error(`Failed to clear cache: ${(err as Error).message}`)
    process.exit(1)
  }

  outro('Done.')
}
