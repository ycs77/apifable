import type { HttpMethod, OperationObject, ParsedSpec } from '../types'
import { HTTP_METHODS, isValidHttpMethod } from '../http-methods'
import { addTransitiveDeps, buildDependencyGraph, collectRefs, topologicalSort } from '../schema/dependency'
import { generateFileContent } from '../schema/to-ts'
import { resolveNonSchemaComponentRefs } from '../spec/ref-resolver'
import { findOperationByOperationId } from './find-operation'
import { extractInlineSchemas } from './inline-schemas'
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
  let inlineSchemas: { name: string, schema: unknown }[] = []

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

      const matchedOperation = pathItem[endpointMethod as HttpMethod]
      if (!matchedOperation) {
        return {
          isError: true,
          message: `Method '${method.toUpperCase()}' not found for path '${endpointPath}'.`,
        }
      }

      operation = matchedOperation

      endpointOperationId = operation.operationId
    }

    const resolvedOperation = resolveOperationComponents(operation, spec)

    inlineSchemas = extractInlineSchemas(
      resolvedOperation,
      endpointOperationId,
      endpointMethod as HttpMethod | undefined,
      endpointPath,
    )

    rootSchemaNames = [...new Set([
      ...collectRefs(resolvedOperation.requestBody),
      ...collectRefs(resolvedOperation.responses),
      ...collectRefs(resolvedOperation.parameters),
    ])]

    if (rootSchemaNames.length === 0 && inlineSchemas.length === 0) {
      return {
        isError: true,
        message: `No schema references or inline schemas found for endpoint '${endpointMethod!.toUpperCase()} ${endpointPath}'.`,
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
  for (const inlineSchema of inlineSchemas) {
    for (const refName of collectRefs(inlineSchema.schema)) {
      addTransitiveDeps(refName, depGraph, allSchemaNames)
    }
  }

  const missingDeps = findMissingSchemas([...allSchemaNames], spec.schemas)
  if (missingDeps.length > 0) {
    return {
      isError: true,
      message: buildMissingSchemaMessage(missingDeps, spec.schemas),
    }
  }

  const sortedNames = topologicalSort([...allSchemaNames], depGraph)
  const referencedSchemas = sortedNames.map(name => ({
    name,
    schema: spec.schemas[name],
  }))
  const generatedSchemas = [...referencedSchemas, ...inlineSchemas]
  const code = generateFileContent(
    generatedSchemas,
    {
      ...spec.schemas,
      ...Object.fromEntries(inlineSchemas.map(schema => [schema.name, schema.schema])),
    },
  )

  const headerLines: string[] = []
  if (hasSchemas) {
    headerLines.push(`// Generated from schemas: ${sortedNames.join(', ')}`)
  } else {
    const includedNames = [...sortedNames, ...inlineSchemas.map(schema => schema.name)]
    const operationIdPrefix = endpointOperationId ? `${endpointOperationId} ` : ''
    headerLines.push(`// Generated from endpoint: ${operationIdPrefix}${endpointMethod!.toUpperCase()} ${endpointPath}`)
    headerLines.push(`// Includes schemas: ${includedNames.join(', ')}`)
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

function resolveOperationComponents(operation: OperationObject, spec: ParsedSpec): OperationObject {
  return {
    ...operation,
    parameters: resolveNonSchemaComponentRefs(operation.parameters, spec.rawSpec) as unknown[] | undefined,
    requestBody: resolveNonSchemaComponentRefs(operation.requestBody, spec.rawSpec),
    responses: resolveNonSchemaComponentRefs(operation.responses, spec.rawSpec) as Record<string, unknown> | undefined,
  }
}
