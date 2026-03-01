import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { generate, toKebabCase, topologicalSort } from '../../src/codegen/generate'
import { createMockParsedSpec } from '../helpers'

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

  it('writes common and tag files with deterministic names and imports', async () => {
    const outputDir = await mkdtemp(join(tmpdir(), 'apifable-generate-test-'))

    try {
      const spec = createMockParsedSpec({
        schemas: {
          Shared: {
            type: 'object',
            properties: {
              id: { type: 'string' },
            },
          },
          User: {
            type: 'object',
            properties: {
              shared: { $ref: '#/components/schemas/Shared' },
            },
          },
          Admin: {
            type: 'object',
            properties: {
              shared: { $ref: '#/components/schemas/Shared' },
            },
          },
          Unused: {
            type: 'object',
          },
        },
        rawSpec: {
          paths: {
            '/users': {
              get: {
                tags: ['User API'],
                responses: {
                  200: {
                    content: {
                      'application/json': {
                        schema: { $ref: '#/components/schemas/User' },
                      },
                    },
                  },
                },
              },
            },
            '/admins': {
              get: {
                tags: ['user_api'],
                responses: {
                  200: {
                    content: {
                      'application/json': {
                        schema: { $ref: '#/components/schemas/Admin' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      })

      const result = await generate(spec, outputDir, { commonFileName: 'shared' })
      const fileNames = result.files.map(f => f.path.split('\\').pop())

      expect(fileNames).toEqual(expect.arrayContaining(['shared.ts', 'user-api.ts', 'user-api-2.ts']))

      const commonContent = await readFile(join(outputDir, 'shared.ts'), 'utf-8')
      const userApiContent = await readFile(join(outputDir, 'user-api.ts'), 'utf-8')
      const userApi2Content = await readFile(join(outputDir, 'user-api-2.ts'), 'utf-8')

      expect(commonContent).toContain('export interface Shared {')
      expect(commonContent).toContain('export interface Unused {')
      expect(userApiContent).toContain('import type { Shared } from \'./shared\'')
      expect(userApi2Content).toContain('import type { Shared } from \'./shared\'')
    } finally {
      await rm(outputDir, { recursive: true, force: true })
    }
  })
})
