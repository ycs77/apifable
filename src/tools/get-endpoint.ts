import type { HttpMethod, ParsedSpec } from '../types'
import { resolveRefs } from '../spec/ref-resolver'

export function getEndpoint(spec: ParsedSpec, method: string, path: string) {
  const normalizedMethod = method.toLowerCase() as HttpMethod
  const pathItem = spec.rawSpec.paths?.[path]

  if (!pathItem) {
    return {
      isError: true,
      message: `Path '${path}' not found in spec.`,
    }
  }

  const operation = pathItem[normalizedMethod]
  if (!operation) {
    return {
      isError: true,
      message: `Method '${method.toUpperCase()}' not found for path '${path}'.`,
    }
  }

  return {
    method: normalizedMethod,
    path,
    operationId: operation.operationId ?? '',
    summary: operation.summary ?? '',
    description: operation.description ?? '',
    tags: operation.tags ?? [],
    parameters: resolveRefs(operation.parameters, spec.rawSpec),
    requestBody: resolveRefs(operation.requestBody, spec.rawSpec),
    responses: resolveRefs(operation.responses, spec.rawSpec),
  }
}
