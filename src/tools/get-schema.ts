import type { ParsedSpec } from '../types.ts'
import { resolveRefs } from '../spec/ref-resolver.ts'
import { findSimilarNames } from './suggestions.ts'

export function getSchema(spec: ParsedSpec, name: string) {
  const schema = spec.schemas[name]

  if (schema === undefined) {
    const suggestions = findSimilarNames(name, Object.keys(spec.schemas))
    return {
      isError: true,
      message: buildNotFoundMessage(`Schema '${name}' not found.`, suggestions),
    }
  }

  return {
    name,
    schema: resolveRefs(schema, spec.rawSpec),
  }
}

function buildNotFoundMessage(message: string, suggestions: string[]): string {
  if (suggestions.length === 0) return message
  return `${message} Did you mean: ${suggestions.join(', ')}?`
}
