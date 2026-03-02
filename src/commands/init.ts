import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { cancel, confirm, intro, isCancel, log, outro, text } from '@clack/prompts'
import { configExists, writeConfig } from '../config/config'
import { showLogo } from '../logo'

export async function initialize(): Promise<void> {
  console.log()
  showLogo()
  console.log()

  intro('apifable')

  // Phase 1: Collect all user input

  if (await configExists()) {
    const shouldOverwrite = await confirm({ message: 'apifable.config.json already exists. Overwrite?' })
    if (isCancel(shouldOverwrite) || !shouldOverwrite) {
      outro('Aborted.')
      return
    }
  }

  const spec = await text({
    message: 'Path to OpenAPI spec file:',
    initialValue: 'openapi.yaml',
    placeholder: 'e.g. openapi.yaml',
    validate: value => {
      if (!value) return 'Spec path is required'
    },
  })

  if (isCancel(spec)) {
    cancel('Cancelled.')
    process.exit(0)
  }

  // Phase 2: Execute all file operations

  await writeConfig({ spec })
  log.success('Created apifable.config.json')

  const gitignorePath = join(process.cwd(), '.gitignore')
  const gitignoreEntry = '.apifable/cache/'

  let gitignoreContent = ''
  try {
    gitignoreContent = await readFile(gitignorePath, 'utf-8')
  } catch {
    // file does not exist, will create
  }

  if (!gitignoreContent.includes(gitignoreEntry)) {
    const separator = gitignoreContent
      ? (gitignoreContent.endsWith('\n') ? '\n' : '\n\n')
      : ''
    await writeFile(gitignorePath, `${gitignoreContent}${separator}# apifable cache\n${gitignoreEntry}\n`, 'utf-8')
    log.success('Updated .gitignore')
  }

  outro('Done! Next, add apifable to the MCP config for your AI agent.')
}
