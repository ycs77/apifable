import { describe, expect, it } from 'vitest'
import { generateFileContent, schemaToTs, toValidIdentifier } from '../../src/schema/to-ts.ts'

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

    expect(output).toBe([
      'export interface AdminUser extends BaseUser {',
      '  role: string',
      '}',
    ].join('\n'))
  })

  it('renders additionalProperties with precise union type when named properties exist', () => {
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

    expect(output).toBe([
      'export interface Meta {',
      '  id?: string',
      '  [key: string]: string | undefined',
      '}',
    ].join('\n'))
  })

  it('renders additionalProperties with heterogeneous property types as union index signature', () => {
    const output = schemaToTs(
      'Mixed',
      {
        type: 'object',
        properties: {
          count: { type: 'integer' },
          label: { type: 'string' },
        },
        required: ['count'],
        additionalProperties: {
          type: 'boolean',
        },
      },
      {},
    )

    expect(output).toBe([
      'export interface Mixed {',
      '  count: number',
      '  label?: string',
      '  [key: string]: boolean | number | string | undefined',
      '}',
    ].join('\n'))
  })

  it('renders additionalProperties type directly when no named properties (regression)', () => {
    const output = schemaToTs(
      'Attrs',
      {
        type: 'object',
        additionalProperties: {
          type: 'number',
        },
      },
      {},
    )

    expect(output).toBe([
      'export interface Attrs {',
      '  [key: string]: number',
      '}',
    ].join('\n'))
  })

  it('generates discriminated union with explicit mapping', () => {
    const output = schemaToTs(
      'Pet',
      {
        oneOf: [
          { $ref: '#/components/schemas/Cat' },
          { $ref: '#/components/schemas/Dog' },
        ],
        discriminator: {
          propertyName: 'petType',
          mapping: {
            cat: '#/components/schemas/Cat',
            dog: '#/components/schemas/Dog',
          },
        },
      },
      {},
    )

    expect(output).toBe(
      'export type Pet = (Cat & { petType: \'cat\' }) | (Dog & { petType: \'dog\' })',
    )
  })

  it('generates discriminated union without mapping by inferring value from $ref', () => {
    const output = schemaToTs(
      'Shape',
      {
        anyOf: [
          { $ref: '#/components/schemas/Circle' },
          { $ref: '#/components/schemas/Square' },
        ],
        discriminator: {
          propertyName: 'kind',
        },
      },
      {},
    )

    expect(output).toBe(
      'export type Shape = (Circle & { kind: \'Circle\' }) | (Square & { kind: \'Square\' })',
    )
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

    expect(output).toBe([
      'export interface NullablePayload {',
      '  nickname?: string | null',
      '}',
    ].join('\n'))
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

    expect(output).toBe([
      '/** line with *\\/ token */',
      'export type DangerousComment = string',
    ].join('\n'))
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

    expect(output).toBe([
      'import type { One, Two } from \'./a\'',
      'import type { Alpha, Zeta } from \'./b\'',
      '',
      'export interface User {',
      '  id?: string',
      '}',
      '',
    ].join('\n'))
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

    expect(output).toBe([
      'export interface Foo {',
      '  items?: (string | null)[]',
      '}',
    ].join('\n'))
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

    expect(output).toBe([
      'export interface Foo {',
      '  value?: string | null',
      '}',
    ].join('\n'))
  })
})
