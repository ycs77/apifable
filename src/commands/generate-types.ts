import { resolve } from 'node:path'
import { intro, log, outro, spinner } from '@clack/prompts'
import { generate } from '../codegen/generate'
import { defaultConfig, readConfig } from '../config/config'
import { showLogo } from '../logo'
import { loadSpecFile } from '../spec/loader'
import { buildParsedSpec } from '../spec/parser'

export async function generateTypes(options: {
  spec?: string
  output?: string
}): Promise<void> {
  console.log()
  showLogo()
  console.log()

  intro('apifable generate-types')

  const config = await readConfig()
  const specPath = resolve(options.spec ?? config?.spec ?? defaultConfig.spec)
  const outputDir = resolve(options.output ?? config?.types.output ?? defaultConfig.types.output)
  const commonFileName = config?.types.commonFileName

  const s = spinner()
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
    outro('Done.')
    return
  }

  s.start(`Generating types for ${schemaCount} schemas...`)
  const result = await generate(spec, outputDir, { commonFileName })
  s.stop('Types generated')

  for (const file of result.files) {
    log.success(`${file.path} (${file.schemaCount} types)`)
  }

  const totalTypes = result.files.reduce((sum, f) => sum + f.schemaCount, 0)
  outro(`Generated ${totalTypes} types across ${result.files.length} files.`)
}
