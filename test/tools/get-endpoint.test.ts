import { describe, expect, it } from 'vitest'
import { getEndpoint } from '../../src/tools/get-endpoint'
import { createMockParsedSpec } from '../helpers'

describe('getEndpoint', () => {
  it('returns path-not-found error when path does not exist', () => {
    const spec = createMockParsedSpec({ rawSpec: { paths: {} } })

    const result = getEndpoint(spec, 'get', '/missing')

    expect(result).toEqual({
      isError: true,
      message: 'Path \'/missing\' not found in spec.',
    })
  })

  it('returns method-not-found error when method does not exist for path', () => {
    const spec = createMockParsedSpec({
      rawSpec: {
        paths: {
          '/users': {
            get: {
              operationId: 'listUsers',
            },
          },
        },
      },
    })

    const result = getEndpoint(spec, 'post', '/users')

    expect(result).toEqual({
      isError: true,
      message: 'Method \'POST\' not found for path \'/users\'.',
    })
  })

  it('returns endpoint details with resolved refs', () => {
    const spec = createMockParsedSpec({
      rawSpec: {
        paths: {
          '/users': {
            post: {
              operationId: 'createUser',
              summary: 'Create user',
              description: 'Create one user',
              tags: ['users'],
              parameters: [
                {
                  name: 'X-Trace-Id',
                  in: 'header',
                  schema: { type: 'string' },
                },
              ],
              requestBody: {
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/CreateUserRequest' },
                  },
                },
              },
              responses: {
                201: {
                  content: {
                    'application/json': {
                      schema: { $ref: '#/components/schemas/User' },
                    },
                  },
                },
              },
            },
          },
        },
        components: {
          schemas: {
            CreateUserRequest: {
              type: 'object',
              properties: {
                name: { type: 'string' },
              },
            },
            User: {
              type: 'object',
              properties: {
                id: { type: 'string' },
              },
            },
          },
        },
      },
    })

    const result = getEndpoint(spec, 'POST', '/users')

    expect(result).toEqual({
      method: 'post',
      path: '/users',
      operationId: 'createUser',
      summary: 'Create user',
      description: 'Create one user',
      tags: ['users'],
      parameters: [
        {
          name: 'X-Trace-Id',
          in: 'header',
          schema: { type: 'string' },
        },
      ],
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string' },
              },
            },
          },
        },
      },
      responses: {
        201: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                },
              },
            },
          },
        },
      },
    })
  })
})
