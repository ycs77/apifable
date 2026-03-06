import type { HttpMethod, OperationObject } from '../types'

interface InlineSchemaEntry {
  name: string
  schema: unknown
}

export function extractInlineSchemas(
  operation: OperationObject,
  operationId?: string,
  method?: HttpMethod,
  path?: string,
): InlineSchemaEntry[] {
  const baseName = buildInlineSchemaBaseName(operationId, method, path)
  const inlineSchemas: InlineSchemaEntry[] = []

  const requestSchema = getJsonSchema(
    operation.requestBody as { content?: Record<string, { schema?: unknown }> } | undefined,
  )
  if (isInlineSchema(requestSchema)) {
    inlineSchemas.push({
      name: `${baseName}Request`,
      schema: requestSchema,
    })
  }

  const responseSchema = getFirstSuccessJsonSchema(operation.responses)
  if (isInlineSchema(responseSchema)) {
    inlineSchemas.push({
      name: `${baseName}Response`,
      schema: responseSchema,
    })
  }

  return inlineSchemas
}

function buildInlineSchemaBaseName(
  operationId?: string,
  method?: HttpMethod,
  path?: string,
): string {
  if (operationId && operationId.trim() !== '') {
    return toPascalCase(operationId)
  }

  const methodPart = method ? toPascalCase(method) : 'Operation'
  const pathPart = path
    ? path
        .split('/')
        .filter(Boolean)
        .map(segment => segment.replace(/[{}]/g, ''))
        .map(toPascalCase)
        .join('')
    : ''

  return `${methodPart}${pathPart}` || 'Operation'
}

function getJsonSchema(value: { content?: Record<string, { schema?: unknown }> } | undefined): unknown {
  return value?.content?.['application/json']?.schema
}

function getFirstSuccessJsonSchema(responses: Record<string, unknown> | undefined): unknown {
  if (!responses) return undefined

  const firstSuccess = Object.entries(responses)
    .filter(([statusCode]) => /^2\d\d$/.test(statusCode))
    .sort((a, b) => a[0].localeCompare(b[0]))[0]?.[1] as { content?: Record<string, { schema?: unknown }> } | undefined

  return getJsonSchema(firstSuccess)
}

function isInlineSchema(schema: unknown): schema is Record<string, unknown> {
  return typeof schema === 'object' && schema !== null && typeof (schema as { $ref?: unknown }).$ref !== 'string'
}

function toPascalCase(value: string): string {
  const parts = value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[^A-Z0-9]+/i)
    .filter(Boolean)

  return parts.map(part => `${part[0]!.toUpperCase()}${part.slice(1)}`).join('')
}
