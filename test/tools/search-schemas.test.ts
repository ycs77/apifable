import { describe, expect, it } from 'vitest'
import { searchSchemas } from '../../src/tools/search-schemas.ts'
import { createMockParsedSpec } from '../helpers.ts'

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

  it('returns an empty fuzzy result with guidance when nothing matches', () => {
    const spec = createMockParsedSpec({
      schemas: {
        UserProfile: { type: 'object', description: 'User profile data' },
        OrderItem: { type: 'object', description: 'An order item' },
      },
    })

    const result = searchSchemas(spec, 'zzznomatch')

    expect(result.matchType).toBe('fuzzy')
    expect(result.results).toEqual([])
    expect(result.total).toBe(0)
    expect(result.hasMore).toBe(false)
    expect(result.message).toBe(
      'No schemas found. Try different keywords or inspect related endpoints with get_endpoint to discover schema names.',
    )
  })

  it('respects result limit', () => {
    const spec = createMockParsedSpec({
      schemas: Object.fromEntries(
        Array.from({ length: 20 }, (_, i) => [`User${i}`, { type: 'object' }]),
      ),
    })

    const result = searchSchemas(spec, 'user', 5)

    expect(result.total).toBe(20)
    expect(result.results).toHaveLength(5)
    expect(result.hasMore).toBe(true)
  })

  it('returns no rows but preserves totals when limit is zero', () => {
    const spec = createMockParsedSpec({
      schemas: Object.fromEntries(
        Array.from({ length: 3 }, (_, i) => [`User${i}`, { type: 'object' }]),
      ),
    })

    const result = searchSchemas(spec, 'user', 0)

    expect(result).toEqual({
      query: 'user',
      matchType: 'exact',
      results: [],
      total: 3,
      hasMore: true,
    })
  })

  it('matches schema names with special characters exactly', () => {
    const spec = createMockParsedSpec({
      schemas: {
        'User-Profile.Response': { type: 'object', description: 'Profile response payload' },
        UserProfile: { type: 'object', description: 'User profile data' },
      },
    })

    const result = searchSchemas(spec, 'User-Profile')

    expect(result).toEqual({
      query: 'User-Profile',
      matchType: 'exact',
      results: [
        {
          name: 'User-Profile.Response',
          description: 'Profile response payload',
        },
      ],
      total: 1,
      hasMore: false,
    })
  })
})
