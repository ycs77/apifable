import type { ParsedSpec } from '../types'
import { resolveRefs } from '../spec/ref-resolver'

export function getSchema(spec: ParsedSpec, name: string) {
  const schema = spec.schemas[name]

  if (schema === undefined) {
    return {
      isError: true,
      message: `Schema '${name}' not found.`,
    }
  }

  return {
    name,
    schema: resolveRefs(schema, spec.rawSpec),
  }
}
