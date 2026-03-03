import { describe, expect, it } from 'vitest'
import { listEndpointsByTag } from '../../src/tools/list-endpoints-by-tag'
import { createMockEndpoint, createMockParsedSpec, createMockTag } from '../helpers'

describe('listEndpointsByTag', () => {
  it('returns endpoints for the requested tag', () => {
    const spec = createMockParsedSpec({
      tags: [
        createMockTag({ name: 'users' }),
        createMockTag({ name: 'orders' }),
      ],
      endpointIndex: [
        createMockEndpoint({ method: 'get', path: '/users', operationId: 'listUsers', tags: ['users'] }),
        createMockEndpoint({ method: 'post', path: '/users', operationId: 'createUser', tags: ['users'] }),
        createMockEndpoint({ method: 'get', path: '/orders', operationId: 'listOrders', tags: ['orders'] }),
      ],
    })

    const result = listEndpointsByTag(spec, 'users')

    expect(result).toMatchObject({ tag: 'users' })
    expect('endpoints' in result && result.endpoints).toEqual([
      {
        method: 'get',
        path: '/users',
        operationId: 'listUsers',
        summary: 'List items',
        description: 'List all items',
      },
      {
        method: 'post',
        path: '/users',
        operationId: 'createUser',
        summary: 'List items',
        description: 'List all items',
      },
    ])
    expect('warning' in result && result.warning).toBeFalsy()
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
    expect('warning' in result && result.warning).toBe('This tag has 31 endpoints. Consider using search_endpoints to narrow results.')
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
})
