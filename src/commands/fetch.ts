import type { OpenAPIObject } from '../types'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, extname, resolve } from 'node:path'
import { intro, log, outro, spinner } from '@clack/prompts'
import c from 'picocolors'
import { parse, stringify } from 'yaml'
import { defaultConfig, readConfig } from '../config/config'
import { resolveHeaders } from '../config/headers'

type SpecFormat = 'json' | 'yaml'

export interface FetchOptions {
  url?: string
  output?: string
  cwd?: string
}

function getFormatByPath(filePath: string): SpecFormat {
  const extension = extname(filePath).toLowerCase()
  if (extension === '.json') return 'json'
  if (extension === '.yaml' || extension === '.yml') return 'yaml'
  throw new Error('Unsupported output format. Please use .yaml, .yml, or .json')
}

function parseSpecContent(content: string): { format: SpecFormat, spec: OpenAPIObject } {
  try {
    return {
      format: 'json',
      spec: JSON.parse(content) as OpenAPIObject,
    }
  } catch {
    try {
      return {
        format: 'yaml',
        spec: parse(content) as OpenAPIObject,
      }
    } catch (err) {
      throw new Error(`Failed to parse downloaded spec content: ${(err as Error).message}`)
    }
  }
}

function stringifySpecContent(spec: OpenAPIObject, format: SpecFormat): string {
  if (format === 'json') {
    return `${JSON.stringify(spec, null, 2)}\n`
  }

  const yamlContent = stringify(spec)
  return yamlContent.endsWith('\n') ? yamlContent : `${yamlContent}\n`
}

export async function fetchAndWriteSpec(options: FetchOptions): Promise<{ outputPath: string, sourceFormat: SpecFormat, targetFormat: SpecFormat }> {
  const config = await readConfig(options.cwd)
  const url = options.url ?? config?.spec.url

  if (!url) {
    throw new Error('Spec URL is required. Set `spec.url` in apifable.config.json or pass --url')
  }

  const outputPath = resolve(
    options.cwd || process.cwd(),
    options.output ?? config?.spec.path ?? defaultConfig.spec.path
  )
  const targetFormat = getFormatByPath(outputPath)

  let response: Response
  try {
    response = await fetch(url, {
      headers: await resolveHeaders(options.cwd),
    })
  } catch (err) {
    throw new Error(`Failed to fetch spec URL: ${(err as Error).message}`)
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch spec URL: HTTP ${response.status} ${response.statusText}`)
  }

  const body = await response.text()
  const { format: sourceFormat, spec } = parseSpecContent(body)
  const content = stringifySpecContent(spec, targetFormat)

  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, content, 'utf-8')

  return {
    outputPath,
    sourceFormat,
    targetFormat,
  }
}

export async function fetchSpec(options: FetchOptions): Promise<void> {
  intro(c.bgBlue(' apifable fetch '))

  const s = spinner()
  s.start('Downloading OpenAPI spec...')

  let result: Awaited<ReturnType<typeof fetchAndWriteSpec>>
  try {
    result = await fetchAndWriteSpec(options)
    if (result.sourceFormat === result.targetFormat) {
      s.stop('Spec downloaded and saved')
    } else {
      s.stop(`Spec downloaded, converted ${c.bold(result.sourceFormat.toUpperCase())} -> ${c.bold(result.targetFormat.toUpperCase())}, and saved`)
    }
    log.success(`Saved to ${c.cyan(result.outputPath)}`)
  } catch (err) {
    s.stop('Failed to fetch spec')
    log.error((err as Error).message)
    process.exit(1)
  }

  outro('Done.')
}
