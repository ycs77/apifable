import type { HttpMethod, OperationObject, ParsedSpec } from '../types'

const HTTP_METHODS: HttpMethod[] = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace']

export interface FoundOperation {
  method: HttpMethod
  path: string
  operation: OperationObject
}

export function findOperationByOperationId(
  spec: ParsedSpec,
  operationId: string,
): FoundOperation | undefined {
  const paths = spec.rawSpec.paths
  if (!paths) return undefined

  for (const [path, pathItem] of Object.entries(paths)) {
    if (!pathItem) continue
    for (const method of HTTP_METHODS) {
      const operation = pathItem[method]
      if (operation?.operationId && operation.operationId === operationId) {
        return { method, path, operation }
      }
    }
  }

  return undefined
}
