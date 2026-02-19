import type { OpenAPIObject } from '../types'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { parse } from 'yaml'

export async function loadSpecFile(specPath: string): Promise<{
  hash: string
  parsed: OpenAPIObject
}> {
  const content = await readFile(specPath, 'utf-8')
  const hash = createHash('sha256').update(content).digest('hex')
  const parsed = parse(content) as OpenAPIObject
  return { hash, parsed }
}
