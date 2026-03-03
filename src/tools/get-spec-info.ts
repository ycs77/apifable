import type { ParsedSpec } from '../types'

export function getSpecInfo(spec: ParsedSpec) {
  const result: Record<string, unknown> = {
    title: spec.info.title,
    version: spec.info.version,
    description: spec.info.description,
    servers: spec.info.servers,
    tags: spec.tags.map(t => ({
      name: t.name,
      description: t.description,
      endpointCount: t.endpointCount,
    })),
  }

  if (spec.info.securitySchemes.length > 0) {
    result.securitySchemes = spec.info.securitySchemes
  }

  if (spec.info.security.length > 0) {
    result.security = spec.info.security
  }

  return result
}
