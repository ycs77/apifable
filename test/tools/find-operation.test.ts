import { describe, expect, it } from 'vitest'
import { findOperationByOperationId } from '../../src/tools/find-operation.ts'
import { createMockParsedSpec } from '../helpers.ts'

describe('findOperationByOperationId', () => {
  it('finds a matching operation', () => {
    const spec = createMockParsedSpec({
      rawSpec: {
        paths: {
          '/users': {
            get: {
              operationId: 'listUsers',
              summary: 'List users',
            },
          },
        },
      },
    })

    const result = findOperationByOperationId(spec, 'listUsers')

    expect(result).toEqual({
      method: 'get',
      path: '/users',
      operation: {
        operationId: 'listUsers',
        summary: 'List users',
      },
    })
  })

  it('returns undefined when no operation matches', () => {
    const spec = createMockParsedSpec({
      rawSpec: {
        paths: {
          '/users': {
            get: {
              operationId: 'listUsers',
            },
          },
        },
      },
    })

    const result = findOperationByOperationId(spec, 'nonExistent')

    expect(result).toBeUndefined()
  })

  it('ignores operations with empty operationId', () => {
    const spec = createMockParsedSpec({
      rawSpec: {
        paths: {
          '/users': {
            get: {
              operationId: '',
              summary: 'List users',
            },
          },
        },
      },
    })

    const result = findOperationByOperationId(spec, '')

    expect(result).toBeUndefined()
  })

  it('finds operation across different HTTP methods', () => {
    const spec = createMockParsedSpec({
      rawSpec: {
        paths: {
          '/users': {
            get: {
              operationId: 'listUsers',
            },
            post: {
              operationId: 'createUser',
              summary: 'Create a user',
            },
          },
        },
      },
    })

    const result = findOperationByOperationId(spec, 'createUser')

    expect(result).toEqual({
      method: 'post',
      path: '/users',
      operation: {
        operationId: 'createUser',
        summary: 'Create a user',
      },
    })
  })

  it('returns undefined when paths is empty', () => {
    const spec = createMockParsedSpec({
      rawSpec: { paths: {} },
    })

    const result = findOperationByOperationId(spec, 'listUsers')

    expect(result).toBeUndefined()
  })
})
