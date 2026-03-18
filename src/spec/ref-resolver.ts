import type { OpenAPIObject } from '../types.ts'

export function resolveRefs(value: unknown, rawSpec: OpenAPIObject, visited: Set<string> = new Set()): unknown {
  return resolveRefsInternal(value, rawSpec, visited, false)
}

export function resolveNonSchemaComponentRefs(
  value: unknown,
  rawSpec: OpenAPIObject,
  visited: Set<string> = new Set(),
): unknown {
  return resolveRefsInternal(value, rawSpec, visited, true)
}

function resolveRefsInternal(
  value: unknown,
  rawSpec: OpenAPIObject,
  visited: Set<string>,
  preserveSchemaRefs: boolean,
): unknown {
  if (value === null || typeof value !== 'object') {
    return value
  }

  if (Array.isArray(value)) {
    return value.map(item => resolveRefsInternal(item, rawSpec, visited, preserveSchemaRefs))
  }

  const obj = value as Record<string, unknown>

  if ('$ref' in obj && typeof obj.$ref === 'string') {
    const ref = obj.$ref
    if (preserveSchemaRefs && isSchemaRef(ref)) {
      return obj
    }

    const resolved = resolveInternalComponentRef(ref, rawSpec)
    if (resolved === undefined) {
      return obj
    }
    if (visited.has(ref)) {
      return { $ref: toCircularRefMarker(ref) }
    }

    const newVisited = new Set(visited)
    newVisited.add(ref)
    return resolveRefsInternal(resolved, rawSpec, newVisited, preserveSchemaRefs)
  }

  const result: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(obj)) {
    result[key] = resolveRefsInternal(val, rawSpec, visited, preserveSchemaRefs)
  }
  return result
}

function isSchemaRef(ref: string): boolean {
  return /^#\/components\/schemas\/.+/.test(ref)
}

function resolveInternalComponentRef(ref: string, rawSpec: OpenAPIObject): unknown {
  if (!ref.startsWith('#/components/')) {
    return undefined
  }

  const pathSegments = ref
    .slice(2)
    .split('/')
    .map(segment => segment.replace(/~1/g, '/').replace(/~0/g, '~'))

  let current: unknown = rawSpec
  for (const segment of pathSegments) {
    if (current === null || typeof current !== 'object') {
      return undefined
    }

    const record = current as Record<string, unknown>
    if (!(segment in record)) {
      return undefined
    }

    current = record[segment]
  }

  return current
}

function toCircularRefMarker(ref: string): string {
  const schemaRefMatch = ref.match(/^#\/components\/schemas\/(.+)$/)
  return schemaRefMatch ? schemaRefMatch[1] : ref
}
