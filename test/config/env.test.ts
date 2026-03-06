/* eslint-disable no-template-curly-in-string */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { expandEnvVars, expandHeaderValues } from '../../src/config/env'

describe('expandEnvVars', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('expands a defined env var', () => {
    vi.stubEnv('MY_TOKEN', 'secret123')
    expect(expandEnvVars('Bearer ${MY_TOKEN}')).toBe('Bearer secret123')
  })

  it('keeps undefined vars as-is', () => {
    expect(expandEnvVars('${UNDEFINED_VAR}')).toBe('${UNDEFINED_VAR}')
  })

  it('expands multiple vars', () => {
    vi.stubEnv('A', 'hello')
    vi.stubEnv('B', 'world')
    expect(expandEnvVars('${A} ${B}')).toBe('hello world')
  })

  it('returns string unchanged when no vars present', () => {
    expect(expandEnvVars('plain-value')).toBe('plain-value')
  })
})

describe('expandHeaderValues', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('expands all header values', () => {
    vi.stubEnv('TOKEN', 'abc')
    expect(expandHeaderValues({
      Authorization: 'Bearer ${TOKEN}',
      'X-Static': 'plain',
    })).toEqual({
      Authorization: 'Bearer abc',
      'X-Static': 'plain',
    })
  })

  it('returns empty object unchanged', () => {
    expect(expandHeaderValues({})).toEqual({})
  })
})
