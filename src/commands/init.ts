import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { cancel, confirm, intro, isCancel, log, outro, text } from '@clack/prompts'
import c from 'picocolors'
import { configExists, writeConfig } from '../config/config'
import { showLogo } from '../logo'

export async function initialize(): Promise<void> {
  console.log()
  showLogo()
  console.log()

  intro(c.bgBlue(' apifable '))

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

  const specUrl = await text({
    message: 'URL to fetch OpenAPI spec from (optional, press Enter to skip):',
    placeholder: 'e.g. https://api.example.com/openapi.yaml',
  })

  if (isCancel(specUrl)) {
    cancel('Cancelled.')
    process.exit(0)
  }

  // Phase 2: Execute all file operations

  await writeConfig({
    spec: {
      path: spec,
      ...(specUrl && { url: specUrl }),
    },
  })
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

  log.message(
    [
      c.bold('Next steps:'),
      '',
      `${c.bold(c.cyan('1.'))} ${c.bold('Prepare your spec')}`,
      `   Run ${c.cyan('`npx apifable@latest fetch`')} to download the OpenAPI spec locally.`,
      '',
      `${c.bold(c.cyan('2.'))} ${c.bold('Set up MCP')}`,
      '   Add apifable to your AI agent\'s MCP config',
      `   (e.g. ${c.cyan('.mcp.json')} for Claude Code):`,
      '',
      c.dim('   {'),
      c.dim('     "mcpServers": {'),
      c.dim('       "apifable": {'),
      c.dim('         "command": "npx",'),
      c.dim('         "args": ["-y", "apifable@latest", "mcp"]'),
      c.dim('       }'),
      c.dim('     }'),
      c.dim('   }'),
    ].join('\n'),
  )

  outro('Done!')
}
