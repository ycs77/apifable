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
})
