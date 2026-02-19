import type { EndpointEntry, ParsedSpec } from '../types'

function scoreEndpoint(entry: EndpointEntry, query: string): number {
  const q = query.toLowerCase()
  if (entry.operationId.toLowerCase() === q) return 0
  if (entry.path.toLowerCase().includes(q)) return 1
  if (entry.summary.toLowerCase().includes(q)) return 2
  if (entry.description.toLowerCase().includes(q)) return 3
  return -1
}

export function searchEndpoints(spec: ParsedSpec, query: string, tag?: string, limit = 10) {
  let candidates = spec.endpointIndex
  if (tag) {
    candidates = candidates.filter(e => e.tags.includes(tag))
  }

  const scored = candidates
    .map(e => ({ entry: e, score: scoreEndpoint(e, query) }))
    .filter(r => r.score >= 0)
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)

  return {
    query,
    tag,
    results: scored.map(r => ({
      method: r.entry.method,
      path: r.entry.path,
      operationId: r.entry.operationId,
      summary: r.entry.summary,
      tags: r.entry.tags,
    })),
    total: scored.length,
  }
}
