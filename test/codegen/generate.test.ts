import { describe, expect, it } from 'vitest'
import { toKebabCase, topologicalSort } from '../../src/codegen/generate'

describe('generate', () => {
  it('converts tags to kebab-case file names', () => {
    expect(toKebabCase('User API')).toBe('user-api')
    expect(toKebabCase('user_api')).toBe('user-api')
    expect(toKebabCase('***')).toBe('unknown')
  })

  it('sorts schemas by dependencies before output', () => {
    const sorted = topologicalSort(
      ['User', 'Profile', 'Address'],
      new Map([
        ['User', ['Profile']],
        ['Profile', ['Address']],
        ['Address', []],
      ]),
    )

    expect(sorted).toEqual(['Address', 'Profile', 'User'])
  })
})
