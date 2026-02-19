import type { ParsedSpec } from '../types'

export function getSpecInfo(spec: ParsedSpec) {
  return {
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
}
