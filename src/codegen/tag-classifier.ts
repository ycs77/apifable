import type { HttpMethod, ParsedSpec } from '../types'

const HTTP_METHODS = new Set<string>(['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace'] satisfies HttpMethod[])

export interface TagClassification {
  byTag: Map<string, string[]>
  common: string[]
}

export function classifySchemasByTag(spec: ParsedSpec): TagClassification {
  const schemas = spec.schemas
  const depGraph = buildDependencyGraph(schemas)

  // Map each schema to the set of tags that reference it
  const schemaToTags = new Map<string, Set<string>>()
  for (const name of Object.keys(schemas)) {
    schemaToTags.set(name, new Set())
  }

  // Walk all endpoints to find direct schema references per tag
  for (const [, pathItem] of Object.entries(spec.rawSpec.paths ?? {})) {
    for (const [method, operation] of Object.entries(pathItem)) {
      if (!HTTP_METHODS.has(method)) continue
      if (!operation || typeof operation !== 'object') continue
      const op = operation as { tags?: string[], requestBody?: unknown, responses?: Record<string, unknown>, parameters?: unknown[] }
      const tags = op.tags ?? []
      if (tags.length === 0) continue

      const directRefs = collectRefs(op.requestBody)
        .concat(collectRefs(op.responses))
        .concat(collectRefs(op.parameters))

      // For each direct ref, also include all transitive deps
      const allRefs = new Set<string>()
      for (const ref of directRefs) {
        addTransitiveDeps(ref, depGraph, allRefs)
      }

      for (const ref of allRefs) {
        const tagSet = schemaToTags.get(ref)
        if (tagSet) {
          for (const tag of tags) {
            tagSet.add(tag)
          }
        }
      }
    }
  }

  // Classify: 1 tag → that tag, 2+ tags or 0 tags → common
  const byTag = new Map<string, string[]>()
  const common: string[] = []

  for (const [name, tags] of schemaToTags) {
    if (tags.size === 1) {
      const tag = [...tags][0]
      if (!byTag.has(tag)) byTag.set(tag, [])
      byTag.get(tag)!.push(name)
    } else {
      common.push(name)
    }
  }

  return { byTag, common }
}

export function collectRefs(value: unknown): string[] {
  const refs: string[] = []
  walkRefs(value, refs)
  return refs
}

function walkRefs(value: unknown, refs: string[]): void {
  if (value === null || typeof value !== 'object') return

  if (Array.isArray(value)) {
    for (const item of value) {
      walkRefs(item, refs)
    }
    return
  }

  const obj = value as Record<string, unknown>
  if (typeof obj.$ref === 'string') {
    const name = extractRefName(obj.$ref)
    if (name) refs.push(name)
    return
  }

  for (const val of Object.values(obj)) {
    walkRefs(val, refs)
  }
}

export function buildDependencyGraph(schemas: Record<string, unknown>): Map<string, string[]> {
  const graph = new Map<string, string[]>()
  for (const [name, schema] of Object.entries(schemas)) {
    graph.set(name, collectRefs(schema))
  }
  return graph
}

export function addTransitiveDeps(
  name: string,
  graph: Map<string, string[]>,
  visited: Set<string>,
): void {
  if (visited.has(name)) return
  visited.add(name)
  const deps = graph.get(name) ?? []
  for (const dep of deps) {
    addTransitiveDeps(dep, graph, visited)
  }
}

function extractRefName(ref: string): string | null {
  const match = ref.match(/^#\/components\/schemas\/(.+)$/)
  return match ? match[1] : null
}
