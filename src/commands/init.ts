import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { cancel, confirm, intro, isCancel, log, outro, select, text } from '@clack/prompts'
import c from 'picocolors'
import { configExists, writeConfig } from '../config/config.ts'
import { showLogo } from '../logo.ts'

type SpecSetupMode = 'manual-file' | 'remote-url'

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

function exitOnCancel(value: unknown): asserts value is string | SpecSetupMode {
  if (isCancel(value)) {
    cancel('Cancelled.')
    process.exit(0)
  }
}

function buildNextSteps(mode: SpecSetupMode, specPath: string): string {
  const stepOne = mode === 'manual-file'
    ? [
        `${c.bold(c.cyan('1.'))} ${c.bold('Place your OpenAPI spec file')}`,
        `   Place your OpenAPI spec file at ${c.cyan(specPath)}.`,
      ]
    : [
        `${c.bold(c.cyan('1.'))} ${c.bold('Fetch your OpenAPI spec')}`,
        `   Run ${c.cyan('`npx apifable@latest fetch`')} to download the latest OpenAPI spec to ${c.cyan(specPath)}.`,
      ]

  return [
    c.bold('Next steps:'),
    '',
    ...stepOne,
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
  ].join('\n')
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

  const mode = await select<SpecSetupMode>({
    message: 'How would you like to set up your OpenAPI spec?',
    options: [
      {
        value: 'manual-file',
        label: 'Manual file',
        hint: 'Place and update the local spec file yourself',
      },
      {
        value: 'remote-url',
        label: 'Remote URL',
        hint: 'Fetch and refresh the local spec file from a URL',
      },
    ],
  })

  exitOnCancel(mode)

  let specUrl: string | undefined
  if (mode === 'remote-url') {
    const remoteSpecUrl = await text({
      message: 'Remote URL for your OpenAPI spec:',
      placeholder: 'e.g. https://api.example.com/openapi.yaml',
      validate: value => {
        if (!value) return 'Spec URL is required'
      },
    })

    exitOnCancel(remoteSpecUrl)
    specUrl = remoteSpecUrl
  }

  const spec = await text({
    message: mode === 'manual-file'
      ? 'Local path for your OpenAPI spec file:'
      : 'Local path for the downloaded OpenAPI spec:',
    initialValue: 'openapi.yaml',
    placeholder: 'e.g. openapi.yaml',
    validate: value => {
      if (!value) return 'Spec path is required'
    },
  })

  exitOnCancel(spec)

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
    buildNextSteps(mode, spec),
  )

  outro('Done!')
}
