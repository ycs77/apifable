import type { EndpointEntry, OpenAPIObject, ParsedSpec, TagInfo } from '../src/types.ts'

export function createMockEndpoint(overrides: Partial<EndpointEntry> = {}): EndpointEntry {
  return {
    method: 'get',
    path: '/items',
    operationId: 'listItems',
    summary: 'List items',
    description: 'List all items',
    tags: ['items'],
    ...overrides,
  }
}

export function createMockTag(overrides: Partial<TagInfo> = {}): TagInfo {
  return {
    name: 'items',
    description: 'Items endpoints',
    endpointCount: 1,
    ...overrides,
  }
}

export function createEmptyParsedSpec(overrides: Partial<ParsedSpec> = {}): ParsedSpec {
  const baseRawSpec: OpenAPIObject = {
    openapi: '3.1.0',
    info: {
      title: 'Mock API',
      version: '1.0.0',
      description: 'Mock description',
    },
    paths: {},
    components: {
      schemas: {},
    },
  }

  const base: ParsedSpec = {
    info: {
      title: 'Mock API',
      version: '1.0.0',
      description: 'Mock description',
      servers: [],
      security: [],
      securitySchemes: [],
    },
    tags: [],
    endpointIndex: [],
    schemas: {},
    rawSpec: baseRawSpec,
  }

  return {
    ...base,
    ...overrides,
    info: {
      ...base.info,
      ...(overrides.info ?? {}),
    },
    tags: overrides.tags ?? base.tags,
    endpointIndex: overrides.endpointIndex ?? base.endpointIndex,
    schemas: overrides.schemas ?? base.schemas,
    rawSpec: {
      ...base.rawSpec,
      ...(overrides.rawSpec ?? {}),
      info: {
        ...(base.rawSpec.info ?? {}),
        ...((overrides.rawSpec?.info as OpenAPIObject['info']) ?? {}),
      },
      paths: overrides.rawSpec?.paths ?? base.rawSpec.paths,
      components: overrides.rawSpec?.components ?? base.rawSpec.components,
      tags: overrides.rawSpec?.tags ?? base.rawSpec.tags,
      servers: overrides.rawSpec?.servers ?? base.rawSpec.servers,
    },
  }
}

export function createMockParsedSpec(overrides: Partial<ParsedSpec> = {}): ParsedSpec {
  const baseRawSpec: OpenAPIObject = {
    openapi: '3.1.0',
    info: {
      title: 'Mock API',
      version: '1.0.0',
      description: 'Mock description',
    },
    servers: [{ url: 'https://api.example.com' }],
    tags: [{ name: 'items', description: 'Items endpoints' }],
    paths: {
      '/items': {
        get: {
          operationId: 'listItems',
          summary: 'List items',
          description: 'List all items',
          tags: ['items'],
          responses: {
            200: {
              description: 'OK',
            },
          },
        },
      },
    },
    components: {
      schemas: {
        Item: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
      },
    },
  }

  const base: ParsedSpec = {
    info: {
      title: 'Mock API',
      version: '1.0.0',
      description: 'Mock description',
      servers: ['https://api.example.com'],
      security: [],
      securitySchemes: [],
    },
    tags: [createMockTag()],
    endpointIndex: [createMockEndpoint()],
    schemas: {
      Item: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
      },
    },
    rawSpec: baseRawSpec,
  }

  return {
    ...base,
    ...overrides,
    info: {
      ...base.info,
      ...(overrides.info ?? {}),
    },
    tags: overrides.tags ?? base.tags,
    endpointIndex: overrides.endpointIndex ?? base.endpointIndex,
    schemas: overrides.schemas ?? base.schemas,
    rawSpec: {
      ...base.rawSpec,
      ...(overrides.rawSpec ?? {}),
      info: {
        ...(base.rawSpec.info ?? {}),
        ...((overrides.rawSpec?.info as OpenAPIObject['info']) ?? {}),
      },
      paths: overrides.rawSpec?.paths ?? base.rawSpec.paths,
      components: overrides.rawSpec?.components ?? base.rawSpec.components,
      tags: overrides.rawSpec?.tags ?? base.rawSpec.tags,
      servers: overrides.rawSpec?.servers ?? base.rawSpec.servers,
    },
  }
}
