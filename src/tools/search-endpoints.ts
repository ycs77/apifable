import type { EndpointEntry, ParsedSpec, SearchResultItem } from '../types'
import MiniSearch from 'minisearch'

function scoreEndpoint(entry: EndpointEntry, query: string): number {
  const q = query.toLowerCase()
  if (entry.operationId.toLowerCase() === q) return 0
  if (entry.path.toLowerCase().includes(q)) return 1
  if (entry.summary.toLowerCase().includes(q)) return 2
  if (entry.description.toLowerCase().includes(q)) return 3
  return -1
}

function fuzzySearch(candidates: EndpointEntry[], query: string, limit: number): SearchResultItem[] {
  const candidateMap = new Map(candidates.map(e => [`${e.method}:${e.path}`, e]))

  const ms = new MiniSearch({
    fields: ['operationId', 'path', 'summary', 'description'],
    idField: 'id',
  })

  ms.addAll(
    candidates.map(e => ({
      id: `${e.method}:${e.path}`,
      operationId: e.operationId,
      path: e.path,
      summary: e.summary,
      description: e.description,
    })),
  )

  return ms
    .search(query, {
      fuzzy: 0.2, // 20% edit distance: ~1 typo per 5 chars; 0.3+ gets noisy
      prefix: true,
      boost: {
        operationId: 2, // most precise identifier in a spec
        path: 1.5, // structural, highly specific
        summary: 1.2, // short label, reliable
        description: 1, // lengthy prose, last resort
      },
    })
    .slice(0, limit)
    .map(r => {
      const entry = candidateMap.get(r.id)!
      return {
        method: entry.method,
        path: entry.path,
        operationId: entry.operationId,
        summary: entry.summary,
        tags: entry.tags,
        score: r.score,
      }
    })
}

export function searchEndpoints(spec: ParsedSpec, query: string, tag?: string, limit = 10) {
  let candidates = spec.endpointIndex
  if (tag) {
    candidates = candidates.filter(e => e.tags.includes(tag))
  }

  // Exact (substring) search
  const exactScored = candidates
    .map(e => ({ entry: e, score: scoreEndpoint(e, query) }))
    .filter(r => r.score >= 0)
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)

  if (exactScored.length > 0) {
    return {
      query,
      tag,
      matchType: 'exact' as const,
      results: exactScored.map<SearchResultItem>(r => ({
        method: r.entry.method,
        path: r.entry.path,
        operationId: r.entry.operationId,
        summary: r.entry.summary,
        tags: r.entry.tags,
      })),
      total: exactScored.length,
    }
  }

  // Fuzzy fallback
  const fuzzyResults = fuzzySearch(candidates, query, limit)
  return {
    query,
    tag,
    matchType: 'fuzzy' as const,
    results: fuzzyResults,
    total: fuzzyResults.length,
  }
}
