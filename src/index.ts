import type { OpenAPIObject, ParsedSpec } from './types'
import { access } from 'node:fs/promises'
import { resolve } from 'node:path'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { cac } from 'cac'
import { z } from 'zod'
import { version } from '../package.json' with { type: 'json' }
import { fetchSpec } from './commands/fetch'
import { initialize } from './commands/init'
import { readConfig } from './config/config'
import { loadSpecFile } from './spec/loader'
import { buildParsedSpec } from './spec/parser'
import { getEndpoint } from './tools/get-endpoint'
import { getSchema } from './tools/get-schema'
import { getSpecInfo } from './tools/get-spec-info'
import { getTypesTool } from './tools/get-types-tool'
import { listEndpointsByTag } from './tools/list-endpoints-by-tag'
import { searchEndpoints } from './tools/search-endpoints'
import { searchSchemas } from './tools/search-schemas'

const cli = cac('apifable')

cli.option('--cwd <path>', 'Working directory (defaults to current directory)')

cli
  .command('')
  .action(() => {
    cli.outputHelp()
  })

cli
  .command('init', 'Initialize apifable configuration')
  .action(async (options: { cwd?: string }) => {
    const cwd = options.cwd ? resolve(options.cwd) : undefined
    await initialize(cwd)
  })

cli
  .command('fetch', 'Fetch OpenAPI spec from remote URL and save locally')
  .option('--url <url>', 'OpenAPI spec URL')
  .option('--output <path>', 'Output OpenAPI file path (.yaml, .yml, or .json)')
  .action(async (options: { url?: string, output?: string, cwd?: string }) => {
    const cwd = options.cwd ? resolve(options.cwd) : undefined
    await fetchSpec({ ...options, cwd })
  })

cli
  .command('mcp', 'Start MCP server for an OpenAPI spec')
  .option('--spec <path>', 'Path to OpenAPI spec file (.yaml, .yml, or .json)')
  .action(async (options: { spec?: string, cwd?: string }) => {
    const cwd = options.cwd ? resolve(options.cwd) : undefined
    const config = await readConfig(cwd)
    const specSource = options.spec ?? config?.spec.path

    if (!specSource) {
      console.error('No OpenAPI spec path found. Provide --spec <path> or add spec.path to apifable.config.json.')
      process.exit(1)
    }

    const specPath = resolve(cwd ?? process.cwd(), specSource)

    try {
      await access(specPath)
    } catch {
      console.error(`Spec file not found: ${specPath}`)
      process.exit(1)
    }

    let parsed: OpenAPIObject
    try {
      const result = await loadSpecFile(specPath)
      parsed = result.parsed
    } catch (err) {
      console.error(`Failed to load spec file: ${(err as Error).message}`)
      process.exit(1)
    }

    const spec: ParsedSpec = buildParsedSpec(parsed)

    const server = new McpServer({
      name: 'apifable',
      version,
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
        description: 'List all endpoints belonging to a specific tag. Use get_spec_info first to see available tags. Supports pagination via limit and offset. Then use get_endpoint to inspect a specific endpoint in detail.',
        inputSchema: {
          tag: z.string().describe('The tag name to filter endpoints by'),
          limit: z.number().int().min(1).max(100).optional().describe('Maximum number of endpoints to return'),
          offset: z.number().int().min(0).optional().describe('Number of endpoints to skip (default: 0)'),
        },
      },
      ({ tag, limit, offset }) => {
        const result = listEndpointsByTag(spec, tag, limit, offset)
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
        description: 'Search endpoints by keyword across operationId, path, summary, and description. Results are ranked by relevance. If no exact matches are found, automatically falls back to fuzzy search. The response includes a matchType field ("exact" or "fuzzy"); fuzzy results also include a score field per result. After finding the target endpoint, use get_endpoint for full details or get_types for TypeScript types.',
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
        description: 'Get full details of a specific endpoint including parameters, request body, responses, and security requirements. Supported internal component $refs are resolved inline. Provide either "method" + "path" or "operationId". Use get_types to get TypeScript type declarations for the endpoint.',
        inputSchema: {
          method: z.string().optional().describe('HTTP method (e.g. get, post, put, delete)'),
          path: z.string().optional().describe('Endpoint path (e.g. /users/{id})'),
          operationId: z.string().optional().describe('Operation ID to look up (e.g. listUsers)'),
        },
      },
      ({ method, path, operationId }) => {
        const result = getEndpoint(spec, { method, path, operationId })
        const isError = 'isError' in result && result.isError === true
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          isError,
        }
      },
    )

    server.registerTool(
      'search_schemas',
      {
        description: 'Search schemas by keyword across schema name and description. Results are ranked by relevance. If no exact matches are found, automatically falls back to fuzzy search. Empty results may include a guidance message suggesting next steps. Use get_schema to inspect a specific schema in detail.',
        inputSchema: {
          query: z.string().min(1).describe('Search keyword'),
          limit: z.number().int().min(1).max(100).optional().describe('Maximum number of results (default: 10)'),
        },
      },
      ({ query, limit }) => {
        const result = searchSchemas(spec, query, limit)
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
      },
    )

    server.registerTool(
      'get_schema',
      {
        description: 'Get a specific schema from components/schemas by name. Supported internal component $refs are resolved inline. Use get_types to convert schemas to TypeScript type declarations.',
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
      'get_types',
      {
        description: 'Generate self-contained TypeScript type declarations for specified schemas or for all schemas used by a specific endpoint. Endpoint mode follows supported internal component $refs before collecting schema dependencies. Provide exactly one of: "schemas" (array of schema names), "method" + "path" (endpoint), or "operationId". Transitive dependencies are included automatically.',
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
        const result = getTypesTool(spec, { schemas, method, path, operationId })
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

cli.help()
cli.version(version)
cli.parse()
