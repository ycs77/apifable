/* eslint-disable no-template-curly-in-string */
import { join, resolve } from 'node:path'
import { fs, vol } from 'memfs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { configExists, defaultConfig, getConfigPath, readConfig, resolveConfig, writeConfig } from '../../src/config/config'

vi.mock('node:fs/promises')

const cwd = resolve('workspace', 'project')

beforeEach(() => {
  vol.reset()
  fs.mkdirSync(cwd, { recursive: true })
})

describe('getConfigPath', () => {
  it('joins the provided cwd with apifable.config.json', () => {
    expect(getConfigPath(cwd)).toBe(join(cwd, 'apifable.config.json'))
  })
})

describe('resolveConfig', () => {
  it('fills in the default spec path when omitted', () => {
    expect(resolveConfig({ spec: { url: 'https://api.example.com/openapi.yaml' } })).toEqual({
      spec: {
        path: defaultConfig.spec.path,
        url: 'https://api.example.com/openapi.yaml',
        headers: undefined,
      },
    })
  })

  it('keeps explicit spec values', () => {
    expect(resolveConfig({
      spec: {
        path: 'specs/internal.yaml',
        url: 'https://api.example.com/openapi.yaml',
        headers: { Authorization: 'Bearer token' },
      },
    })).toEqual({
      spec: {
        path: 'specs/internal.yaml',
        url: 'https://api.example.com/openapi.yaml',
        headers: { Authorization: 'Bearer token' },
      },
    })
  })
})

describe('writeConfig', () => {
  it('writes formatted JSON with a trailing newline', async () => {
    await writeConfig({ spec: { path: 'specs/openapi.yaml' } }, cwd)

    expect(fs.readFileSync(getConfigPath(cwd), 'utf-8')).toBe(`{\n  "spec": {\n    "path": "specs/openapi.yaml"\n  }\n}\n`)
  })
})

describe('configExists', () => {
  it('returns false when the config file is missing', async () => {
    await expect(configExists(cwd)).resolves.toBe(false)
  })

  it('returns true after the config file is written', async () => {
    vol.fromJSON({
      [getConfigPath(cwd)]: '{"spec":{"path":"openapi.yaml"}}',
    })

    await expect(configExists(cwd)).resolves.toBe(true)
  })
})

describe('readConfig', () => {
  it('returns null when the config file is missing', async () => {
    await expect(readConfig(cwd)).resolves.toBeNull()
  })

  it('reads config values and applies default path when omitted', async () => {
    vol.fromJSON({
      [getConfigPath(cwd)]: JSON.stringify({
        spec: {
          url: 'https://api.example.com/openapi.yaml',
          headers: {
            Authorization: 'Bearer ${TOKEN}',
          },
        },
      }, null, 2),
    })

    await expect(readConfig(cwd)).resolves.toEqual({
      spec: {
        path: defaultConfig.spec.path,
        url: 'https://api.example.com/openapi.yaml',
        headers: {
          Authorization: 'Bearer ${TOKEN}',
        },
      },
    })
  })

  it('throws a stable error for invalid JSON', async () => {
    vol.fromJSON({
      [getConfigPath(cwd)]: '{"spec":',
    })

    await expect(readConfig(cwd)).rejects.toThrowError(/Invalid JSON in .*apifable\.config\.json:/)
  })

  it('throws a stable error for schema validation failures', async () => {
    vol.fromJSON({
      [getConfigPath(cwd)]: JSON.stringify({ spec: { path: 123 } }),
    })

    await expect(readConfig(cwd)).rejects.toThrowError(/Invalid config in .*apifable\.config\.json: spec\.path:/)
  })
})
