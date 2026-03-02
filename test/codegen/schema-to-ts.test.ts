import { describe, expect, it } from 'vitest'
import { generateFileContent, schemaToTs, toValidIdentifier } from '../../src/codegen/schema-to-ts'

describe('schema-to-ts', () => {
  it('converts invalid names to valid TypeScript identifiers', () => {
    expect(toValidIdentifier('123-user.name')).toBe('_123_user_name')
    expect(toValidIdentifier('')).toBe('_')
  })

  it('generates string enum aliases with escaped literals', () => {
    const output = schemaToTs(
      'Status',
      { type: 'string', enum: ['ok', 'it\'s', 'a\\b'] },
      {},
    )

    expect(output).toBe('export type Status = \'ok\' | \'it\\\'s\' | \'a\\\\b\'')
  })

  it('generates allOf as interface extends when refs are present', () => {
    const output = schemaToTs(
      'AdminUser',
      {
        allOf: [
          { $ref: '#/components/schemas/BaseUser' },
          {
            type: 'object',
            properties: {
              role: { type: 'string' },
            },
            required: ['role'],
          },
        ],
      },
      {},
    )

    expect(output).toContain('export interface AdminUser extends BaseUser {')
    expect(output).toContain('  role: string')
    expect(output).toContain('}')
  })

  it('renders additionalProperties as unknown when named properties exist', () => {
    const output = schemaToTs(
      'Meta',
      {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        additionalProperties: {
          type: 'string',
        },
      },
      {},
    )

    expect(output).toContain('  id?: string')
    expect(output).toContain('  [key: string]: unknown')
  })

  it('renders nullable true with type array as union with null', () => {
    const output = schemaToTs(
      'NullablePayload',
      {
        type: 'object',
        properties: {
          nickname: {
            nullable: true,
            type: ['string'],
          },
        },
      },
      {},
    )

    expect(output).toContain('  nickname?: string | null')
  })

  it('escapes closing token in JSDoc description text', () => {
    const output = schemaToTs(
      'DangerousComment',
      {
        description: 'line with */ token',
        type: 'string',
      },
      {},
    )

    expect(output).toContain('/** line with *\\/ token */')
    expect(output).toContain('export type DangerousComment = string')
  })

  it('sorts import paths and imported types in generated file content', () => {
    const output = generateFileContent(
      [
        {
          name: 'User',
          schema: {
            type: 'object',
            properties: {
              id: { type: 'string' },
            },
          },
        },
      ],
      {},
      new Map([
        ['./b', ['Zeta', 'Alpha']],
        ['./a', ['Two', 'One']],
      ]),
    )

    expect(output).toContain('import type { One, Two } from \'./a\'')
    expect(output).toContain('import type { Alpha, Zeta } from \'./b\'')
    expect(output.indexOf('from \'./a\'')).toBeLessThan(output.indexOf('from \'./b\''))
    expect(output.endsWith('\n')).toBe(true)
  })

  it('generates top-level nullable type alias', () => {
    const output = schemaToTs(
      'Foo',
      {
        type: 'string',
        nullable: true,
      },
      {},
    )

    expect(output).toBe('export type Foo = string | null')
  })

  it('generates nullable array items in object properties', () => {
    const output = schemaToTs(
      'Foo',
      {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'string',
              nullable: true,
            },
          },
        },
      },
      {},
    )

    expect(output).toContain('  items?: (string | null)[]')
  })

  it('generates nullable ref wrapped by allOf', () => {
    const output = schemaToTs(
      'Foo',
      {
        allOf: [
          { $ref: '#/components/schemas/Bar' },
        ],
        nullable: true,
      },
      {},
    )

    expect(output).toBe('export type Foo = Bar | null')
  })

  it('generates nullable integer as number | null', () => {
    const output = schemaToTs(
      'Foo',
      {
        type: 'integer',
        nullable: true,
      },
      {},
    )

    expect(output).toBe('export type Foo = number | null')
  })

  it('does not duplicate null when type array already includes null', () => {
    const output = schemaToTs(
      'Foo',
      {
        type: 'object',
        properties: {
          value: {
            type: ['string', 'null'],
            nullable: true,
          },
        },
      },
      {},
    )

    expect(output).toContain('  value?: string | null')
    expect(output).not.toContain('  value?: string | null | null')
  })
})
