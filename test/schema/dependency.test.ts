import { describe, expect, it } from 'vitest'
import { addTransitiveDeps, buildDependencyGraph, collectRefs, topologicalSort } from '../../src/schema/dependency'

describe('dependency', () => {
  it('collects schema refs from nested structures', () => {
    const refs = collectRefs({
      requestBody: {
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/User' },
          },
        },
      },
      responses: [
        { $ref: '#/components/schemas/Error' },
        { $ref: '#/components/parameters/Id' },
      ],
    })

    expect(refs).toEqual(['User', 'Error'])
  })

  it('builds dependency graph and collects transitive dependencies', () => {
    const graph = buildDependencyGraph({
      A: {
        type: 'object',
        properties: {
          b: { $ref: '#/components/schemas/B' },
        },
      },
      B: {
        type: 'object',
        properties: {
          c: { $ref: '#/components/schemas/C' },
        },
      },
      C: {
        type: 'object',
      },
    })

    expect(graph.get('A')).toEqual(['B'])
    expect(graph.get('B')).toEqual(['C'])
    expect(graph.get('C')).toEqual([])

    const visited = new Set<string>()
    addTransitiveDeps('A', graph, visited)
    expect([...visited]).toEqual(['A', 'B', 'C'])
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
