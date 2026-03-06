import { describe, expect, it } from 'vitest'
import { mergeHeaders } from '../../src/config/headers'

describe('mergeHeaders', () => {
  it('merges config and auth headers', () => {
    expect(mergeHeaders(
      { 'X-App': 'foo', 'X-Common': 'from-config' },
      { Authorization: 'Bearer token', 'X-Common': 'from-auth' },
    )).toEqual({
      'X-App': 'foo',
      'X-Common': 'from-auth',
      Authorization: 'Bearer token',
    })
  })

  it('auth headers override config headers with same key', () => {
    expect(mergeHeaders(
      { Authorization: 'Bearer old' },
      { Authorization: 'Bearer new' },
    )).toEqual({ Authorization: 'Bearer new' })
  })

  it('returns config headers when auth headers are empty', () => {
    expect(mergeHeaders({ 'X-App': 'foo' }, {})).toEqual({ 'X-App': 'foo' })
  })

  it('returns auth headers when config headers are empty', () => {
    expect(mergeHeaders({}, { Authorization: 'Bearer token' })).toEqual({ Authorization: 'Bearer token' })
  })

  it('returns empty object when both are empty', () => {
    expect(mergeHeaders({}, {})).toEqual({})
  })
})
