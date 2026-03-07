import type { OpenAPIObject } from '../../src/types'
import { describe, expect, it } from 'vitest'
import { resolveRefs } from '../../src/spec/ref-resolver'

describe('resolveRefs', () => {
  const rawSpec: OpenAPIObject = {
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
            name: { type: 'string' },
          },
        },
        A: {
          type: 'object',
          properties: {
            b: { $ref: '#/components/schemas/B' },
          },
        },
        B: {
          type: 'object',
          properties: {
            a: { $ref: '#/components/schemas/A' },
          },
        },
      },
      responses: {
        UserResponse: {
          description: 'OK',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/User' },
            },
          },
        },
      },
      parameters: {
        TraceId: {
          name: 'X-Trace-Id',
          in: 'header',
          schema: { type: 'string' },
        },
      },
    },
  }

  it('returns primitive values unchanged', () => {
    expect(resolveRefs('value', rawSpec)).toBe('value')
    expect(resolveRefs(123, rawSpec)).toBe(123)
    expect(resolveRefs(null, rawSpec)).toBeNull()
  })

  it('resolves nested refs inside objects and arrays', () => {
    const input = {
      users: [
        { $ref: '#/components/schemas/User' },
      ],
    }

    const result = resolveRefs(input, rawSpec)

    expect(result).toEqual({
      users: [
        {
          type: 'object',
          properties: {
            profile: {
              type: 'object',
              properties: {
                name: { type: 'string' },
              },
            },
          },
        },
      ],
    })
  })

  it('resolves common internal component refs beyond schemas', () => {
    expect(resolveRefs({ $ref: '#/components/responses/UserResponse' }, rawSpec)).toEqual({
      description: 'OK',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              profile: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                },
              },
            },
          },
        },
      },
    })

    expect(resolveRefs({ $ref: '#/components/parameters/TraceId' }, rawSpec)).toEqual({
      name: 'X-Trace-Id',
      in: 'header',
      schema: { type: 'string' },
    })
  })

  it('keeps unsupported or missing refs unchanged', () => {
    expect(resolveRefs({ $ref: '#/paths/~1users/get' }, rawSpec)).toEqual({
      $ref: '#/paths/~1users/get',
    })
    expect(resolveRefs({ $ref: '#/components/responses/NotFound' }, rawSpec)).toEqual({
      $ref: '#/components/responses/NotFound',
    })
  })

  it('stops circular schema expansion with short $ref marker', () => {
    const result = resolveRefs({ $ref: '#/components/schemas/A' }, rawSpec)

    expect(result).toEqual({
      type: 'object',
      properties: {
        b: {
          type: 'object',
          properties: {
            a: { $ref: 'A' },
          },
        },
      },
    })
  })
})
