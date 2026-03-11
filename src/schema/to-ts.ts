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
    if (refTypes.length > 0 && inlineProps.length <= 1 && s.nullable !== true) {
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
    lines.push(`export type ${tsName} = ${resolveTypeString(s, allSchemas)}`)
    return lines.join('\n')
  }

  // oneOf / anyOf
  if (Array.isArray(s.oneOf) || Array.isArray(s.anyOf)) {
    const variants = (s.oneOf ?? s.anyOf) as Schema[]
    const discriminator = s.discriminator as { propertyName: string, mapping?: Record<string, string> } | undefined
    let members: string[]
    if (discriminator) {
      const { propertyName, mapping } = discriminator
      members = variants.map(v => {
        if (!v.$ref) return resolveTypeString(v, allSchemas)
        const value = resolveDiscriminatorValue(v.$ref as string, mapping)
        const variantType = resolveTypeString(v, allSchemas)
        return value !== undefined
          ? `(${variantType} & { ${propertyName}: '${escapeStringLiteral(value)}' })`
          : variantType
      })
    } else {
      members = variants.map(v => resolveTypeString(v, allSchemas))
    }
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

    for (const [path, types] of [...imports.entries()].toSorted((a, b) => a[0].localeCompare(b[0]))) {
      const sorted = types.toSorted()
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
    lines.push(`  ${key}${optional}: ${tsType}`)
  }

  if (schema.additionalProperties === true) {
    lines.push('  [key: string]: unknown')
  } else if (
    typeof schema.additionalProperties === 'object' &&
    schema.additionalProperties !== null
  ) {
    const addlType = resolveTypeString(schema.additionalProperties as Schema, allSchemas)
    if (hasNamedProperties) {
      const typeSet = new Set<string>([addlType])
      for (const [key, prop] of Object.entries(properties)) {
        typeSet.add(resolveTypeString(prop, allSchemas))
        if (!required.has(key)) typeSet.add('undefined')
      }
      lines.push(`  [key: string]: ${[...typeSet].join(' | ')}`)
    } else {
      lines.push(`  [key: string]: ${addlType}`)
    }
  }

  return lines
}

function resolveTypeString(schema: Schema, allSchemas: Record<string, unknown>): string {
  if (!schema || typeof schema !== 'object') return 'unknown'

  let baseType = 'unknown'

  // $ref
  if (schema.$ref) {
    baseType = extractRefName(schema.$ref as string)
    return appendNullable(baseType, schema)
  }

  // allOf inline
  if (Array.isArray(schema.allOf)) {
    const parts = (schema.allOf as Schema[]).map(s => resolveTypeString(s, allSchemas))
    baseType = parts.join(' & ')
    return appendNullable(baseType, schema)
  }

  // oneOf / anyOf inline
  if (Array.isArray(schema.oneOf) || Array.isArray(schema.anyOf)) {
    const variants = (schema.oneOf ?? schema.anyOf) as Schema[]
    const members = variants.map(v => resolveTypeString(v, allSchemas))
    baseType = members.length > 1 ? `(${members.join(' | ')})` : members[0]
    return appendNullable(baseType, schema)
  }

  // Array
  if (schema.type === 'array') {
    const items = schema.items as Schema | undefined
    if (items) {
      const itemType = resolveTypeString(items, allSchemas)
      const needsParens = itemType.includes('|') || itemType.includes('&')
      baseType = needsParens ? `(${itemType})[]` : `${itemType}[]`
      return appendNullable(baseType, schema)
    }
    baseType = 'unknown[]'
    return appendNullable(baseType, schema)
  }

  // Primitives
  if (schema.type === 'string') {
    if (Array.isArray(schema.enum)) {
      baseType = (schema.enum as string[]).map(v => `'${escapeStringLiteral(v)}'`).join(' | ')
      return appendNullable(baseType, schema)
    }
    baseType = 'string'
    return appendNullable(baseType, schema)
  }
  if (schema.type === 'integer' || schema.type === 'number') {
    if (Array.isArray(schema.enum)) {
      baseType = (schema.enum as number[]).join(' | ')
      return appendNullable(baseType, schema)
    }
    baseType = 'number'
    return appendNullable(baseType, schema)
  }
  if (schema.type === 'boolean') {
    baseType = 'boolean'
    return appendNullable(baseType, schema)
  }

  // Inline object
  if (schema.type === 'object' || schema.properties) {
    const props = renderProperties(schema, allSchemas)
    if (props.length === 0) {
      if (schema.additionalProperties) {
        baseType = `Record<string, ${resolveTypeString(schema.additionalProperties as Schema, allSchemas)}>`
        return appendNullable(baseType, schema)
      }
      baseType = 'Record<string, unknown>'
      return appendNullable(baseType, schema)
    }
    baseType = `{\n${props.join('\n')}\n}`
    return appendNullable(baseType, schema)
  }

  // Type array (e.g. ["string", "null"])
  if (Array.isArray(schema.type)) {
    const hasNull = (schema.type as string[]).includes('null')
    const types = (schema.type as string[]).filter(t => t !== 'null')
    const tsTypes = types.map(t => mapPrimitiveType(t))
    const base = tsTypes.length > 1 ? tsTypes.join(' | ') : tsTypes[0] ?? 'unknown'
    baseType = hasNull ? `${base} | null` : base
    return appendNullable(baseType, schema)
  }

  return appendNullable(baseType, schema)
}

function appendNullable(typeString: string, schema: Schema): string {
  const hasNullInTypeArray = Array.isArray(schema.type) && (schema.type as string[]).includes('null')
  const shouldBeNullable = schema.nullable === true || hasNullInTypeArray
  const alreadyNullable = /\|\s*null\b/.test(typeString)

  if (shouldBeNullable && !alreadyNullable) {
    return `${typeString} | null`
  }

  return typeString
}

function extractRefName(ref: string): string {
  const match = ref.match(/^#\/components\/schemas\/(.+)$/)
  return match ? toValidIdentifier(match[1]) : ref
}

function resolveDiscriminatorValue(ref: string, mapping?: Record<string, string>): string | undefined {
  if (mapping) {
    for (const [key, value] of Object.entries(mapping)) {
      if (value === ref) return key
    }
  }
  const match = ref.match(/^#\/components\/schemas\/(.+)$/)
  return match ? match[1] : undefined
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
