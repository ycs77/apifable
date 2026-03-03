import type { HttpMethod, ParsedSpec } from '../types'
import { topologicalSort } from '../codegen/generate'
import { generateFileContent } from '../codegen/schema-to-ts'
import { addTransitiveDeps, buildDependencyGraph, collectRefs } from '../codegen/tag-classifier'
import { findOperationByOperationId } from './find-operation'

interface GenerateTypesInput {
  schemas?: string[]
  method?: string
  path?: string
  operationId?: string
}

interface GenerateTypesSuccess {
  code: string
}

interface GenerateTypesError {
  isError: true
  message: string
}

export function generateTypesTool(
  spec: ParsedSpec,
  input: GenerateTypesInput,
): GenerateTypesSuccess | GenerateTypesError {
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

  if (hasSchemas) {
    rootSchemaNames = [...new Set(input.schemas)]
    const missing = findMissingSchemas(rootSchemaNames, spec.schemas)
    if (missing.length > 0) {
      return {
        isError: true,
        message: `Schema not found: ${missing.join(', ')}.`,
      }
    }
  } else {
    let operation
    let normalizedMethod: string
    let path: string

    if (hasOperationId) {
      const found = findOperationByOperationId(spec, input.operationId!)
      if (!found) {
        return {
          isError: true,
          message: `Operation '${input.operationId}' not found in spec.`,
        }
      }
      operation = found.operation
      normalizedMethod = found.method
      path = found.path
    } else {
      const method = input.method!
      path = input.path!
      normalizedMethod = method.toLowerCase() as HttpMethod
      const pathItem = spec.rawSpec.paths?.[path]

      if (!pathItem) {
        return {
          isError: true,
          message: `Path '${path}' not found in spec.`,
        }
      }

      operation = pathItem[normalizedMethod as HttpMethod]
      if (!operation) {
        return {
          isError: true,
          message: `Method '${method.toUpperCase()}' not found for path '${path}'.`,
        }
      }
    }

    rootSchemaNames = [...new Set([
      ...collectRefs(operation.requestBody),
      ...collectRefs(operation.responses),
      ...collectRefs(operation.parameters),
    ])]

    if (rootSchemaNames.length === 0) {
      return {
        isError: true,
        message: `No schema references found for endpoint '${normalizedMethod.toUpperCase()} ${path}'.`,
      }
    }

    const missing = findMissingSchemas(rootSchemaNames, spec.schemas)
    if (missing.length > 0) {
      return {
        isError: true,
        message: `Schema not found: ${missing.join(', ')}.`,
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
      message: `Schema not found: ${missingDeps.join(', ')}.`,
    }
  }

  const sortedNames = topologicalSort([...allSchemaNames], depGraph)
  const schemas = sortedNames.map(name => ({
    name,
    schema: spec.schemas[name],
  }))
  const code = generateFileContent(schemas, spec.schemas)

  return { code }
}

function findMissingSchemas(
  names: string[],
  schemas: Record<string, unknown>,
): string[] {
  return names.filter(name => !(name in schemas)).sort((a, b) => a.localeCompare(b))
}
