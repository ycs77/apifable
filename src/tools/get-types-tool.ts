import type { HttpMethod, ParsedSpec } from '../types'
import { HTTP_METHODS, isValidHttpMethod } from '../http-methods'
import { addTransitiveDeps, buildDependencyGraph, collectRefs, topologicalSort } from '../schema/dependency'
import { generateFileContent } from '../schema/to-ts'
import { findOperationByOperationId } from './find-operation'
import { findSimilarNames } from './suggestions'

interface GetTypesInput {
  schemas?: string[]
  method?: string
  path?: string
  operationId?: string
}

interface GetTypesSuccess {
  code: string
}

interface GetTypesError {
  isError: true
  message: string
}

export function getTypesTool(
  spec: ParsedSpec,
  input: GetTypesInput,
): GetTypesSuccess | GetTypesError {
  const hasSchemas = input.schemas !== undefined
  const hasMethod = input.method !== undefined
  const hasPath = input.path !== undefined
  const hasOperationId = input.operationId !== undefined

  const modeCount =
    (hasSchemas ? 1 : 0) +
    (hasMethod || hasPath ? 1 : 0) +
    (hasOperationId ? 1 : 0)

  if (modeCount > 1) {
    return {
      isError: true,
      message: 'Provide exactly one of: "schemas", "method" + "path", or "operationId".',
    }
  }

  if (hasSchemas && input.schemas!.length === 0) {
    return {
      isError: true,
      message: '"schemas" must not be an empty array.',
    }
  }

  if (hasMethod !== hasPath) {
    return {
      isError: true,
      message: 'Both "method" and "path" are required for endpoint mode.',
    }
  }

  if (modeCount === 0) {
    return {
      isError: true,
      message: 'Provide either "schemas", "method" + "path", or "operationId".',
    }
  }

  let rootSchemaNames: string[]
  let endpointMethod: string | undefined
  let endpointPath: string | undefined
  let endpointOperationId: string | undefined

  if (hasSchemas) {
    rootSchemaNames = [...new Set(input.schemas)]
    const missing = findMissingSchemas(rootSchemaNames, spec.schemas)
    if (missing.length > 0) {
      return {
        isError: true,
        message: buildMissingSchemaMessage(missing, spec.schemas),
      }
    }
  } else {
    let operation

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
      operation = found.operation
      endpointMethod = found.method
      endpointPath = found.path
      endpointOperationId = input.operationId!
    } else {
      const method = input.method!
      endpointPath = input.path!
      const normalizedMethod = method.toLowerCase()
      if (!isValidHttpMethod(normalizedMethod)) {
        return {
          isError: true,
          message: `Invalid HTTP method '${input.method}'. Use one of: ${HTTP_METHODS.join(', ')}.`,
        }
      }

      endpointMethod = normalizedMethod
      const pathItem = spec.rawSpec.paths?.[endpointPath]

      if (!pathItem) {
        const suggestions = findSimilarNames(endpointPath, Object.keys(spec.rawSpec.paths ?? {}))

        return {
          isError: true,
          message: buildNotFoundMessage(`Path '${endpointPath}' not found in spec.`, suggestions),
        }
      }

      operation = pathItem[endpointMethod as HttpMethod]
      if (!operation) {
        return {
          isError: true,
          message: `Method '${method.toUpperCase()}' not found for path '${endpointPath}'.`,
        }
      }

      endpointOperationId = operation.operationId
    }

    rootSchemaNames = [...new Set([
      ...collectRefs(operation.requestBody),
      ...collectRefs(operation.responses),
      ...collectRefs(operation.parameters),
    ])]

    if (rootSchemaNames.length === 0) {
      return {
        isError: true,
        message: `No schema references found for endpoint '${endpointMethod!.toUpperCase()} ${endpointPath}'.`,
      }
    }

    const missing = findMissingSchemas(rootSchemaNames, spec.schemas)
    if (missing.length > 0) {
      return {
        isError: true,
        message: buildMissingSchemaMessage(missing, spec.schemas),
      }
    }
  }

  const depGraph = buildDependencyGraph(spec.schemas)
  const allSchemaNames = new Set<string>()
  for (const name of rootSchemaNames) {
    addTransitiveDeps(name, depGraph, allSchemaNames)
  }

  const missingDeps = findMissingSchemas([...allSchemaNames], spec.schemas)
  if (missingDeps.length > 0) {
    return {
      isError: true,
      message: buildMissingSchemaMessage(missingDeps, spec.schemas),
    }
  }

  const sortedNames = topologicalSort([...allSchemaNames], depGraph)
  const schemas = sortedNames.map(name => ({
    name,
    schema: spec.schemas[name],
  }))
  const code = generateFileContent(schemas, spec.schemas)

  const headerLines: string[] = []
  if (hasSchemas) {
    headerLines.push(`// Generated from schemas: ${sortedNames.join(', ')}`)
  } else {
    const operationIdPrefix = endpointOperationId ? `${endpointOperationId} ` : ''
    headerLines.push(`// Generated from endpoint: ${operationIdPrefix}${endpointMethod!.toUpperCase()} ${endpointPath}`)
    headerLines.push(`// Includes schemas: ${sortedNames.join(', ')}`)
  }

  return { code: `${headerLines.join('\n')}\n\n${code}` }
}

function findMissingSchemas(
  names: string[],
  schemas: Record<string, unknown>,
): string[] {
  return names.filter(name => !(name in schemas)).sort((a, b) => a.localeCompare(b))
}

function buildMissingSchemaMessage(
  missing: string[],
  schemas: Record<string, unknown>,
): string {
  const message = `Schema not found: ${missing.join(', ')}.`
  if (missing.length !== 1) return message

  const suggestions = findSimilarNames(missing[0], Object.keys(schemas))
  return buildNotFoundMessage(message, suggestions)
}

function buildNotFoundMessage(message: string, suggestions: string[]): string {
  if (suggestions.length === 0) return message
  return `${message} Did you mean: ${suggestions.join(', ')}?`
}
