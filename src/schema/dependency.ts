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

export function topologicalSort(
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

function extractRefName(ref: string): string | null {
  const match = ref.match(/^#\/components\/schemas\/(.+)$/)
  return match ? match[1] : null
}
