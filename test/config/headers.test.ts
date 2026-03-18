/* eslint-disable no-template-curly-in-string */
import { resolve } from 'node:path'
import { vol } from 'memfs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getAuthPath } from '../../src/config/auth.ts'
import { getConfigPath } from '../../src/config/config.ts'
import { resolveHeaders } from '../../src/config/headers.ts'

vi.mock('node:fs/promises')

const cwd = resolve('workspace', 'project')

beforeEach(() => {
  vol.reset()
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('resolveHeaders', () => {
  it('returns undefined when neither config nor auth headers exist', async () => {
    await expect(resolveHeaders(cwd)).resolves.toBeUndefined()
  })

  it('returns expanded config headers when auth headers do not exist', async () => {
    vi.stubEnv('TOKEN', 'config-token')

    vol.fromJSON({
      [getConfigPath(cwd)]: JSON.stringify({
        spec: {
          headers: {
            Authorization: 'Bearer ${TOKEN}',
            'X-Static': 'plain',
          },
        },
      }),
    })

    await expect(resolveHeaders(cwd)).resolves.toEqual({
      Authorization: 'Bearer config-token',
      'X-Static': 'plain',
    })
  })

  it('lets auth headers override config headers on key conflicts', async () => {
    vi.stubEnv('CONFIG_TOKEN', 'config-token')
    vi.stubEnv('AUTH_TOKEN', 'auth-token')

    vol.fromJSON({
      [getConfigPath(cwd)]: JSON.stringify({
        spec: {
          headers: {
            Authorization: 'Bearer ${CONFIG_TOKEN}',
            'X-From-Config': 'config-only',
          },
        },
      }),
      [getAuthPath(cwd)]: JSON.stringify({
        headers: {
          Authorization: 'Bearer ${AUTH_TOKEN}',
          'X-From-Auth': 'auth-only',
        },
      }),
    })

    await expect(resolveHeaders(cwd)).resolves.toEqual({
      Authorization: 'Bearer auth-token',
      'X-From-Config': 'config-only',
      'X-From-Auth': 'auth-only',
    })
  })

  it('keeps undefined env vars unchanged after merging headers', async () => {
    vol.fromJSON({
      [getAuthPath(cwd)]: JSON.stringify({
        headers: {
          Authorization: 'Bearer ${MISSING_TOKEN}',
        },
      }),
    })

    await expect(resolveHeaders(cwd)).resolves.toEqual({
      Authorization: 'Bearer ${MISSING_TOKEN}',
    })
  })

  it('returns undefined when merged headers are empty', async () => {
    vol.fromJSON({
      [getConfigPath(cwd)]: JSON.stringify({ spec: {} }),
      [getAuthPath(cwd)]: JSON.stringify({}),
    })

    await expect(resolveHeaders(cwd)).resolves.toBeUndefined()
  })
})
