import { describe, expect, it } from 'vitest'
import { searchEndpoints } from '../../src/tools/search-endpoints'
import { createMockParsedSpec } from '../helpers'

describe('searchEndpoints', () => {
  it('returns exact matches ranked by relevance', () => {
    const spec = createMockParsedSpec({
      endpointIndex: [
        {
          method: 'get',
          path: '/users',
          operationId: 'listUsers',
          summary: 'List users',
          description: 'Return users',
          tags: ['users'],
        },
        {
          method: 'get',
          path: '/users/{id}',
          operationId: 'getUserById',
          summary: 'Get user by id',
          description: 'Get one user',
          tags: ['users'],
        },
      ],
    })

    const result = searchEndpoints(spec, 'listUsers')

    expect(result.matchType).toBe('exact')
    expect(result.total).toBe(1)
    expect(result.results[0]).toEqual({
      method: 'get',
      path: '/users',
      operationId: 'listUsers',
      summary: 'List users',
      tags: ['users'],
    })
  })

  it('applies tag filter before searching', () => {
    const spec = createMockParsedSpec({
      endpointIndex: [
        {
          method: 'get',
          path: '/users',
          operationId: 'listUsers',
          summary: 'List users',
          description: 'Return users',
          tags: ['users'],
        },
        {
          method: 'get',
          path: '/orders',
          operationId: 'listOrders',
          summary: 'List orders',
          description: 'Return orders',
          tags: ['orders'],
        },
      ],
    })

    const result = searchEndpoints(spec, 'list', 'orders')

    expect(result.matchType).toBe('exact')
    expect(result.total).toBe(1)
    expect(result.results[0].operationId).toBe('listOrders')
  })

  it('falls back to fuzzy search when exact search has no result', () => {
    const spec = createMockParsedSpec({
      endpointIndex: [
        {
          method: 'get',
          path: '/users',
          operationId: 'listUsers',
          summary: 'List users',
          description: 'Return users',
          tags: ['users'],
        },
      ],
    })

    const result = searchEndpoints(spec, 'lsitUsers')

    expect(result.matchType).toBe('fuzzy')
    expect(result.total).toBeGreaterThan(0)
    expect(result.results[0].operationId).toBe('listUsers')
    expect(result.results[0].score).toBeTypeOf('number')
  })

  it('returns an empty fuzzy result with guidance when nothing matches', () => {
    const spec = createMockParsedSpec({
      endpointIndex: [
        {
          method: 'get',
          path: '/users',
          operationId: 'listUsers',
          summary: 'List users',
          description: 'Return users',
          tags: ['users'],
        },
      ],
    })

    const result = searchEndpoints(spec, 'zzznomatch')

    expect(result).toEqual({
      query: 'zzznomatch',
      tag: undefined,
      matchType: 'fuzzy',
      results: [],
      total: 0,
      hasMore: false,
      message: 'No endpoints found. Try different keywords or check available tags with get_spec_info.',
    })
  })

  it('respects result limit', () => {
    const spec = createMockParsedSpec({
      endpointIndex: Array.from({ length: 20 }, (_, index) => ({
        method: 'get',
        path: `/users/${index}`,
        operationId: `getUser${index}`,
        summary: `Get user ${index}`,
        description: `Fetch user ${index}`,
        tags: ['users'],
      })),
    })

    const result = searchEndpoints(spec, 'user', undefined, 5)

    expect(result.total).toBe(20)
    expect(result.results).toHaveLength(5)
    expect(result.hasMore).toBe(true)
  })

  it('returns no rows but preserves totals when limit is zero', () => {
    const spec = createMockParsedSpec({
      endpointIndex: Array.from({ length: 3 }, (_, index) => ({
        method: 'get',
        path: `/users/${index}`,
        operationId: `getUser${index}`,
        summary: `Get user ${index}`,
        description: `Fetch user ${index}`,
        tags: ['users'],
      })),
    })

    const result = searchEndpoints(spec, 'user', undefined, 0)

    expect(result).toEqual({
      query: 'user',
      tag: undefined,
      matchType: 'exact',
      results: [],
      total: 3,
      hasMore: true,
    })
  })
})
