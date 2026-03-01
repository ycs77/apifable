type Schema = Record<string, unknown>

export function schemaToTs(
  name: string,
  schema: unknown,
  allSchemas: Record<string, unknown>,
): string {
  const s = schema as Schema
  const tsName = toValidIdentifier(name)
  const lines: string[] = []

  const description = s.description as string | undefined
  if (description) {
    lines.push(formatJsDoc(description))
  }

  // String enum
  if (s.type === 'string' && Array.isArray(s.enum)) {
    const members = (s.enum as string[]).map(v => `'${escapeStringLiteral(v)}'`).join(' | ')
    lines.push(`export type ${tsName} = ${members}`)
    return lines.join('\n')
  }

  // Number enum
  if ((s.type === 'integer' || s.type === 'number') && Array.isArray(s.enum)) {
    const members = (s.enum as number[]).join(' | ')
    lines.push(`export type ${tsName} = ${members}`)
    return lines.join('\n')
  }

  // allOf
  if (Array.isArray(s.allOf)) {
    const allOf = s.allOf as Schema[]
    const refTypes: string[] = []
    const inlineProps: Schema[] = []

    for (const item of allOf) {
      if (item.$ref) {
        refTypes.push(extractRefName(item.$ref as string))
      } else if (item.type === 'object' || item.properties) {
        inlineProps.push(item)
      } else {
        inlineProps.push(item)
      }
    }

    // If all refs and at most one inline props block, use extends
    if (refTypes.length > 0 && inlineProps.length <= 1) {
      const merged = inlineProps.length === 1 ? inlineProps[0] : {}
      const props = renderProperties(merged, allSchemas)
      lines.push(`export interface ${tsName} extends ${refTypes.join(', ')} {`)
      for (const p of props) {
        lines.push(p)
      }
      lines.push('}')
      return lines.join('\n')
    }

    // Fallback to intersection type
    const parts: string[] = [...refTypes]
    for (const item of inlineProps) {
      if (item.properties || item.additionalProperties) {
        const props = renderProperties(item, allSchemas)
        parts.push(`{\n${props.join('\n')}\n}`)
      } else {
        parts.push(resolveTypeString(item, allSchemas))
      }
    }
    lines.push(`export type ${tsName} = ${parts.join(' & ') || 'unknown'}`)
    return lines.join('\n')
  }

  // oneOf / anyOf
  if (Array.isArray(s.oneOf) || Array.isArray(s.anyOf)) {
    const variants = (s.oneOf ?? s.anyOf) as Schema[]
    const members = variants.map(v => resolveTypeString(v, allSchemas))
    lines.push(`export type ${tsName} = ${members.join(' | ')}`)
    return lines.join('\n')
  }

  // Object with properties
  if (s.type === 'object' || s.properties) {
    const props = renderProperties(s, allSchemas)
    lines.push(`export interface ${tsName} {`)
    for (const p of props) {
      lines.push(p)
    }
    lines.push('}')
    return lines.join('\n')
  }

  // Fallback: simple type alias
  const tsType = resolveTypeString(s, allSchemas)
  lines.push(`export type ${tsName} = ${tsType}`)
  return lines.join('\n')
}

export function generateFileContent(
  schemas: {
    name: string
    schema: unknown
  }[],
  allSchemas: Record<string, unknown>,
  imports?: Map<string, string[]>,
): string {
  const parts: string[] = []

  if (imports && imports.size > 0) {
    const importLines: string[] = []
    for (const [path, types] of [...imports.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      const sorted = [...types].sort()
      importLines.push(`import type { ${sorted.join(', ')} } from '${path}'`)
    }
    parts.push(importLines.join('\n'))
  }

  for (const { name, schema } of schemas) {
    parts.push(schemaToTs(name, schema, allSchemas))
  }

  return `${parts.join('\n\n')}\n`
}

function renderProperties(schema: Schema, allSchemas: Record<string, unknown>): string[] {
  const properties = (schema.properties ?? {}) as Record<string, Schema>
  const required = new Set((schema.required ?? []) as string[])
  const hasNamedProperties = Object.keys(properties).length > 0
  const lines: string[] = []

  for (const [key, prop] of Object.entries(properties)) {
    const desc = prop.description as string | undefined
    if (desc) {
      lines.push(formatJsDoc(desc, '  '))
    }
    const optional = required.has(key) ? '' : '?'
    const tsType = resolveTypeString(prop, allSchemas)
    // Array-type nullability (e.g. ["string", "null"]) is already handled by resolveTypeString
    const alreadyNullableViaTypeArray = Array.isArray(prop.type) && (prop.type as string[]).includes('null')
    const nullable = !alreadyNullableViaTypeArray && isNullable(prop) ? ' | null' : ''
    lines.push(`  ${key}${optional}: ${tsType}${nullable}`)
  }

  if (schema.additionalProperties === true) {
    lines.push('  [key: string]: unknown')
  } else if (
    typeof schema.additionalProperties === 'object' &&
    schema.additionalProperties !== null
  ) {
    const valueType = hasNamedProperties
      ? 'unknown'
      : resolveTypeString(schema.additionalProperties as Schema, allSchemas)
    lines.push(`  [key: string]: ${valueType}`)
  }

  return lines
}

function resolveTypeString(schema: Schema, allSchemas: Record<string, unknown>): string {
  if (!schema || typeof schema !== 'object') return 'unknown'

  // $ref
  if (schema.$ref) {
    return extractRefName(schema.$ref as string)
  }

  // allOf inline
  if (Array.isArray(schema.allOf)) {
    const parts = (schema.allOf as Schema[]).map(s => resolveTypeString(s, allSchemas))
    return parts.join(' & ')
  }

  // oneOf / anyOf inline
  if (Array.isArray(schema.oneOf) || Array.isArray(schema.anyOf)) {
    const variants = (schema.oneOf ?? schema.anyOf) as Schema[]
    const members = variants.map(v => resolveTypeString(v, allSchemas))
    return members.length > 1 ? `(${members.join(' | ')})` : members[0]
  }

  // Array
  if (schema.type === 'array') {
    const items = schema.items as Schema | undefined
    if (items) {
      const itemType = resolveTypeString(items, allSchemas)
      const needsParens = itemType.includes('|') || itemType.includes('&')
      return needsParens ? `(${itemType})[]` : `${itemType}[]`
    }
    return 'unknown[]'
  }

  // Primitives
  if (schema.type === 'string') {
    if (Array.isArray(schema.enum)) {
      return (schema.enum as string[]).map(v => `'${escapeStringLiteral(v)}'`).join(' | ')
    }
    return 'string'
  }
  if (schema.type === 'integer' || schema.type === 'number') {
    if (Array.isArray(schema.enum)) {
      return (schema.enum as number[]).join(' | ')
    }
    return 'number'
  }
  if (schema.type === 'boolean') return 'boolean'

  // Inline object
  if (schema.type === 'object' || schema.properties) {
    const props = renderProperties(schema, allSchemas)
    if (props.length === 0) {
      if (schema.additionalProperties) {
        return `Record<string, ${resolveTypeString(schema.additionalProperties as Schema, allSchemas)}>`
      }
      return 'Record<string, unknown>'
    }
    return `{\n${props.join('\n')}\n}`
  }

  // Type array (e.g. ["string", "null"])
  if (Array.isArray(schema.type)) {
    const hasNull = (schema.type as string[]).includes('null')
    const types = (schema.type as string[]).filter(t => t !== 'null')
    const tsTypes = types.map(t => mapPrimitiveType(t))
    const base = tsTypes.length > 1 ? tsTypes.join(' | ') : tsTypes[0] ?? 'unknown'
    return hasNull ? `${base} | null` : base
  }

  return 'unknown'
}

function isNullable(schema: Schema): boolean {
  if (schema.nullable === true) return true
  if (Array.isArray(schema.type) && (schema.type as string[]).includes('null')) return true
  return false
}

function extractRefName(ref: string): string {
  const match = ref.match(/^#\/components\/schemas\/(.+)$/)
  return match ? toValidIdentifier(match[1]) : ref
}

function mapPrimitiveType(type: string): string {
  switch (type) {
    case 'string': return 'string'
    case 'integer':
    case 'number': return 'number'
    case 'boolean': return 'boolean'
    case 'object': return 'Record<string, unknown>'
    case 'array': return 'unknown[]'
    default: return 'unknown'
  }
}

function escapeStringLiteral(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, '\\\'')
}

export function toValidIdentifier(name: string): string {
  let result = name.replace(/[^\w$]/g, '_')
  if (/^\d/.test(result)) {
    result = `_${result}`
  }
  return result || '_'
}

function formatJsDoc(text: string, indent = ''): string {
  const escaped = text.replace(/\*\//g, '*\\/')
  const lines = escaped.split('\n')
  if (lines.length === 1) {
    return `${indent}/** ${escaped} */`
  }
  return [
    `${indent}/**`,
    ...lines.map(l => `${indent} * ${l}`),
    `${indent} */`,
  ].join('\n')
}
