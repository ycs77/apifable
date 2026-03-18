import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import { vol } from 'memfs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { loadSpecFile } from '../../src/spec/loader.ts'

vi.mock('node:fs/promises')

const cwd = resolve('workspace', 'project')

beforeEach(() => {
  vol.reset()
})

describe('loadSpecFile', () => {
  it('loads and validates a JSON OpenAPI file', async () => {
    const filePath = resolve(cwd, 'openapi.json')
    const content = JSON.stringify({
      openapi: '3.1.0',
      info: {
        title: 'JSON API',
        version: '1.0.0',
      },
      paths: {},
    })

    vol.fromJSON({
      [filePath]: content,
    })

    await expect(loadSpecFile(filePath)).resolves.toEqual({
      hash: createHash('sha256').update(content).digest('hex'),
      parsed: {
        openapi: '3.1.0',
        info: {
          title: 'JSON API',
          version: '1.0.0',
        },
        paths: {},
      },
    })
  })

  it('loads and validates a YAML OpenAPI file', async () => {
    const filePath = resolve(cwd, 'openapi.yaml')
    const content = ['openapi: 3.1.0', 'info:', '  title: YAML API', '  version: 1.0.0', 'paths: {}', ''].join('\n')

    vol.fromJSON({
      [filePath]: content,
    })

    await expect(loadSpecFile(filePath)).resolves.toEqual({
      hash: createHash('sha256').update(content).digest('hex'),
      parsed: {
        openapi: '3.1.0',
        info: {
          title: 'YAML API',
          version: '1.0.0',
        },
        paths: {},
      },
    })
  })

  it('loads .yml files', async () => {
    const filePath = resolve(cwd, 'openapi.yml')

    vol.fromJSON({
      [filePath]: ['openapi: 3.1.0', 'info:', '  title: YML API', '  version: 1.0.0', 'paths: {}', ''].join('\n'),
    })

    await expect(loadSpecFile(filePath)).resolves.toEqual({
      hash: expect.any(String),
      parsed: {
        openapi: '3.1.0',
        info: {
          title: 'YML API',
          version: '1.0.0',
        },
        paths: {},
      },
    })
  })

  it('throws for unsupported file extensions', async () => {
    const filePath = resolve(cwd, 'openapi.txt')

    vol.fromJSON({
      [filePath]: 'openapi: 3.1.0',
    })

    await expect(loadSpecFile(filePath)).rejects.toThrowError(
      'Unsupported file format. Please use .yaml, .yml, or .json',
    )
  })

  it('throws a stable error for invalid JSON', async () => {
    const filePath = resolve(cwd, 'openapi.json')

    vol.fromJSON({
      [filePath]: '{"openapi":',
    })

    await expect(loadSpecFile(filePath)).rejects.toThrowError(/Failed to parse JSON:/)
  })

  it('throws a stable error for invalid YAML', async () => {
    const filePath = resolve(cwd, 'openapi.yaml')

    vol.fromJSON({
      [filePath]: 'openapi: [',
    })

    await expect(loadSpecFile(filePath)).rejects.toThrowError(/Failed to parse YAML:/)
  })

  it('surfaces validation errors after parsing', async () => {
    const filePath = resolve(cwd, 'openapi.json')

    vol.fromJSON({
      [filePath]: JSON.stringify({
        openapi: '3.1.0',
        paths: {},
      }),
    })

    await expect(loadSpecFile(filePath)).rejects.toThrowError(
      /Invalid OpenAPI document in spec file .*openapi\.json: info:/,
    )
  })
})
