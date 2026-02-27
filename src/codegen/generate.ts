import type { ParsedSpec } from '../types'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { generateFileContent } from './schema-to-ts'
import { addTransitiveDeps, buildDependencyGraph, classifySchemasByTag } from './tag-classifier'

export interface GenerateResult {
  files: {
    path: string
    schemaCount: number
  }[]
}

export async function generate(
  spec: ParsedSpec,
  outputDir: string,
  options?: { commonFileName?: string },
): Promise<GenerateResult> {
  const commonFileName = options?.commonFileName ?? 'common'
  const { byTag, common } = classifySchemasByTag(spec)
  const allSchemas = spec.schemas
  const depGraph = buildDependencyGraph(allSchemas)

  const files: GenerateResult['files'] = []
  await mkdir(outputDir, { recursive: true })

  // Write common file first (no imports needed)
  if (common.length > 0) {
    const sorted = topologicalSort(common, depGraph)
    const schemas = sorted.map(name => ({ name, schema: allSchemas[name] }))
    const content = generateFileContent(schemas, allSchemas)
    const filePath = join(outputDir, `${commonFileName}.ts`)
    await writeFile(filePath, content, 'utf-8')
    files.push({ path: filePath, schemaCount: schemas.length })
  }

  const commonSet = new Set(common)

  // Write tag files
  for (const [tag, schemaNames] of [...byTag.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const sorted = topologicalSort(schemaNames, depGraph)
    const schemas = sorted.map(name => ({ name, schema: allSchemas[name] }))

    // Calculate imports from common file (walk transitive deps)
    const imports = new Map<string, string[]>()
    const refsFromCommon = new Set<string>()
    for (const name of schemaNames) {
      const allDeps = new Set<string>()
      addTransitiveDeps(name, depGraph, allDeps)
      allDeps.delete(name)
      for (const dep of allDeps) {
        if (commonSet.has(dep)) {
          refsFromCommon.add(dep)
        }
      }
    }
    if (refsFromCommon.size > 0) {
      imports.set(`./${commonFileName}`, [...refsFromCommon].sort())
    }

    const content = generateFileContent(schemas, allSchemas, imports)
    const fileName = `${toKebabCase(tag)}.ts`
    const filePath = join(outputDir, fileName)
    await writeFile(filePath, content, 'utf-8')
    files.push({ path: filePath, schemaCount: schemas.length })
  }

  return { files }
}

function topologicalSort(
  names: string[],
  depGraph: Map<string, string[]>,
): string[] {
  const nameSet = new Set(names)
  const visited = new Set<string>()
  const inStack = new Set<string>()
  const result: string[] = []

  function visit(name: string): void {
    if (visited.has(name)) return
    if (inStack.has(name)) return // cycle detected, skip
    inStack.add(name)

    const deps = depGraph.get(name) ?? []
    for (const dep of deps) {
      if (nameSet.has(dep)) {
        visit(dep)
      }
    }

    inStack.delete(name)
    visited.add(name)
    result.push(name)
  }

  // Sort by name first for deterministic output
  const sorted = [...names].sort()
  for (const name of sorted) {
    visit(name)
  }

  return result
}

function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
}
