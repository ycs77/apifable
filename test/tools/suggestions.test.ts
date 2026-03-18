import { describe, expect, it } from 'vitest'
import { findSimilarNames } from '../../src/tools/suggestions.ts'

describe('findSimilarNames', () => {
  it('returns substring matches before fuzzy matches', () => {
    const result = findSimilarNames('user', ['Order', 'User', 'UserProfile', 'AdminUser'])

    expect(result).toEqual(['User', 'UserProfile', 'AdminUser'])
  })

  it('falls back to fuzzy search when substring match is unavailable', () => {
    const result = findSimilarNames('Usor', ['Order', 'User', 'UserProfile'])

    expect(result).toEqual(['User'])
  })

  it('deduplicates candidates and respects the limit', () => {
    const result = findSimilarNames('item', ['Item', 'Item', 'ItemDetail', 'ItemMeta'], 2)

    expect(result).toEqual(['Item', 'ItemMeta'])
  })
})
