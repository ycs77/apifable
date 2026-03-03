import { resolve } from 'node:path'
import { intro, log, outro, spinner } from '@clack/prompts'
import c from 'picocolors'
import { generate } from '../codegen/generate'
import { defaultConfig, readConfig } from '../config/config'
import { loadSpecFile } from '../spec/loader'
import { buildParsedSpec } from '../spec/parser'

interface LoadAndGenerateTypesContext {
  specPath: string
  outputDir: string
  commonFileName?: string
  spinner: ReturnType<typeof spinner>
}

export async function loadAndGenerateTypes(ctx: LoadAndGenerateTypesContext): Promise<void> {
  const { specPath, outputDir, commonFileName, spinner: s } = ctx

  s.start('Loading OpenAPI spec...')

  let parsed
  try {
    const result = await loadSpecFile(specPath)
    parsed = result.parsed
  } catch (err) {
    s.stop('Failed to load spec')
    log.error(`Failed to load spec file: ${(err as Error).message}`)
    process.exit(1)
  }

  const spec = buildParsedSpec(parsed)
  s.stop('Spec loaded')

  const schemaCount = Object.keys(spec.schemas).length
  if (schemaCount === 0) {
    log.warn('No schemas found in the spec.')
    return
  }

  s.start(`Generating types for ${schemaCount} schemas...`)
  const result = await generate(spec, outputDir, { commonFileName })
  s.stop('Types generated')

  for (const file of result.files) {
    log.success(`${c.cyan(file.path)} ${c.dim(`(${file.schemaCount} types)`)}`)
  }

  const totalTypes = result.files.reduce((sum, f) => sum + f.schemaCount, 0)
  log.info(`Generated ${c.bold(String(totalTypes))} types across ${c.bold(String(result.files.length))} files.`)
}

export async function generateTypes(options: {
  spec?: string
  output?: string
}): Promise<void> {
  intro(c.bgBlue(' apifable generate-types '))

  const config = await readConfig()
  const specPath = resolve(options.spec ?? config?.spec.path ?? defaultConfig.spec.path)
  const outputDir = resolve(options.output ?? config?.types.output ?? defaultConfig.types.output)
  const commonFileName = config?.types.commonFileName

  const s = spinner()
  await loadAndGenerateTypes({ specPath, outputDir, commonFileName, spinner: s })

  outro('Done.')
}
