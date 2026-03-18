import { describe, expect, it } from 'vitest'
import { listEndpointsByTag } from '../../src/tools/list-endpoints-by-tag.ts'
import { createMockEndpoint, createMockParsedSpec, createMockTag } from '../helpers.ts'

describe('listEndpointsByTag', () => {
  it('filters endpoints matching the requested tag', () => {
    const spec = createMockParsedSpec({
      tags: [
        createMockTag({ name: 'users' }),
        createMockTag({ name: 'orders' }),
      ],
      endpointIndex: [
        createMockEndpoint({ method: 'get', path: '/users', operationId: 'listUsers', summary: 'List users', description: 'List all users', tags: ['users'] }),
        createMockEndpoint({ method: 'post', path: '/users', operationId: 'createUser', summary: 'Create user', description: 'Create one user', tags: ['users'] }),
        createMockEndpoint({ method: 'get', path: '/orders', operationId: 'listOrders', summary: 'List orders', description: 'List all orders', tags: ['orders'] }),
      ],
    })

    const result = listEndpointsByTag(spec, 'users')

    expect(result).toEqual({
      tag: 'users',
      endpoints: [
        {
          method: 'get',
          path: '/users',
          operationId: 'listUsers',
          summary: 'List users',
          description: 'List all users',
        },
        {
          method: 'post',
          path: '/users',
          operationId: 'createUser',
          summary: 'Create user',
          description: 'Create one user',
        },
      ],
      total: 2,
      offset: 0,
      hasMore: false,
    })
  })

  it('adds warning when too many endpoints are returned', () => {
    const endpointIndex = Array.from({ length: 31 }, (_, index) => createMockEndpoint({
      method: 'get',
      path: `/users/${index}`,
      operationId: `getUser${index}`,
      tags: ['users'],
    }))

    const spec = createMockParsedSpec({
      tags: [createMockTag({ name: 'users' })],
      endpointIndex,
    })
    const result = listEndpointsByTag(spec, 'users')

    expect('endpoints' in result && result.endpoints).toHaveLength(31)
    expect('warning' in result && result.warning).toBe('This tag has 31 endpoints. Consider using search_endpoints to narrow results or use limit/offset for pagination.')
  })

  it('returns error with available tags when tag does not exist', () => {
    const spec = createMockParsedSpec({
      tags: [
        createMockTag({ name: 'users' }),
        createMockTag({ name: 'orders' }),
      ],
    })

    const result = listEndpointsByTag(spec, 'nonexistent')

    expect(result).toEqual({
      isError: true,
      message: 'Tag \'nonexistent\' not found.',
      availableTags: ['users', 'orders'],
    })
  })

  it('suggests similar tags before the rest of available tags', () => {
    const spec = createMockParsedSpec({
      tags: [
        createMockTag({ name: 'users' }),
        createMockTag({ name: 'user-admin' }),
        createMockTag({ name: 'orders' }),
      ],
    })

    const result = listEndpointsByTag(spec, 'user')

    expect(result).toEqual({
      isError: true,
      message: 'Tag \'user\' not found. Did you mean: users, user-admin?',
      availableTags: ['users', 'user-admin', 'orders'],
    })
  })

  it('does not add warning when over 30 endpoints but limit is specified', () => {
    const endpointIndex = Array.from({ length: 31 }, (_, index) => createMockEndpoint({
      method: 'get',
      path: `/users/${index}`,
      operationId: `getUser${index}`,
      tags: ['users'],
    }))

    const spec = createMockParsedSpec({
      tags: [createMockTag({ name: 'users' })],
      endpointIndex,
    })
    const result = listEndpointsByTag(spec, 'users', 10)

    expect(result).not.toHaveProperty('warning')
  })

  it('does not add warning when exactly 30 endpoints without limit', () => {
    const endpointIndex = Array.from({ length: 30 }, (_, index) => createMockEndpoint({
      method: 'get',
      path: `/users/${index}`,
      operationId: `getUser${index}`,
      tags: ['users'],
    }))

    const spec = createMockParsedSpec({
      tags: [createMockTag({ name: 'users' })],
      endpointIndex,
    })
    const result = listEndpointsByTag(spec, 'users')

    expect(result).not.toHaveProperty('warning')
  })
})
