import { describe, expect, it } from 'vitest'
import { getSchema } from '../../src/tools/get-schema'
import { createMockParsedSpec } from '../helpers'

describe('getSchema', () => {
  it('returns error when schema is missing', () => {
    const spec = createMockParsedSpec({
      schemas: { User: { type: 'object' } },
    })
    const result = getSchema(spec, 'UnknownSchema')

    expect(result).toEqual({
      isError: true,
      message: 'Schema \'UnknownSchema\' not found.',
    })
  })

  it('returns resolved schema when schema exists', () => {
    const spec = createMockParsedSpec({
      schemas: {
        User: {
          type: 'object',
          properties: {
            profile: { $ref: '#/components/schemas/Profile' },
          },
        },
        Profile: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
      },
      rawSpec: {
        components: {
          schemas: {
            User: {
              type: 'object',
              properties: {
                profile: { $ref: '#/components/schemas/Profile' },
              },
            },
            Profile: {
              type: 'object',
              properties: {
                id: { type: 'string' },
              },
            },
          },
        },
      },
    })

    const result = getSchema(spec, 'User')

    expect(result).toEqual({
      name: 'User',
      schema: {
        type: 'object',
        properties: {
          profile: {
            type: 'object',
            properties: {
              id: { type: 'string' },
            },
          },
        },
      },
    })
  })
})
