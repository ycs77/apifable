import { describe, expect, it } from 'vitest'
import { getEndpoint } from '../../src/tools/get-endpoint.ts'
import { createEmptyParsedSpec, createMockParsedSpec } from '../helpers.ts'

describe('getEndpoint', () => {
  describe('method + path mode', () => {
    it('returns path-not-found error when path does not exist', () => {
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

      const result = getEndpoint(spec, { method: 'get', path: '/missing' })

      expect(result).toEqual({
        isError: true,
        message: 'Path \'/missing\' not found in spec.',
      })
    })

    it('returns invalid-method error when method is unsupported', () => {
      const spec = createEmptyParsedSpec()

      const result = getEndpoint(spec, { method: 'fetch', path: '/users' })

      expect(result).toEqual({
        isError: true,
        message: 'Invalid HTTP method \'fetch\'. Use one of: get, post, put, patch, delete, head, options, trace.',
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

      const result = getEndpoint(spec, { method: 'post', path: '/users' })

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

      const result = getEndpoint(spec, { method: 'POST', path: '/users' })

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

    it('resolves common internal component refs in parameters and responses', () => {
      const spec = createMockParsedSpec({
        rawSpec: {
          paths: {
            '/users/{id}': {
              get: {
                operationId: 'getUser',
                parameters: [
                  { $ref: '#/components/parameters/UserId' },
                ],
                responses: {
                  200: { $ref: '#/components/responses/UserResponse' },
                },
              },
            },
          },
          components: {
            schemas: {
              User: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                },
              },
            },
            parameters: {
              UserId: {
                name: 'id',
                in: 'path',
                required: true,
                schema: { type: 'string' },
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
          },
        },
      })

      const result = getEndpoint(spec, { method: 'get', path: '/users/{id}' })

      expect(result).toEqual({
        method: 'get',
        path: '/users/{id}',
        operationId: 'getUser',
        summary: '',
        description: '',
        tags: [],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: undefined,
        responses: {
          200: {
            description: 'OK',
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

  describe('operationId mode', () => {
    it('returns endpoint details when operationId matches', () => {
      const spec = createMockParsedSpec({
        rawSpec: {
          paths: {
            '/users': {
              get: {
                operationId: 'listUsers',
                summary: 'List users',
                description: 'List all users',
                tags: ['users'],
                responses: {
                  200: {
                    description: 'OK',
                  },
                },
              },
            },
          },
        },
      })

      const result = getEndpoint(spec, { operationId: 'listUsers' })

      expect(result).toEqual({
        method: 'get',
        path: '/users',
        operationId: 'listUsers',
        summary: 'List users',
        description: 'List all users',
        tags: ['users'],
        parameters: undefined,
        requestBody: undefined,
        responses: {
          200: {
            description: 'OK',
          },
        },
      })
    })

    it('returns error when operationId is not found', () => {
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

      const result = getEndpoint(spec, { operationId: 'nonExistent' })

      expect(result).toEqual({
        isError: true,
        message: 'Operation \'nonExistent\' not found in spec.',
      })
    })

    it('suggests similar operationIds when operation is missing', () => {
      const spec = createMockParsedSpec({
        endpointIndex: [
          {
            method: 'get',
            path: '/users',
            operationId: 'listUsers',
            summary: 'List users',
            description: 'List all users',
            tags: ['users'],
          },
        ],
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

      const result = getEndpoint(spec, { operationId: 'listUser' })

      expect(result).toEqual({
        isError: true,
        message: 'Operation \'listUser\' not found in spec. Did you mean: listUsers?',
      })
    })
  })

  describe('security inheritance', () => {
    it('uses operation-level security over global security', () => {
      const spec = createMockParsedSpec({
        rawSpec: {
          security: [{ bearerAuth: [] }],
          paths: {
            '/users': {
              get: {
                operationId: 'listUsers',
                summary: 'List users',
                security: [{ apiKey: [] }],
                responses: {
                  200: { description: 'OK' },
                },
              },
            },
          },
        },
      })

      const result = getEndpoint(spec, { method: 'get', path: '/users' })

      expect(result).toHaveProperty('security', [{ apiKey: [] }])
    })

    it('falls back to global security when operation has none', () => {
      const spec = createMockParsedSpec({
        rawSpec: {
          security: [{ bearerAuth: [] }],
          paths: {
            '/users': {
              get: {
                operationId: 'listUsers',
                summary: 'List users',
                responses: {
                  200: { description: 'OK' },
                },
              },
            },
          },
        },
      })

      const result = getEndpoint(spec, { method: 'get', path: '/users' })

      expect(result).toHaveProperty('security', [{ bearerAuth: [] }])
    })

    it('omits security key when neither operation nor global defines it', () => {
      const spec = createMockParsedSpec({
        rawSpec: {
          paths: {
            '/users': {
              get: {
                operationId: 'listUsers',
                summary: 'List users',
                responses: {
                  200: { description: 'OK' },
                },
              },
            },
          },
        },
      })

      const result = getEndpoint(spec, { method: 'get', path: '/users' })

      expect(result).not.toHaveProperty('security')
    })
  })
})
