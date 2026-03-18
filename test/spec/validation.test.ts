import { describe, expect, it } from 'vitest'
import { validateOpenAPIDocument } from '../../src/spec/validation.ts'

describe('validateOpenAPIDocument', () => {
  it('accepts a minimal valid OpenAPI 3.x document', () => {
    const spec = {
      openapi: '3.1.0',
      info: {
        title: 'Minimal API',
        version: '1.0.0',
      },
      paths: {},
    }

    expect(validateOpenAPIDocument(spec)).toEqual(spec)
  })

  it('rejects parsed payloads that are not OpenAPI documents', () => {
    expect(() => validateOpenAPIDocument({ message: 'forbidden' }, 'downloaded spec content')).toThrowError(
      /^Invalid OpenAPI document in downloaded spec content: openapi:/,
    )
  })

  it('rejects documents missing the info object', () => {
    const spec = {
      openapi: '3.1.0',
      // info is missing
      paths: {},
    }

    expect(() => validateOpenAPIDocument(spec, 'missing info')).toThrowError(/^Invalid OpenAPI document/)
  })

  it('rejects documents with info missing title', () => {
    const spec = {
      openapi: '3.1.0',
      info: {
        // title is missing
        version: '1.0.0',
      },
      paths: {},
    }

    expect(() => validateOpenAPIDocument(spec, 'missing title')).toThrowError(/^Invalid OpenAPI document/)
  })

  it('rejects documents with info missing version', () => {
    const spec = {
      openapi: '3.1.0',
      info: {
        title: 'Missing version',
        // version is missing
      },
      paths: {},
    }

    expect(() => validateOpenAPIDocument(spec, 'missing version')).toThrowError(/^Invalid OpenAPI document/)
  })

  it('rejects documents with invalid paths type', () => {
    const spec = {
      openapi: '3.1.0',
      info: {
        title: 'Invalid paths',
        version: '1.0.0',
      },
      // paths must be an object; here we intentionally provide an array
      paths: [] as any,
    }

    expect(() => validateOpenAPIDocument(spec, 'invalid paths')).toThrowError(/^Invalid OpenAPI document/)
  })

  it('rejects documents with empty string fields that must be non-empty', () => {
    const emptyOpenapi = {
      openapi: '',
      info: {
        title: 'Minimal API',
        version: '1.0.0',
      },
      paths: {},
    }

    const emptyTitle = {
      openapi: '3.1.0',
      info: {
        title: '',
        version: '1.0.0',
      },
      paths: {},
    }

    const emptyVersion = {
      openapi: '3.1.0',
      info: {
        title: 'Minimal API',
        version: '',
      },
      paths: {},
    }

    expect(() => validateOpenAPIDocument(emptyOpenapi, 'empty openapi')).toThrowError(/^Invalid OpenAPI document/)
    expect(() => validateOpenAPIDocument(emptyTitle, 'empty title')).toThrowError(/^Invalid OpenAPI document/)
    expect(() => validateOpenAPIDocument(emptyVersion, 'empty version')).toThrowError(/^Invalid OpenAPI document/)
  })
})
