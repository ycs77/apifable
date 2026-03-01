import type { OpenAPIObject, ParsedSpec } from './types'
import { access } from 'node:fs/promises'
import { resolve } from 'node:path'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { cac } from 'cac'
import { z } from 'zod'
import { readCache, writeCache } from './cache/cache'
import { add } from './commands/add'
import { generateTypes } from './commands/generate-types'
import { initialize } from './commands/init'
import { readConfig } from './config/config'
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

    const specPath = resolve(options.spec ?? config.spec)

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
      version: '0.1.0',
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
        description: 'Search endpoints by keyword across operationId, path, summary, and description. Results are ranked by relevance. If no exact matches are found, automatically falls back to fuzzy search. The response includes a matchType field ("exact" or "fuzzy"); fuzzy results also include a score field per result.',
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

cli
  .command('generate-types', 'Generate TypeScript types from OpenAPI spec')
  .option('--spec <path>', 'Path to OpenAPI spec file')
  .option('--output <path>', 'Output directory (default: src/types/)')
  .action(async (options: { spec?: string, output?: string }) => {
    await generateTypes(options)
  })

cli
  .command('add <name>', 'Install a recipe skill to .apifable/recipes/')
  .action(async (name: string) => {
    await add(name)
  })

cli.help()
cli.parse()
