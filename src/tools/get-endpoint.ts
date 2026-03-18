import type { HttpMethod, OperationObject, ParsedSpec } from '../types.ts'
import { HTTP_METHODS, isValidHttpMethod } from '../http-methods.ts'
import { resolveRefs } from '../spec/ref-resolver.ts'
import { findOperationByOperationId } from './find-operation.ts'
import { findSimilarNames } from './suggestions.ts'

interface GetEndpointInput {
  method?: string
  path?: string
  operationId?: string
}

export function getEndpoint(spec: ParsedSpec, input: GetEndpointInput) {
  const hasMethod = input.method !== undefined
  const hasPath = input.path !== undefined
  const hasOperationId = input.operationId !== undefined

  const modeCount = (hasMethod || hasPath ? 1 : 0) + (hasOperationId ? 1 : 0)

  if (modeCount === 0) {
    return {
      isError: true,
      message: 'Provide either "method" + "path" or "operationId".',
    }
  }

  if (modeCount > 1) {
    return {
      isError: true,
      message: 'Provide either "method" + "path" or "operationId", not both.',
    }
  }

  if (hasMethod !== hasPath) {
    return {
      isError: true,
      message: 'Both "method" and "path" are required for endpoint mode.',
    }
  }

  let normalizedMethod: HttpMethod
  let path: string
  let operation: OperationObject

  if (hasOperationId) {
    if (input.operationId!.trim() === '') {
      return {
        isError: true,
        message: 'operationId must not be an empty string.',
      }
    }

    const found = findOperationByOperationId(spec, input.operationId!)
    if (!found) {
      const suggestions = findSimilarNames(
        input.operationId!,
        spec.endpointIndex.map(entry => entry.operationId).filter(Boolean),
      )

      return {
        isError: true,
        message: buildNotFoundMessage(`Operation '${input.operationId}' not found in spec.`, suggestions),
      }
    }

    normalizedMethod = found.method
    path = found.path
    operation = found.operation
  } else {
    const method = input.method!.toLowerCase()
    if (!isValidHttpMethod(method)) {
      return {
        isError: true,
        message: `Invalid HTTP method '${input.method}'. Use one of: ${HTTP_METHODS.join(', ')}.`,
      }
    }

    normalizedMethod = method
    path = input.path!

    const pathItem = spec.rawSpec.paths?.[path]
    if (!pathItem) {
      const suggestions = findSimilarNames(path, Object.keys(spec.rawSpec.paths ?? {}))

      return {
        isError: true,
        message: buildNotFoundMessage(`Path '${path}' not found in spec.`, suggestions),
      }
    }

    const op = pathItem[normalizedMethod]
    if (!op) {
      return {
        isError: true,
        message: `Method '${input.method!.toUpperCase()}' not found for path '${path}'.`,
      }
    }
    operation = op
  }

  const result: Record<string, unknown> = {
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

  if (operation.security !== undefined) {
    result.security = operation.security
  } else if (spec.rawSpec.security !== undefined) {
    result.security = spec.rawSpec.security
  }

  return result
}

function buildNotFoundMessage(message: string, suggestions: string[]): string {
  if (suggestions.length === 0) return message
  return `${message} Did you mean: ${suggestions.join(', ')}?`
}
