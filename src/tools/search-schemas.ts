import type { ParsedSpec, SchemaEntry, SchemaSearchResultItem } from '../types'
import MiniSearch from 'minisearch'

export function buildSchemaEntries(schemas: Record<string, unknown>): SchemaEntry[] {
  return Object.entries(schemas).map(([name, schema]) => ({
    name,
    description: (schema as Record<string, unknown>)?.description as string ?? '',
  }))
}

export function scoreSchema(entry: SchemaEntry, query: string): number {
  const q = query.toLowerCase()
  if (entry.name.toLowerCase() === q) return 0
  if (entry.name.toLowerCase().includes(q)) return 1
  if (entry.description.toLowerCase().includes(q)) return 2
  return -1
}

export function fuzzySearchSchemas(candidates: SchemaEntry[], query: string, limit: number): SchemaSearchResultItem[] {
  const candidateMap = new Map(candidates.map(e => [e.name, e]))

  const ms = new MiniSearch({
    fields: ['name', 'description'],
    idField: 'id',
  })

  ms.addAll(
    candidates.map(e => ({
      id: e.name,
      name: e.name,
      description: e.description,
    })),
  )

  return ms
    .search(query, {
      fuzzy: 0.2,
      prefix: true,
      boost: { name: 2, description: 1 },
    })
    .slice(0, limit)
    .map(r => {
      const entry = candidateMap.get(r.id)!
      return {
        name: entry.name,
        description: entry.description,
        score: r.score,
      }
    })
}

export function searchSchemas(spec: ParsedSpec, query: string, limit = 10) {
  const candidates = buildSchemaEntries(spec.schemas)

  // Exact (substring) search
  const exactScored = candidates
    .map(e => ({ entry: e, score: scoreSchema(e, query) }))
    .filter(r => r.score >= 0)
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)

  if (exactScored.length > 0) {
    return {
      query,
      matchType: 'exact' as const,
      results: exactScored.map<SchemaSearchResultItem>(r => ({
        name: r.entry.name,
        description: r.entry.description,
      })),
      total: exactScored.length,
    }
  }

  // Fuzzy fallback
  const fuzzyResults = fuzzySearchSchemas(candidates, query, limit)
  return {
    query,
    matchType: 'fuzzy' as const,
    results: fuzzyResults,
    total: fuzzyResults.length,
  }
}
