import type { OpenAPIObject } from '../types'

export function resolveRefs(value: unknown, rawSpec: OpenAPIObject, visited: Set<string> = new Set()): unknown {
  if (value === null || typeof value !== 'object') {
    return value
  }

  if (Array.isArray(value)) {
    return value.map(item => resolveRefs(item, rawSpec, visited))
  }

  const obj = value as Record<string, unknown>

  if ('$ref' in obj && typeof obj.$ref === 'string') {
    const ref = obj.$ref
    const match = ref.match(/^#\/components\/schemas\/(.+)$/)
    if (!match) {
      return obj
    }
    const schemaName = match[1]
    if (visited.has(schemaName)) {
      return { $ref: schemaName }
    }
    const schema = rawSpec.components?.schemas?.[schemaName]
    if (schema === undefined) {
      return obj
    }
    const newVisited = new Set(visited)
    newVisited.add(schemaName)
    return resolveRefs(schema, rawSpec, newVisited)
  }

  const result: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(obj)) {
    result[key] = resolveRefs(val, rawSpec, visited)
  }
  return result
}
