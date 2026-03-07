import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { cancel, confirm, intro, isCancel, log, outro, text } from '@clack/prompts'
import c from 'picocolors'
import { configExists, writeConfig } from '../config/config'
import { showLogo } from '../logo'

export function buildGitignoreContent(existing: string, entries: string[]): string {
  const existingLines = existing.split('\n').map(l => l.trim())
  const newEntries = entries.filter(e => !existingLines.includes(e))

  if (newEntries.length === 0) return existing

  const blockStart = existing.split('\n').findIndex(l => l.trim() === '# apifable')
  if (blockStart !== -1) {
    const lines = existing.split('\n')
    let insertAt = blockStart + 1
    while (insertAt < lines.length && lines[insertAt].trim() !== '' && !lines[insertAt].startsWith('#')) {
      insertAt++
    }
    lines.splice(insertAt, 0, ...newEntries)
    return lines.join('\n')
  }

  const separator = existing
    ? (existing.endsWith('\n') ? '\n' : '\n\n')
    : ''
  return `${existing}${separator}# apifable\n${newEntries.join('\n')}\n`
}

export async function initialize(cwd?: string): Promise<void> {
  console.log()
  showLogo()
  console.log()

  intro(c.bgBlue(' apifable '))

  // Phase 1: Collect all user input

  if (await configExists(cwd)) {
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
  }, cwd)
  log.success('Created apifable.config.json')

  const gitignorePath = join(cwd ?? process.cwd(), '.gitignore')

  const gitignoreEntries = ['.apifable/']
  if (specUrl) {
    const normalizedSpec = spec.replace(/\\/g, '/').replace(/^\.\//, '')
    if (!normalizedSpec.startsWith('.apifable/')) {
      gitignoreEntries.push(normalizedSpec)
    }
  }

  let gitignoreContent = ''
  try {
    gitignoreContent = await readFile(gitignorePath, 'utf-8')
  } catch {
    // file does not exist, will create
  }

  const newGitignoreContent = buildGitignoreContent(gitignoreContent, gitignoreEntries)
  if (newGitignoreContent !== gitignoreContent) {
    await writeFile(gitignorePath, newGitignoreContent, 'utf-8')
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
