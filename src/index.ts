import type { ParsedSpec } from './types'
import { access } from 'node:fs/promises'
import { resolve } from 'node:path'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { cac } from 'cac'
import { z } from 'zod'
import { readCache, writeCache } from './cache/cache'
import { loadSpecFile } from './spec/loader'
import { buildParsedSpec } from './spec/parser'
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
  .command('mcp', 'Start MCP server for an OpenAPI spec')
  .option('--spec <path>', 'Path to OpenAPI YAML file')
  .action(async options => {
    const specOption = options.spec as string | undefined
    if (!specOption) {
      cli.outputHelp()
      process.exit(1)
    }

    const specPath = resolve(specOption)

    try {
      await access(specPath)
    } catch {
      console.error(`Error: Spec file not found: ${specPath}`)
      process.exit(1)
    }

    const { hash, parsed } = await loadSpecFile(specPath)

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
      version: '0.0.1',
    })

    server.registerTool(
      'get_spec_info',
      {
        description: 'Get general information about the OpenAPI spec: title, version, description, servers, and available tags with endpoint counts.',
      },
      () => {
        const result = getSpecInfo(spec)
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
      },
    )

    server.registerTool(
      'list_endpoints_by_tag',
      {
        description: 'List all endpoints belonging to a specific tag.',
        inputSchema: {
          tag: z.string().describe('The tag name to filter endpoints by'),
        },
      },
      ({ tag }) => {
        const result = listEndpointsByTag(spec, tag)
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
      },
    )

    server.registerTool(
      'search_endpoints',
      {
        description: 'Search endpoints by keyword across operationId, path, summary, and description. Results are ranked by relevance.',
        inputSchema: {
          query: z.string().describe('Search keyword'),
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
        description: 'Get full details of a specific endpoint including parameters, request body, and responses. All $refs are resolved.',
        inputSchema: {
          method: z.string().describe('HTTP method (e.g. get, post, put, delete)'),
          path: z.string().describe('Endpoint path (e.g. /users/{id})'),
        },
      },
      ({ method, path }) => {
        const result = getEndpoint(spec, method, path)
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
        description: 'Get a specific schema from components/schemas by name. All $refs are resolved.',
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

    const transport = new StdioServerTransport()
    await server.connect(transport)
  })

cli.help()
cli.parse()
