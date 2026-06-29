import type { OperationObject, PathItemObject } from '../types.ts'

export type ParameterResolver = (parameters: unknown[] | undefined) => unknown

export function mergePathItemParameters(
  pathItem: PathItemObject | undefined,
  operation: OperationObject,
  resolveParameters: ParameterResolver,
): unknown[] | undefined {
  const mergedParameters = toParameterArray(resolveParameters(pathItem?.parameters))
  const operationParameters = toParameterArray(resolveParameters(operation.parameters))

  for (const parameter of operationParameters) {
    const key = getParameterKey(parameter)
    if (key === undefined) {
      mergedParameters.push(parameter)
      continue
    }

    const existingIndex = mergedParameters.findIndex(existing => getParameterKey(existing) === key)

    if (existingIndex === -1) {
      mergedParameters.push(parameter)
    } else {
      mergedParameters[existingIndex] = parameter
    }
  }

  return mergedParameters.length > 0 ? mergedParameters : undefined
}

function toParameterArray(parameters: unknown): unknown[] {
  return Array.isArray(parameters) ? parameters : []
}

function getParameterKey(parameter: unknown): string | undefined {
  if (parameter === null || typeof parameter !== 'object' || Array.isArray(parameter)) {
    return undefined
  }

  const record = parameter as Record<string, unknown>
  if (typeof record.in !== 'string' || typeof record.name !== 'string') {
    return undefined
  }

  return `${record.in}:${record.name}`
}
