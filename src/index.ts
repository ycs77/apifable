import type { OpenAPIObject, ParsedSpec } from './types'
import { access } from 'node:fs/promises'
import { resolve } from 'node:path'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { cac } from 'cac'
import { z } from 'zod'
import { readCache, writeCache } from './cache/cache'
import { fetchSpec } from './commands/fetch'
import { generateTypes } from './commands/generate-types'
import { initialize } from './commands/init'
import { readConfig } from './config/config'
import { loadSpecFile } from './spec/loader'
import { buildParsedSpec } from './spec/parser'
import { generateTypesTool } from './tools/generate-types-tool'
import { getEndpoint } from './tools/get-endpoint'
import { getSchema } from './tools/get-schema'
import { getSpecInfo } from './tools/get-spec-info'
import { listEndpointsByTag } from './tools/list-endpoints-by-tag'
import { searchEndpoints } from './tools/search-endpoints'

const cli = cac('apifable')

cli
  .command('')
  .action(() => {
    cli.outputHelp()
  })

cli
  .command('init', 'Initialize apifable configuration')
  .action(async () => {
    await initialize()
  })

cli
  .command('mcp', 'Start MCP server for an OpenAPI spec')
  .option('--spec <path>', 'Path to OpenAPI spec file (.yaml, .yml, or .json)')
  .action(async (options: { spec?: string }) => {
    const config = await readConfig()
    if (!config) {
      console.error('No apifable.config.json found. Run "apifable init" to initialize.')
      process.exit(1)
    }

    const specPath = resolve(options.spec ?? config.spec.path)

    try {
      await access(specPath)
    } catch {
      console.error(`Spec file not found: ${specPath}`)
      process.exit(1)
    }

    let hash: string
    let parsed: OpenAPIObject
    try {
      const result = await loadSpecFile(specPath)
      hash = result.hash
      parsed = result.parsed
    } catch (err) {
      console.error(`Failed to load spec file: ${(err as Error).message}`)
      process.exit(1)
    }

    let spec: ParsedSpec
    const cached = await readCache(hash)
    if (cached) {
      spec = cached
    } else {
      spec = buildParsedSpec(parsed)
      writeCache(hash, spec).catch(err => console.warn('Cache write failed:', err))
    }

    const server = new McpServer({
      name: 'apifable',
      version: '0.3.0',
    })

    server.registerTool(
      'get_spec_info',
      {
        description: 'Get general information about the OpenAPI spec: title, version, description, servers, security schemes, and available tags with endpoint counts. Start here to understand an unfamiliar API. Then use list_endpoints_by_tag or search_endpoints to explore specific areas.',
      },
      () => {
        const result = getSpecInfo(spec)
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
      },
    )

    server.registerTool(
      'list_endpoints_by_tag',
      {
        description: 'List all endpoints belonging to a specific tag. Use get_spec_info first to see available tags. Then use get_endpoint to inspect a specific endpoint in detail.',
        inputSchema: {
          tag: z.string().describe('The tag name to filter endpoints by'),
        },
      },
      ({ tag }) => {
        const result = listEndpointsByTag(spec, tag)
        const isError = 'isError' in result && result.isError === true
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          isError,
        }
      },
    )

    server.registerTool(
      'search_endpoints',
      {
        description: 'Search endpoints by keyword across operationId, path, summary, and description. Results are ranked by relevance. If no exact matches are found, automatically falls back to fuzzy search. The response includes a matchType field ("exact" or "fuzzy"); fuzzy results also include a score field per result. After finding the target endpoint, use get_endpoint for full details or generate_types for TypeScript types.',
        inputSchema: {
          query: z.string().min(1).describe('Search keyword'),
          tag: z.string().optional().describe('Optional tag to filter results'),
          limit: z.number().int().min(1).max(100).optional().describe('Maximum number of results (default: 10)'),
        },
      },
      ({ query, tag, limit }) => {
        const result = searchEndpoints(spec, query, tag, limit)
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
      },
    )

    server.registerTool(
      'get_endpoint',
      {
        description: 'Get full details of a specific endpoint including parameters, request body, responses, and security requirements. All $refs are resolved. Provide either "method" + "path" or "operationId". Use generate_types to get TypeScript type declarations for the endpoint.',
        inputSchema: {
          method: z.string().optional().describe('HTTP method (e.g. get, post, put, delete)'),
          path: z.string().optional().describe('Endpoint path (e.g. /users/{id})'),
          operationId: z.string().optional().describe('Operation ID to look up (e.g. listUsers)'),
        },
      },
      ({ method, path, operationId }) => {
        const input = operationId
          ? { operationId }
          : { method: method!, path: path! }
        const result = getEndpoint(spec, input)
        const isError = 'isError' in result && result.isError === true
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          isError,
        }
      },
    )

    server.registerTool(
      'get_schema',
      {
        description: 'Get a specific schema from components/schemas by name. All $refs are resolved. Use generate_types to convert schemas to TypeScript type declarations.',
        inputSchema: {
          name: z.string().describe('Schema name (e.g. User, CreateOrderRequest)'),
        },
      },
      ({ name }) => {
        const result = getSchema(spec, name)
        const isError = 'isError' in result && result.isError === true
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          isError,
        }
      },
    )

    server.registerTool(
      'generate_types',
      {
        description: 'Generate self-contained TypeScript type declarations for specified schemas or for all schemas used by a specific endpoint. Provide exactly one of: "schemas" (array of schema names), "method" + "path" (endpoint), or "operationId". Transitive dependencies are included automatically.',
        inputSchema: {
          schemas: z.array(z.string()).optional().describe(
            'Array of schema names from components/schemas (e.g. ["User", "Address"])',
          ),
          method: z.string().optional().describe(
            'HTTP method for endpoint mode (e.g. get, post)',
          ),
          path: z.string().optional().describe(
            'Endpoint path for endpoint mode (e.g. /users/{id})',
          ),
          operationId: z.string().optional().describe(
            'Operation ID to generate types for (e.g. listUsers)',
          ),
        },
      },
      ({ schemas, method, path, operationId }) => {
        const result = generateTypesTool(spec, { schemas, method, path, operationId })
        const isError = 'isError' in result && result.isError === true
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          isError,
        }
      },
    )

    const transport = new StdioServerTransport()
    await server.connect(transport)
  })

cli
  .command('fetch', 'Fetch OpenAPI spec from remote URL and save locally')
  .option('--url <url>', 'OpenAPI spec URL')
  .option('--output <path>', 'Output file path (.yaml, .yml, or .json)')
  .option('--types', 'Generate TypeScript types after fetching')
  .action(async (options: { url?: string, output?: string, types?: boolean }) => {
    await fetchSpec(options)
  })

cli
  .command('generate-types', 'Generate TypeScript types from OpenAPI spec')
  .option('--spec <path>', 'Path to OpenAPI spec file')
  .option('--output <path>', 'Output directory (default: src/types/)')
  .action(async (options: { spec?: string, output?: string }) => {
    await generateTypes(options)
  })

cli.help()
cli.parse()
