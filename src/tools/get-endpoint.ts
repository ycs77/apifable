import type { HttpMethod, OperationObject, ParsedSpec } from '../types'
import { resolveRefs } from '../spec/ref-resolver'
import { findOperationByOperationId } from './find-operation'

type GetEndpointInput =
  | { method: string, path: string }
  | { operationId: string }

export function getEndpoint(spec: ParsedSpec, input: GetEndpointInput) {
  let normalizedMethod: HttpMethod
  let path: string
  let operation: OperationObject

  if ('operationId' in input) {
    const found = findOperationByOperationId(spec, input.operationId)
    if (!found) {
      return {
        isError: true,
        message: `Operation '${input.operationId}' not found in spec.`,
      }
    }

    normalizedMethod = found.method
    path = found.path
    operation = found.operation
  } else {
    normalizedMethod = input.method.toLowerCase() as HttpMethod
    path = input.path

    const pathItem = spec.rawSpec.paths?.[path]
    if (!pathItem) {
      return {
        isError: true,
        message: `Path '${path}' not found in spec.`,
      }
    }

    const op = pathItem[normalizedMethod]
    if (!op) {
      return {
        isError: true,
        message: `Method '${input.method.toUpperCase()}' not found for path '${path}'.`,
      }
    }
    operation = op
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
