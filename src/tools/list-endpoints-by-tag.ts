import type { ParsedSpec } from '../types'

export function listEndpointsByTag(spec: ParsedSpec, tag: string, limit?: number, offset = 0) {
  const tagExists = spec.tags.some(t => t.name === tag)
  if (!tagExists) {
    return {
      isError: true,
      message: `Tag '${tag}' not found.`,
      availableTags: spec.tags.map(t => t.name),
    }
  }

  const all = spec.endpointIndex
    .filter(e => e.tags.includes(tag))
    .map(e => ({
      method: e.method,
      path: e.path,
      operationId: e.operationId,
      summary: e.summary,
      description: e.description,
    }))

  const total = all.length
  const endpoints = limit !== undefined ? all.slice(offset, offset + limit) : all.slice(offset)

  const result: {
    tag: string
    endpoints: typeof endpoints
    total: number
    offset: number
    hasMore: boolean
    warning?: string
  } = {
    tag,
    endpoints,
    total,
    offset,
    hasMore: offset + endpoints.length < total,
  }

  if (total > 30 && limit === undefined) {
    result.warning = `This tag has ${total} endpoints. Consider using search_endpoints to narrow results or use limit/offset for pagination.`
  }

  return result
}
