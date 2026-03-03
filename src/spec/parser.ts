import type { EndpointEntry, HttpMethod, OpenAPIObject, ParsedSpec, SecuritySchemeInfo, SpecInfo, TagInfo } from '../types'

const HTTP_METHODS: HttpMethod[] = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace']

export function buildParsedSpec(raw: OpenAPIObject): ParsedSpec {
  const securitySchemes: SecuritySchemeInfo[] = Object.entries(
    raw.components?.securitySchemes ?? {},
  ).map(([name, scheme]) => {
    const result: SecuritySchemeInfo = {
      name,
      type: scheme.type,
    }
    if (scheme.scheme) result.scheme = scheme.scheme
    if (scheme.bearerFormat) result.bearerFormat = scheme.bearerFormat
    if (scheme.description) result.description = scheme.description
    if (scheme.in) result.in = scheme.in
    if (scheme.openIdConnectUrl) result.openIdConnectUrl = scheme.openIdConnectUrl
    if (scheme.flows) result.flowTypes = Object.keys(scheme.flows)
    return result
  })

  const info: SpecInfo = {
    title: raw.info?.title ?? '',
    version: raw.info?.version ?? '',
    description: raw.info?.description ?? '',
    servers: (raw.servers ?? []).map(s => s.url ?? '').filter(Boolean),
    security: raw.security ?? [],
    securitySchemes,
  }

  const endpointIndex: EndpointEntry[] = []
  const tagEndpointCount: Record<string, number> = {}

  for (const [path, pathItem] of Object.entries(raw.paths ?? {})) {
    for (const method of HTTP_METHODS) {
      const operation = pathItem[method]
      if (!operation) continue

      const opTags = operation.tags ?? []
      const entry: EndpointEntry = {
        method,
        path,
        operationId: operation.operationId ?? '',
        summary: operation.summary ?? '',
        description: operation.description ?? '',
        tags: opTags,
      }
      endpointIndex.push(entry)

      for (const tag of opTags) {
        tagEndpointCount[tag] = (tagEndpointCount[tag] ?? 0) + 1
      }
    }
  }

  const rawTags = raw.tags ?? []
  const tags: TagInfo[] = rawTags.map(t => ({
    name: t.name ?? '',
    description: t.description ?? '',
    endpointCount: tagEndpointCount[t.name ?? ''] ?? 0,
  }))

  // Include tags that appear in endpoints but not in the top-level tags list
  const definedTagNames = new Set(rawTags.map(t => t.name ?? ''))
  for (const [name, count] of Object.entries(tagEndpointCount)) {
    if (!definedTagNames.has(name)) {
      tags.push({ name, description: '', endpointCount: count })
    }
  }

  const schemas = (raw.components?.schemas ?? {}) as Record<string, unknown>

  return { info, tags, endpointIndex, schemas, rawSpec: raw }
}
