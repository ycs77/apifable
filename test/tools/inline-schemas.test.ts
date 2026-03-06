import { describe, expect, it } from 'vitest'
import { extractInlineSchemas } from '../../src/tools/inline-schemas'

describe('extractInlineSchemas', () => {
  it('uses operationId-based names for inline request and response schemas', () => {
    const result = extractInlineSchemas(
      {
        operationId: 'listUsers',
        requestBody: {
          content: {
            'application/json': {
              schema: { type: 'object' },
            },
          },
        },
        responses: {
          200: {
            content: {
              'application/json': {
                schema: { type: 'object' },
              },
            },
          },
        },
      },
      'listUsers',
      'get',
      '/users',
    )

    expect(result.map(item => item.name)).toEqual(['ListUsersRequest', 'ListUsersResponse'])
  })

  it('uses method and normalized path when operationId is unavailable', () => {
    const result = extractInlineSchemas(
      {
        responses: {
          200: {
            content: {
              'application/json': {
                schema: { type: 'object' },
              },
            },
          },
        },
      },
      undefined,
      'get',
      '/users/{id}/posts',
    )

    expect(result.map(item => item.name)).toEqual(['GetUsersIdPostsResponse'])
  })

  it('ignores top-level $ref schemas', () => {
    const result = extractInlineSchemas(
      {
        requestBody: {
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/User' },
            },
          },
        },
      },
      'getUser',
      'get',
      '/users/{id}',
    )

    expect(result).toEqual([])
  })
})
