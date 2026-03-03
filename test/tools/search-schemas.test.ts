import { describe, expect, it } from 'vitest'
import { searchSchemas } from '../../src/tools/search-schemas'
import { createMockParsedSpec } from '../helpers'

describe('searchSchemas', () => {
  it('returns exact matches ranked by relevance (name match > description match)', () => {
    const spec = createMockParsedSpec({
      schemas: {
        Order: { type: 'object', description: 'An order entity' },
        CreateUserRequest: { type: 'object', description: 'Request to create an order for a user' },
        UserProfile: { type: 'object', description: 'User profile data' },
      },
    })

    const result = searchSchemas(spec, 'order')

    expect(result.matchType).toBe('exact')
    expect(result.results[0].name).toBe('Order')
    expect(result.results[1].name).toBe('CreateUserRequest')
    expect(result.total).toBe(2)
  })

  it('falls back to fuzzy search when exact search has no result', () => {
    const spec = createMockParsedSpec({
      schemas: {
        UserProfile: { type: 'object', description: 'User profile data' },
        OrderItem: { type: 'object', description: 'An order item' },
      },
    })

    const result = searchSchemas(spec, 'Usor')

    expect(result.matchType).toBe('fuzzy')
    expect(result.total).toBeGreaterThan(0)
    expect(result.results[0].name).toBe('UserProfile')
    expect(result.results[0].score).toBeTypeOf('number')
  })

  it('respects result limit', () => {
    const spec = createMockParsedSpec({
      schemas: Object.fromEntries(
        Array.from({ length: 20 }, (_, i) => [`User${i}`, { type: 'object' }]),
      ),
    })

    const result = searchSchemas(spec, 'user', 5)

    expect(result.total).toBe(5)
    expect(result.results).toHaveLength(5)
  })
})
