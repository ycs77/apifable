import { describe, expect, it } from 'vitest'
import { getTypesTool } from '../../src/tools/get-types-tool'
import { createEmptyParsedSpec, createMockParsedSpec } from '../helpers'

describe('getTypesTool', () => {
  describe('input validation', () => {
    it('returns error when no input mode is provided', () => {
      const spec = createEmptyParsedSpec()

      const result = getTypesTool(spec, {})

      expect(result).toEqual({
        isError: true,
        message: 'Provide either "schemas", "method" + "path", or "operationId".',
      })
    })

    it('returns error when schemas and endpoint mode are both provided', () => {
      const spec = createEmptyParsedSpec()

      const result = getTypesTool(spec, {
        schemas: ['Item'],
        method: 'get',
        path: '/items',
      })

      expect(result).toEqual({
        isError: true,
        message: 'Provide exactly one of: "schemas", "method" + "path", or "operationId".',
      })
    })

    it('returns error when schemas and operationId are both provided', () => {
      const spec = createEmptyParsedSpec()

      const result = getTypesTool(spec, {
        schemas: ['Item'],
        operationId: 'listItems',
      })

      expect(result).toEqual({
        isError: true,
        message: 'Provide exactly one of: "schemas", "method" + "path", or "operationId".',
      })
    })

    it('returns error when operationId and endpoint mode are both provided', () => {
      const spec = createEmptyParsedSpec()

      const result = getTypesTool(spec, {
        operationId: 'listItems',
        method: 'get',
        path: '/items',
      })

      expect(result).toEqual({
        isError: true,
        message: 'Provide exactly one of: "schemas", "method" + "path", or "operationId".',
      })
    })

    it('returns error when only method is provided', () => {
      const spec = createEmptyParsedSpec()

      const result = getTypesTool(spec, { method: 'get' })

      expect(result).toEqual({
        isError: true,
        message: 'Both "method" and "path" are required for endpoint mode.',
      })
    })

    it('returns error when only path is provided', () => {
      const spec = createEmptyParsedSpec()

      const result = getTypesTool(spec, { path: '/items' })

      expect(result).toEqual({
        isError: true,
        message: 'Both "method" and "path" are required for endpoint mode.',
      })
    })

    it('returns error when schemas is an empty array', () => {
      const spec = createEmptyParsedSpec()

      const result = getTypesTool(spec, { schemas: [] })

      expect(result).toEqual({
        isError: true,
        message: '"schemas" must not be an empty array.',
      })
    })
  })

  describe('schemas mode', () => {
    it('returns error with missing schema names', () => {
      const spec = createEmptyParsedSpec()

      const result = getTypesTool(spec, {
        schemas: ['UnknownB', 'UnknownA'],
      })

      expect(result).toEqual({
        isError: true,
        message: 'Schema not found: UnknownA, UnknownB.',
      })
    })

    it('suggests similar schema names when one schema is missing', () => {
      const spec = createMockParsedSpec({
        schemas: {
          User: { type: 'object' },
          UserProfile: { type: 'object' },
        },
      })

      const result = getTypesTool(spec, {
        schemas: ['Usr'],
      })

      expect(result).toEqual({
        isError: true,
        message: 'Schema not found: Usr. Did you mean: User?',
      })
    })

    it('generates TypeScript for a single schema', () => {
      const spec = createMockParsedSpec({
        schemas: {
          User: {
            type: 'object',
            properties: {
              id: { type: 'string' },
            },
          },
        },
      })

      const result = getTypesTool(spec, { schemas: ['User'] })

      expect('code' in result).toBe(true)
      if ('code' in result) {
        expect(result.code).toBe([
          '// Generated from schemas: User',
          '',
          'export interface User {',
          '  id?: string',
          '}',
          '',
        ].join('\n'))
      }
    })

    it('generates TypeScript for multiple schemas', () => {
      const spec = createMockParsedSpec({
        schemas: {
          User: {
            type: 'object',
            properties: {
              id: { type: 'string' },
            },
          },
          Address: {
            type: 'object',
            properties: {
              city: { type: 'string' },
            },
          },
        },
      })

      const result = getTypesTool(spec, { schemas: ['User', 'Address'] })

      expect('code' in result).toBe(true)
      if ('code' in result) {
        expect(result.code).toBe([
          '// Generated from schemas: Address, User',
          '',
          'export interface Address {',
          '  city?: string',
          '}',
          '',
          'export interface User {',
          '  id?: string',
          '}',
          '',
        ].join('\n'))
      }
    })

    it('includes transitive dependencies automatically', () => {
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
      })

      const result = getTypesTool(spec, { schemas: ['User'] })

      expect('code' in result).toBe(true)
      if ('code' in result) {
        expect(result.code).toBe([
          '// Generated from schemas: Profile, User',
          '',
          'export interface Profile {',
          '  id?: string',
          '}',
          '',
          'export interface User {',
          '  profile?: Profile',
          '}',
          '',
        ].join('\n'))
      }
    })

    it('lists all generated schemas including transitive deps in header comment', () => {
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
      })

      const result = getTypesTool(spec, { schemas: ['User'] })

      expect('code' in result).toBe(true)
      if ('code' in result) {
        expect(result.code).toMatch(/^\/\/ Generated from schemas: Profile, User/)
      }
    })

    it('orders output by topological dependency order', () => {
      const spec = createMockParsedSpec({
        schemas: {
          A: {
            type: 'object',
            properties: {
              b: { $ref: '#/components/schemas/B' },
            },
          },
          B: {
            type: 'object',
            properties: {
              c: { $ref: '#/components/schemas/C' },
            },
          },
          C: {
            type: 'object',
            properties: {
              value: { type: 'string' },
            },
          },
        },
      })

      const result = getTypesTool(spec, { schemas: ['A'] })

      expect('code' in result).toBe(true)
      if ('code' in result) {
        const cIndex = result.code.indexOf('export interface C {')
        const bIndex = result.code.indexOf('export interface B {')
        const aIndex = result.code.indexOf('export interface A {')

        expect(cIndex).toBeGreaterThanOrEqual(0)
        expect(bIndex).toBeGreaterThanOrEqual(0)
        expect(aIndex).toBeGreaterThanOrEqual(0)
        expect(cIndex).toBeLessThan(bIndex)
        expect(bIndex).toBeLessThan(aIndex)
      }
    })
  })

  describe('endpoint mode', () => {
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

      const result = getTypesTool(spec, {
        method: 'get',
        path: '/missing',
      })

      expect(result).toEqual({
        isError: true,
        message: 'Path \'/missing\' not found in spec.',
      })
    })

    it('returns invalid-method error when method is unsupported', () => {
      const spec = createMockParsedSpec()

      const result = getTypesTool(spec, {
        method: 'fetch',
        path: '/users',
      })

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

      const result = getTypesTool(spec, {
        method: 'post',
        path: '/users',
      })

      expect(result).toEqual({
        isError: true,
        message: 'Method \'POST\' not found for path \'/users\'.',
      })
    })

    it('returns error when endpoint has no schema refs', () => {
      const spec = createMockParsedSpec({
        rawSpec: {
          paths: {
            '/users': {
              get: {
                operationId: 'listUsers',
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

      const result = getTypesTool(spec, {
        method: 'get',
        path: '/users',
      })

      expect(result).toEqual({
        isError: true,
        message: 'No schema references or inline schemas found for endpoint \'GET /users\'.',
      })
    })

    it('generates types for inline request and response schemas', () => {
      const spec = createMockParsedSpec({
        rawSpec: {
          paths: {
            '/users/{id}': {
              post: {
                operationId: 'updateUser',
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
                  200: {
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
              },
            },
          },
        },
      })

      const result = getTypesTool(spec, {
        method: 'post',
        path: '/users/{id}',
      })

      expect('code' in result).toBe(true)
      if ('code' in result) {
        expect(result.code).toBe([
          '// Generated from endpoint: updateUser POST /users/{id}',
          '// Includes schemas: UpdateUserRequest, UpdateUserResponse',
          '',
          'export interface UpdateUserRequest {',
          '  name?: string',
          '}',
          '',
          'export interface UpdateUserResponse {',
          '  id?: string',
          '}',
          '',
        ].join('\n'))
      }
    })

    it('includes referenced schemas before inline schemas', () => {
      const spec = createMockParsedSpec({
        schemas: {
          User: {
            type: 'object',
            properties: {
              id: { type: 'string' },
            },
          },
        },
        rawSpec: {
          paths: {
            '/users/{id}': {
              get: {
                responses: {
                  200: {
                    content: {
                      'application/json': {
                        schema: {
                          type: 'object',
                          properties: {
                            user: { $ref: '#/components/schemas/User' },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      })

      const result = getTypesTool(spec, {
        method: 'get',
        path: '/users/{id}',
      })

      expect('code' in result).toBe(true)
      if ('code' in result) {
        const userIndex = result.code.indexOf('export interface User {')
        const responseIndex = result.code.indexOf('export interface GetUsersIdResponse {')

        expect(userIndex).toBeGreaterThanOrEqual(0)
        expect(responseIndex).toBeGreaterThanOrEqual(0)
        expect(userIndex).toBeLessThan(responseIndex)
      }
    })

    it('collects schemas from requestBody', () => {
      const spec = createMockParsedSpec({
        schemas: {
          CreateUserRequest: {
            type: 'object',
            properties: {
              name: { type: 'string' },
            },
          },
        },
        rawSpec: {
          paths: {
            '/users': {
              post: {
                requestBody: {
                  content: {
                    'application/json': {
                      schema: { $ref: '#/components/schemas/CreateUserRequest' },
                    },
                  },
                },
                responses: {
                  201: {
                    description: 'Created',
                  },
                },
              },
            },
          },
        },
      })

      const result = getTypesTool(spec, {
        method: 'post',
        path: '/users',
      })

      expect('code' in result).toBe(true)
      if ('code' in result) {
        expect(result.code).toBe([
          '// Generated from endpoint: POST /users',
          '// Includes schemas: CreateUserRequest',
          '',
          'export interface CreateUserRequest {',
          '  name?: string',
          '}',
          '',
        ].join('\n'))
      }
    })

    it('collects schemas from responses', () => {
      const spec = createMockParsedSpec({
        schemas: {
          User: {
            type: 'object',
            properties: {
              id: { type: 'string' },
            },
          },
        },
        rawSpec: {
          paths: {
            '/users/{id}': {
              get: {
                responses: {
                  200: {
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
        },
      })

      const result = getTypesTool(spec, {
        method: 'get',
        path: '/users/{id}',
      })

      expect('code' in result).toBe(true)
      if ('code' in result) {
        expect(result.code).toBe([
          '// Generated from endpoint: GET /users/{id}',
          '// Includes schemas: User',
          '',
          'export interface User {',
          '  id?: string',
          '}',
          '',
        ].join('\n'))
      }
    })

    it('collects schemas through components.responses refs', () => {
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
              name: { type: 'string' },
            },
          },
        },
        rawSpec: {
          paths: {
            '/users/{id}': {
              get: {
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
                  profile: { $ref: '#/components/schemas/Profile' },
                },
              },
              Profile: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
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
          },
        },
      })

      const result = getTypesTool(spec, {
        method: 'get',
        path: '/users/{id}',
      })

      expect('code' in result).toBe(true)
      if ('code' in result) {
        expect(result.code).toBe([
          '// Generated from endpoint: GET /users/{id}',
          '// Includes schemas: Profile, User',
          '',
          'export interface Profile {',
          '  name?: string',
          '}',
          '',
          'export interface User {',
          '  profile?: Profile',
          '}',
          '',
        ].join('\n'))
      }
    })

    it('collects schemas through components.requestBodies refs', () => {
      const spec = createMockParsedSpec({
        schemas: {
          CreateUserRequest: {
            type: 'object',
            properties: {
              name: { type: 'string' },
            },
          },
        },
        endpointIndex: [
          {
            method: 'post',
            path: '/users',
            operationId: 'createUser',
            summary: 'Create user',
            description: '',
            tags: ['users'],
          },
        ],
        rawSpec: {
          paths: {
            '/users': {
              post: {
                operationId: 'createUser',
                requestBody: { $ref: '#/components/requestBodies/CreateUserBody' },
                responses: {
                  201: {
                    description: 'Created',
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
            },
            requestBodies: {
              CreateUserBody: {
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/CreateUserRequest' },
                  },
                },
              },
            },
          },
        },
      })

      const result = getTypesTool(spec, { operationId: 'createUser' })

      expect('code' in result).toBe(true)
      if ('code' in result) {
        expect(result.code).toBe([
          '// Generated from endpoint: createUser POST /users',
          '// Includes schemas: CreateUserRequest',
          '',
          'export interface CreateUserRequest {',
          '  name?: string',
          '}',
          '',
        ].join('\n'))
      }
    })

    it('collects schemas from fixture-like referenced error responses', () => {
      const spec = createMockParsedSpec({
        schemas: {
          ValidationError: {
            type: 'object',
            properties: {
              message: { type: 'string' },
            },
          },
        },
        rawSpec: {
          paths: {
            '/login': {
              post: {
                operationId: 'auth.login',
                responses: {
                  422: { $ref: '#/components/responses/ValidationException' },
                },
              },
            },
          },
          components: {
            schemas: {
              ValidationError: {
                type: 'object',
                properties: {
                  message: { type: 'string' },
                },
              },
            },
            responses: {
              ValidationException: {
                description: 'Validation failed',
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/ValidationError' },
                  },
                },
              },
            },
          },
        },
      })

      const result = getTypesTool(spec, {
        method: 'post',
        path: '/login',
      })

      expect('code' in result).toBe(true)
      if ('code' in result) {
        expect(result.code).toContain('export interface ValidationError {')
      }
    })

    it('includes transitive dependencies for endpoint mode', () => {
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
          paths: {
            '/users/{id}': {
              get: {
                responses: {
                  200: {
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
        },
      })

      const result = getTypesTool(spec, {
        method: 'get',
        path: '/users/{id}',
      })

      expect('code' in result).toBe(true)
      if ('code' in result) {
        expect(result.code).toContain('export interface User {')
        expect(result.code).toContain('export interface Profile {')
      }
    })

    it('includes operationId in header comment when present', () => {
      const spec = createMockParsedSpec({
        schemas: {
          User: {
            type: 'object',
            properties: {
              id: { type: 'string' },
            },
          },
        },
        rawSpec: {
          paths: {
            '/users/{id}': {
              get: {
                operationId: 'getUser',
                responses: {
                  200: {
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
        },
      })

      const result = getTypesTool(spec, {
        method: 'get',
        path: '/users/{id}',
      })

      expect('code' in result).toBe(true)
      if ('code' in result) {
        expect(result.code).toMatch(/^\/\/ Generated from endpoint: getUser GET \/users\/\{id\}/)
        expect(result.code).toContain('// Includes schemas: User')
      }
    })

    it('omits operationId in header comment when not present', () => {
      const spec = createMockParsedSpec({
        schemas: {
          User: {
            type: 'object',
            properties: {
              id: { type: 'string' },
            },
          },
        },
        rawSpec: {
          paths: {
            '/users/{id}': {
              get: {
                responses: {
                  200: {
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
        },
      })

      const result = getTypesTool(spec, {
        method: 'get',
        path: '/users/{id}',
      })

      expect('code' in result).toBe(true)
      if ('code' in result) {
        expect(result.code).toMatch(/^\/\/ Generated from endpoint: GET \/users\/\{id\}/)
        expect(result.code).toContain('// Includes schemas: User')
      }
    })

    it('lists all schemas including transitive deps in Includes comment', () => {
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
          paths: {
            '/users/{id}': {
              get: {
                responses: {
                  200: {
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
        },
      })

      const result = getTypesTool(spec, {
        method: 'get',
        path: '/users/{id}',
      })

      expect('code' in result).toBe(true)
      if ('code' in result) {
        expect(result.code).toContain('// Includes schemas: Profile, User')
      }
    })

    it('treats method as case-insensitive', () => {
      const spec = createMockParsedSpec({
        schemas: {
          User: {
            type: 'object',
            properties: {
              id: { type: 'string' },
            },
          },
        },
        rawSpec: {
          paths: {
            '/users/{id}': {
              post: {
                responses: {
                  200: {
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
        },
      })

      const result = getTypesTool(spec, {
        method: 'POST',
        path: '/users/{id}',
      })

      expect('code' in result).toBe(true)
      if ('code' in result) {
        expect(result.code).toContain('export interface User {')
      }
    })
  })

  describe('operationId mode', () => {
    it('generates types for an endpoint found by operationId', () => {
      const spec = createMockParsedSpec({
        schemas: {
          User: {
            type: 'object',
            properties: {
              id: { type: 'string' },
            },
          },
        },
        rawSpec: {
          paths: {
            '/users/{id}': {
              get: {
                operationId: 'getUser',
                responses: {
                  200: {
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
        },
      })

      const result = getTypesTool(spec, { operationId: 'getUser' })

      expect('code' in result).toBe(true)
      if ('code' in result) {
        expect(result.code).toContain('export interface User {')
        expect(result.code).toMatch(/^\/\/ Generated from endpoint: getUser GET \/users\/\{id\}/)
        expect(result.code).toContain('// Includes schemas: User')
      }
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

      const result = getTypesTool(spec, { operationId: 'nonExistent' })

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

      const result = getTypesTool(spec, { operationId: 'listUser' })

      expect(result).toEqual({
        isError: true,
        message: 'Operation \'listUser\' not found in spec. Did you mean: listUsers?',
      })
    })

    it('returns error when endpoint has no schema refs', () => {
      const spec = createMockParsedSpec({
        rawSpec: {
          paths: {
            '/users': {
              get: {
                operationId: 'listUsers',
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

      const result = getTypesTool(spec, { operationId: 'listUsers' })

      expect(result).toEqual({
        isError: true,
        message: 'No schema references or inline schemas found for endpoint \'GET /users\'.',
      })
    })
  })
})
