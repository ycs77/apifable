import type { EndpointEntry, ParsedSpec, SearchResultItem } from '../types.ts'
import MiniSearch from 'minisearch'

function scoreEndpoint(entry: EndpointEntry, query: string): number {
  const q = query.toLowerCase()
  if (entry.operationId.toLowerCase() === q) return 0
  if (entry.operationId.toLowerCase().includes(q)) return 1
  if (entry.path.toLowerCase().includes(q)) return 2
  if (entry.summary.toLowerCase().includes(q)) return 3
  if (entry.description.toLowerCase().includes(q)) return 4
  return -1
}

function fuzzySearch(candidates: EndpointEntry[], query: string): SearchResultItem[] {
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

  if (exactScored.length > 0) {
    const results = exactScored
      .slice(0, limit)
      .map<SearchResultItem>(r => ({
        method: r.entry.method,
        path: r.entry.path,
        operationId: r.entry.operationId,
        summary: r.entry.summary,
        tags: r.entry.tags,
      }))

    return {
      query,
      tag,
      matchType: 'exact' as const,
      results,
      total: exactScored.length,
      hasMore: exactScored.length > results.length,
    }
  }

  // Fuzzy fallback
  const fuzzyMatches = fuzzySearch(candidates, query)
  const fuzzyResults = fuzzyMatches.slice(0, limit)
  const fuzzyReturn: {
    query: string
    tag: string | undefined
    matchType: 'fuzzy'
    results: SearchResultItem[]
    total: number
    hasMore: boolean
    message?: string
  } = {
    query,
    tag,
    matchType: 'fuzzy',
    results: fuzzyResults,
    total: fuzzyMatches.length,
    hasMore: fuzzyMatches.length > fuzzyResults.length,
  }

  if (fuzzyResults.length === 0) {
    fuzzyReturn.message = 'No endpoints found. Try different keywords or check available tags with get_spec_info.'
  }

  return fuzzyReturn
}
