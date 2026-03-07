import { describe, expect, it } from 'vitest'
import { buildGitignoreContent } from '../../src/commands/init'

describe('buildGitignoreContent', () => {
  it('empty content + single entry', () => {
    expect(buildGitignoreContent('', ['.apifable/'])).toBe('# apifable\n.apifable/\n')
  })

  it('empty content + two entries', () => {
    expect(buildGitignoreContent('', ['.apifable/', 'openapi.yaml'])).toBe('# apifable\n.apifable/\nopenapi.yaml\n')
  })

  it('existing content with trailing newline + new entry', () => {
    const existing = 'node_modules/\ndist/\n'
    const result = buildGitignoreContent(existing, ['.apifable/'])
    expect(result).toBe('node_modules/\ndist/\n\n# apifable\n.apifable/\n')
  })

  it('existing content without trailing newline + new entry', () => {
    const existing = 'node_modules/\ndist/'
    const result = buildGitignoreContent(existing, ['.apifable/'])
    expect(result).toBe('node_modules/\ndist/\n\n# apifable\n.apifable/\n')
  })

  it('existing # apifable block + new spec entry inserts at end of block', () => {
    const existing = 'node_modules/\n\n# apifable\n.apifable/\n'
    const result = buildGitignoreContent(existing, ['.apifable/', 'openapi.yaml'])
    expect(result).toBe('node_modules/\n\n# apifable\n.apifable/\nopenapi.yaml\n')
  })

  it('all entries already exist → returns original content unchanged', () => {
    const existing = '# apifable\n.apifable/\nopenapi.yaml\n'
    expect(buildGitignoreContent(existing, ['.apifable/', 'openapi.yaml'])).toBe(existing)
  })

  it('only missing entries are added', () => {
    const existing = '# apifable\n.apifable/\n'
    const result = buildGitignoreContent(existing, ['.apifable/', 'openapi.yaml'])
    expect(result).toBe('# apifable\n.apifable/\nopenapi.yaml\n')
  })
})
