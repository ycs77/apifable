import type { ParsedSpec } from '../types'

export function listEndpointsByTag(spec: ParsedSpec, tag: string) {
  const tagExists = spec.tags.some(t => t.name === tag)
  if (!tagExists) {
    return {
      isError: true,
      message: `Tag '${tag}' not found.`,
      availableTags: spec.tags.map(t => t.name),
    }
  }

  const endpoints = spec.endpointIndex
    .filter(e => e.tags.includes(tag))
    .map(e => ({
      method: e.method,
      path: e.path,
      operationId: e.operationId,
      summary: e.summary,
      description: e.description,
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
