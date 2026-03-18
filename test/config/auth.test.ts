import { join, resolve } from 'node:path'
import { vol } from 'memfs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getAuthPath, readAuth } from '../../src/config/auth.ts'

vi.mock('node:fs/promises')

const cwd = resolve('workspace', 'project')

beforeEach(() => {
  vol.reset()
})

describe('getAuthPath', () => {
  it('joins the provided cwd with .apifable/auth.json', () => {
    expect(getAuthPath(cwd)).toBe(join(cwd, '.apifable', 'auth.json'))
  })
})

describe('readAuth', () => {
  it('returns null when the auth file is missing', async () => {
    await expect(readAuth(cwd)).resolves.toBeNull()
  })

  it('reads a valid auth config', async () => {
    vol.fromJSON({
      [getAuthPath(cwd)]: JSON.stringify({
        headers: {
          Authorization: 'Bearer token',
        },
      }),
    })

    await expect(readAuth(cwd)).resolves.toEqual({
      headers: {
        Authorization: 'Bearer token',
      },
    })
  })

  it('throws a stable error for invalid JSON', async () => {
    vol.fromJSON({
      [getAuthPath(cwd)]: '{"headers":',
    })

    await expect(readAuth(cwd)).rejects.toThrowError(/Invalid JSON in .*auth\.json:/)
  })

  it('throws a stable error for schema validation failures', async () => {
    vol.fromJSON({
      [getAuthPath(cwd)]: JSON.stringify({
        headers: {
          Authorization: 123,
        },
      }),
    })

    await expect(readAuth(cwd)).rejects.toThrowError(/Invalid auth config in .*auth\.json: headers\.Authorization:/)
  })
})
