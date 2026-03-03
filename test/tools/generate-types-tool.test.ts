import { describe, expect, it } from 'vitest'
import { generateTypesTool } from '../../src/tools/generate-types-tool'
import { createMockParsedSpec } from '../helpers'

describe('generateTypesTool', () => {
  describe('input validation', () => {
    it('returns error when no input mode is provided', () => {
      const spec = createMockParsedSpec()

      const result = generateTypesTool(spec, {})

      expect(result).toEqual({
        isError: true,
        message: 'Provide either "schemas", "method" + "path", or "operationId".',
      })
    })

    it('returns error when schemas and endpoint mode are both provided', () => {
      const spec = createMockParsedSpec()

      const result = generateTypesTool(spec, {
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
      const spec = createMockParsedSpec()

      const result = generateTypesTool(spec, {
        schemas: ['Item'],
        operationId: 'listItems',
      })

      expect(result).toEqual({
        isError: true,
        message: 'Provide exactly one of: "schemas", "method" + "path", or "operationId".',
      })
    })

    it('returns error when operationId and endpoint mode are both provided', () => {
      const spec = createMockParsedSpec()

      const result = generateTypesTool(spec, {
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
      const spec = createMockParsedSpec()

      const result = generateTypesTool(spec, { method: 'get' })

      expect(result).toEqual({
        isError: true,
        message: 'Both "method" and "path" are required for endpoint mode.',
      })
    })

    it('returns error when only path is provided', () => {
      const spec = createMockParsedSpec()

      const result = generateTypesTool(spec, { path: '/items' })

      expect(result).toEqual({
        isError: true,
        message: 'Both "method" and "path" are required for endpoint mode.',
      })
    })

    it('returns error when schemas is an empty array', () => {
      const spec = createMockParsedSpec()

      const result = generateTypesTool(spec, { schemas: [] })

      expect(result).toEqual({
        isError: true,
        message: '"schemas" must not be an empty array.',
      })
    })
  })

  describe('schemas mode', () => {
    it('returns error with missing schema names', () => {
      const spec = createMockParsedSpec()

      const result = generateTypesTool(spec, {
        schemas: ['UnknownB', 'UnknownA'],
      })

      expect(result).toEqual({
        isError: true,
        message: 'Schema not found: UnknownA, UnknownB.',
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

      const result = generateTypesTool(spec, { schemas: ['User'] })

      expect('code' in result).toBe(true)
      if ('code' in result) {
        expect(result.code).toContain('export interface User {')
        expect(result.code).toContain('  id?: string')
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

      const result = generateTypesTool(spec, { schemas: ['User', 'Address'] })

      expect('code' in result).toBe(true)
      if ('code' in result) {
        expect(result.code).toContain('export interface User {')
        expect(result.code).toContain('export interface Address {')
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

      const result = generateTypesTool(spec, { schemas: ['User'] })

      expect('code' in result).toBe(true)
      if ('code' in result) {
        expect(result.code).toContain('export interface User {')
        expect(result.code).toContain('export interface Profile {')
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

      const result = generateTypesTool(spec, { schemas: ['User'] })

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

      const result = generateTypesTool(spec, { schemas: ['A'] })

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
      const spec = createMockParsedSpec({ rawSpec: { paths: {} } })

      const result = generateTypesTool(spec, {
        method: 'get',
        path: '/missing',
      })

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

      const result = generateTypesTool(spec, {
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

      const result = generateTypesTool(spec, {
        method: 'get',
        path: '/users',
      })

      expect(result).toEqual({
        isError: true,
        message: 'No schema references found for endpoint \'GET /users\'.',
      })
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

      const result = generateTypesTool(spec, {
        method: 'post',
        path: '/users',
      })

      expect('code' in result).toBe(true)
      if ('code' in result) {
        expect(result.code).toContain('export interface CreateUserRequest {')
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

      const result = generateTypesTool(spec, {
        method: 'get',
        path: '/users/{id}',
      })

      expect('code' in result).toBe(true)
      if ('code' in result) {
        expect(result.code).toContain('export interface User {')
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

      const result = generateTypesTool(spec, {
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

      const result = generateTypesTool(spec, {
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

      const result = generateTypesTool(spec, {
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

      const result = generateTypesTool(spec, {
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

      const result = generateTypesTool(spec, {
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

      const result = generateTypesTool(spec, { operationId: 'getUser' })

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

      const result = generateTypesTool(spec, { operationId: 'nonExistent' })

      expect(result).toEqual({
        isError: true,
        message: 'Operation \'nonExistent\' not found in spec.',
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

      const result = generateTypesTool(spec, { operationId: 'listUsers' })

      expect(result).toEqual({
        isError: true,
        message: 'No schema references found for endpoint \'GET /users\'.',
      })
    })
  })
})
