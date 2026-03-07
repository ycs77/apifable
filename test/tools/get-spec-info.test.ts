import { describe, expect, it } from 'vitest'
import { getSpecInfo } from '../../src/tools/get-spec-info'
import { createMockParsedSpec } from '../helpers'

describe('getSpecInfo', () => {
  it('returns normalized spec metadata and tag summary', () => {
    const spec = createMockParsedSpec({
      info: {
        title: 'Store API',
        version: '2.0.0',
        description: 'Store description',
        servers: ['https://store.example.com'],
        security: [],
        securitySchemes: [],
      },
      tags: [
        { name: 'orders', description: 'Order endpoints', endpointCount: 3 },
      ],
    })

    const result = getSpecInfo(spec)

    expect(result).toEqual({
      title: 'Store API',
      version: '2.0.0',
      description: 'Store description',
      servers: ['https://store.example.com'],
      tags: [
        { name: 'orders', description: 'Order endpoints', endpointCount: 3 },
      ],
    })
  })

  it('includes security schemes when present', () => {
    const spec = createMockParsedSpec({
      info: {
        title: 'Secure API',
        version: '1.0.0',
        description: '',
        servers: [],
        security: [{ http: [] }],
        securitySchemes: [
          { name: 'http', type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        ],
      },
    })

    const result = getSpecInfo(spec)

    expect(result).toEqual({
      title: 'Secure API',
      version: '1.0.0',
      description: '',
      servers: [],
      tags: [
        { name: 'items', description: 'Items endpoints', endpointCount: 1 },
      ],
      securitySchemes: [
        { name: 'http', type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      ],
      security: [{ http: [] }],
    })
  })
})
