import type { OpenAPIObject } from '../../src/types'
import { describe, expect, it } from 'vitest'
import { getFormatByPath, stringifySpecContent } from '../../src/commands/fetch'

const minimalSpec: OpenAPIObject = {
  openapi: '3.1.0',
  info: {
    title: 'Example API',
    version: '1.0.0',
  },
  paths: {},
}

describe('getFormatByPath', () => {
  it('detects json output paths', () => {
    expect(getFormatByPath('specs/openapi.json')).toBe('json')
  })

  it('detects yaml output paths case-insensitively', () => {
    expect(getFormatByPath('specs/OPENAPI.YAML')).toBe('yaml')
    expect(getFormatByPath('specs/openapi.yml')).toBe('yaml')
  })

  it('throws for unsupported output paths', () => {
    expect(() => getFormatByPath('specs/openapi.txt')).toThrowError(
      'Unsupported output format. Please use .yaml, .yml, or .json',
    )
  })
})

describe('stringifySpecContent', () => {
  it('stringifies json output with indentation and a trailing newline', () => {
    expect(stringifySpecContent(minimalSpec, 'json')).toBe(`{\n  "openapi": "3.1.0",\n  "info": {\n    "title": "Example API",\n    "version": "1.0.0"\n  },\n  "paths": {}\n}\n`)
  })

  it('stringifies yaml output with a single trailing newline', () => {
    const output = stringifySpecContent(minimalSpec, 'yaml')

    expect(output).toContain('openapi: 3.1.0\n')
    expect(output).toContain('title: Example API\n')
    expect(output).toContain('version: 1.0.0\n')
    expect(output.endsWith('\n')).toBe(true)
    expect(output.endsWith('\n\n')).toBe(false)
  })
})
