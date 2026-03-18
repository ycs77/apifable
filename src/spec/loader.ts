import type { OpenAPIObject } from '../types.ts'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { extname } from 'node:path'
import { parse } from 'yaml'
import { validateOpenAPIDocument } from './validation.ts'

export async function loadSpecFile(specPath: string): Promise<{
  hash: string
  parsed: OpenAPIObject
}> {
  const content = await readFile(specPath, 'utf-8')
  const hash = createHash('sha256').update(content).digest('hex')
  const ext = extname(specPath).toLowerCase()

  let parsed: OpenAPIObject
  if (ext === '.json') {
    try {
      parsed = JSON.parse(content) as OpenAPIObject
    } catch (err) {
      throw new Error(`Failed to parse JSON: ${(err as Error).message}`)
    }
  } else if (ext === '.yaml' || ext === '.yml') {
    try {
      parsed = parse(content) as OpenAPIObject
    } catch (err) {
      throw new Error(`Failed to parse YAML: ${(err as Error).message}`)
    }
  } else {
    throw new Error('Unsupported file format. Please use .yaml, .yml, or .json')
  }

  parsed = validateOpenAPIDocument(parsed, `spec file ${specPath}`)

  return { hash, parsed }
}
