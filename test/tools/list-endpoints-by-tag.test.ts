import { describe, expect, it } from 'vitest'
import { listEndpointsByTag } from '../../src/tools/list-endpoints-by-tag'
import { createMockEndpoint, createMockParsedSpec } from '../helpers'

describe('listEndpointsByTag', () => {
  it('returns endpoints for the requested tag', () => {
    const spec = createMockParsedSpec({
      endpointIndex: [
        createMockEndpoint({ method: 'get', path: '/users', operationId: 'listUsers', tags: ['users'] }),
        createMockEndpoint({ method: 'post', path: '/users', operationId: 'createUser', tags: ['users'] }),
        createMockEndpoint({ method: 'get', path: '/orders', operationId: 'listOrders', tags: ['orders'] }),
      ],
    })

    const result = listEndpointsByTag(spec, 'users')

    expect(result.tag).toBe('users')
    expect(result.endpoints).toEqual([
      {
        method: 'get',
        path: '/users',
        operationId: 'listUsers',
        summary: 'List items',
      },
      {
        method: 'post',
        path: '/users',
        operationId: 'createUser',
        summary: 'List items',
      },
    ])
    expect(result.warning).toBeUndefined()
  })

  it('adds warning when too many endpoints are returned', () => {
    const endpointIndex = Array.from({ length: 31 }, (_, index) => createMockEndpoint({
      method: 'get',
      path: `/users/${index}`,
      operationId: `getUser${index}`,
      tags: ['users'],
    }))

    const spec = createMockParsedSpec({ endpointIndex })
    const result = listEndpointsByTag(spec, 'users')

    expect(result.endpoints).toHaveLength(31)
    expect(result.warning).toBe('This tag has 31 endpoints. Consider using search_endpoints to narrow results.')
  })
})
