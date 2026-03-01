import type { OpenAPIObject } from '../../src/types'
import { describe, expect, it } from 'vitest'
import { buildParsedSpec } from '../../src/spec/parser'

describe('buildParsedSpec', () => {
  it('builds info, endpoint index, tags and schemas from raw spec', () => {
    const raw: OpenAPIObject = {
      info: {
        title: 'Demo API',
        version: '2.1.0',
        description: 'Demo description',
      },
      servers: [{ url: 'https://api.demo.dev' }, { url: '' }, {}],
      tags: [
        { name: 'users', description: 'User operations' },
        { name: 'admin', description: 'Admin operations' },
      ],
      paths: {
        '/users': {
          get: {
            operationId: 'listUsers',
            summary: 'List users',
            description: 'Get all users',
            tags: ['users'],
          },
          post: {
            operationId: 'createUser',
            summary: 'Create user',
            description: 'Create one user',
            tags: ['users', 'write'],
          },
        },
        '/health': {
          get: {
            operationId: 'health',
            summary: 'Health',
            description: 'Health check',
            tags: [],
          },
        },
      },
      components: {
        schemas: {
          User: { type: 'object' },
          Error: { type: 'object' },
        },
      },
    }

    const parsed = buildParsedSpec(raw)

    expect(parsed.info).toEqual({
      title: 'Demo API',
      version: '2.1.0',
      description: 'Demo description',
      servers: ['https://api.demo.dev'],
    })

    expect(parsed.endpointIndex).toHaveLength(3)
    expect(parsed.endpointIndex[0]).toEqual({
      method: 'get',
      path: '/users',
      operationId: 'listUsers',
      summary: 'List users',
      description: 'Get all users',
      tags: ['users'],
    })

    const usersTag = parsed.tags.find(t => t.name === 'users')
    const adminTag = parsed.tags.find(t => t.name === 'admin')
    const writeTag = parsed.tags.find(t => t.name === 'write')

    expect(usersTag?.endpointCount).toBe(2)
    expect(adminTag?.endpointCount).toBe(0)
    expect(writeTag).toEqual({
      name: 'write',
      description: '',
      endpointCount: 1,
    })

    expect(parsed.schemas).toEqual({
      User: { type: 'object' },
      Error: { type: 'object' },
    })
    expect(parsed.rawSpec).toBe(raw)
  })

  it('returns empty defaults when fields are missing', () => {
    const parsed = buildParsedSpec({})

    expect(parsed.info).toEqual({
      title: '',
      version: '',
      description: '',
      servers: [],
    })
    expect(parsed.tags).toEqual([])
    expect(parsed.endpointIndex).toEqual([])
    expect(parsed.schemas).toEqual({})
  })
})
