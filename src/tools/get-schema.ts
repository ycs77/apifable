import type { ParsedSpec } from '../types'
import { resolveRefs } from '../spec/ref-resolver'

export function getSchema(spec: ParsedSpec, name: string) {
  const schema = spec.schemas[name]

  if (schema === undefined) {
    const available = Object.keys(spec.schemas).slice(0, 20)
    return {
      isError: true,
      message: `Schema '${name}' not found.`,
      availableSchemas: available,
    }
  }

  return {
    name,
    schema: resolveRefs(schema, spec.rawSpec),
  }
}
