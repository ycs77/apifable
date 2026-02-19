import type { ParsedSpec } from '../types'

export function listEndpointsByTag(spec: ParsedSpec, tag: string) {
  const endpoints = spec.endpointIndex
    .filter(e => e.tags.includes(tag))
    .map(e => ({
      method: e.method,
      path: e.path,
      operationId: e.operationId,
      summary: e.summary,
    }))

  const result: {
    tag: string
    endpoints: typeof endpoints
    warning?: string
  } = { tag, endpoints }

  if (endpoints.length > 30) {
    result.warning = `This tag has ${endpoints.length} endpoints. Consider using search_endpoints to narrow results.`
  }

  return result
}
