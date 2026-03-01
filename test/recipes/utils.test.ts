import { describe, expect, it } from 'vitest'
import { isValidRecipeName } from '../../src/recipes/utils'

describe('isValidRecipeName', () => {
  it('accepts valid recipe names', () => {
    expect(isValidRecipeName('fetch-ts')).toBe(true)
    expect(isValidRecipeName('Recipe_123')).toBe(true)
    expect(isValidRecipeName('a'.repeat(100))).toBe(true)
  })

  it('rejects invalid recipe names', () => {
    expect(isValidRecipeName('')).toBe(false)
    expect(isValidRecipeName('-starts-with-dash')).toBe(false)
    expect(isValidRecipeName('has space')).toBe(false)
    expect(isValidRecipeName('a'.repeat(101))).toBe(false)
  })
})
