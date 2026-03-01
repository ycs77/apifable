import { describe, expect, it } from 'vitest'
import { addTransitiveDeps, buildDependencyGraph, classifySchemasByTag, collectRefs } from '../../src/codegen/tag-classifier'
import { createMockParsedSpec } from '../helpers'

describe('tag-classifier', () => {
  it('collects schema refs from nested structures', () => {
    const refs = collectRefs({
      requestBody: {
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/User' },
          },
        },
      },
      responses: [
        { $ref: '#/components/schemas/Error' },
        { $ref: '#/components/parameters/Id' },
      ],
    })

    expect(refs).toEqual(['User', 'Error'])
  })

  it('builds dependency graph and collects transitive dependencies', () => {
    const graph = buildDependencyGraph({
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
      },
    })

    expect(graph.get('A')).toEqual(['B'])
    expect(graph.get('B')).toEqual(['C'])
    expect(graph.get('C')).toEqual([])

    const visited = new Set<string>()
    addTransitiveDeps('A', graph, visited)
    expect([...visited]).toEqual(['A', 'B', 'C'])
  })

  it('classifies schemas to tag files and common file', () => {
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
        },
        Post: {
          type: 'object',
          properties: {
            author: { $ref: '#/components/schemas/User' },
          },
        },
        SharedError: {
          type: 'object',
        },
        Unused: {
          type: 'object',
        },
      },
      rawSpec: {
        paths: {
          '/users': {
            get: {
              tags: ['users'],
              responses: {
                200: {
                  content: {
                    'application/json': {
                      schema: { $ref: '#/components/schemas/User' },
                    },
                  },
                },
                400: {
                  content: {
                    'application/json': {
                      schema: { $ref: '#/components/schemas/SharedError' },
                    },
                  },
                },
              },
            },
          },
          '/posts': {
            get: {
              tags: ['posts'],
              responses: {
                200: {
                  content: {
                    'application/json': {
                      schema: { $ref: '#/components/schemas/Post' },
                    },
                  },
                },
                400: {
                  content: {
                    'application/json': {
                      schema: { $ref: '#/components/schemas/SharedError' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    })

    const result = classifySchemasByTag(spec)

    expect(result.byTag.get('posts')).toEqual(['Post'])
    expect(result.byTag.has('users')).toBe(false)
    expect(result.common).toEqual(expect.arrayContaining(['User', 'Profile', 'SharedError', 'Unused']))
  })
})
