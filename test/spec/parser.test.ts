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
      security: [],
      securitySchemes: [],
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
      security: [],
      securitySchemes: [],
    })
    expect(parsed.tags).toEqual([])
    expect(parsed.endpointIndex).toEqual([])
    expect(parsed.schemas).toEqual({})
  })

  it('auto-collects implicit tags from endpoints', () => {
    const raw: OpenAPIObject = {
      info: { title: '', version: '' },
      tags: [],
      paths: {
        '/secret': {
          get: {
            summary: 'Secret endpoint',
            tags: ['internal'],
          },
        },
      },
    }

    const parsed = buildParsedSpec(raw)

    expect(parsed.tags).toHaveLength(1)
    expect(parsed.tags[0]).toEqual({
      name: 'internal',
      description: '',
      endpointCount: 1,
    })
  })

  it('parses securitySchemes with oauth2 and bearer', () => {
    const raw: OpenAPIObject = {
      info: { title: '', version: '' },
      components: {
        securitySchemes: {
          oauth2: {
            type: 'oauth2',
            flows: {
              authorizationCode: {},
            },
          },
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    }

    const parsed = buildParsedSpec(raw)

    const oauth = parsed.info.securitySchemes.find(s => s.name === 'oauth2')
    const bearer = parsed.info.securitySchemes.find(s => s.name === 'bearerAuth')

    expect(oauth).toEqual({
      name: 'oauth2',
      type: 'oauth2',
      flowTypes: ['authorizationCode'],
    })
    expect(bearer).toEqual({
      name: 'bearerAuth',
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    })
  })

  it('returns empty endpointIndex and tags for empty paths', () => {
    const raw: OpenAPIObject = {
      info: { title: '', version: '' },
      paths: {},
    }

    const parsed = buildParsedSpec(raw)

    expect(parsed.endpointIndex).toEqual([])
    expect(parsed.tags).toEqual([])
  })

  it('counts multiple endpoints under the same tag', () => {
    const raw: OpenAPIObject = {
      info: { title: '', version: '' },
      tags: [{ name: 'pets', description: 'Pet operations' }],
      paths: {
        '/pets': {
          get: {
            operationId: 'listPets',
            summary: 'List pets',
            tags: ['pets'],
          },
          post: {
            operationId: 'createPet',
            summary: 'Create pet',
            tags: ['pets'],
          },
        },
        '/pets/{id}': {
          get: {
            operationId: 'getPet',
            summary: 'Get pet',
            tags: ['pets'],
          },
        },
      },
    }

    const parsed = buildParsedSpec(raw)

    expect(parsed.tags).toHaveLength(1)
    expect(parsed.tags[0].endpointCount).toBe(3)
  })

  it('defaults operationId to empty string when missing', () => {
    const raw: OpenAPIObject = {
      info: { title: '', version: '' },
      paths: {
        '/ping': {
          get: {
            summary: 'Ping',
          },
        },
      },
    }

    const parsed = buildParsedSpec(raw)

    expect(parsed.endpointIndex).toHaveLength(1)
    expect(parsed.endpointIndex[0].operationId).toBe('')
  })

  it('passes through global security array', () => {
    const raw: OpenAPIObject = {
      info: { title: '', version: '' },
      security: [{ bearerAuth: [] }],
    }

    const parsed = buildParsedSpec(raw)

    expect(parsed.info.security).toEqual([{ bearerAuth: [] }])
  })
})
