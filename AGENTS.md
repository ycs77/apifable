# AGENTS.md

## Technology Stack

- Node.js v24+
- TypeScript
- MCP SDK (`@modelcontextprotocol/sdk`) v1.26.0+, protocol version 2025-11-25
- Zod v4 (schema validation for MCP tool inputs)
- `yaml` (YAML parsing)
- `cac` (CLI argument parsing)
- `tsdown` (bundler, not tsc)

## TypeScript Formatting

2 spaces, single quotes, no semicolons, trailing commas.

## Commands

- `pnpm build` — production build
- `pnpm inspect` — launch MCP Inspector for interactive tool testing
- `pnpm lint --fix` — ESLint for TypeScript files with auto-fix (uses `@ycs77/eslint-config`)
- `pnpm eslint [...files] --fix` — ESLint for specific files with auto-fix

## Running the Server

```bash
pnpm build
node bin/openapi-agent.js mcp --spec ./path/to/api.yaml
```

For interactive testing via MCP Inspector:

```bash
pnpm inspect -- mcp --spec ./path/to/api.yaml
```

## Architecture

```
bin/
└── openapi-agent.js          # CLI entry point (loads dist/index.js)
src/
├── index.ts                  # CLI (cac), spec loading, cache check, MCP server setup
├── types.ts                  # Shared types: ParsedSpec, EndpointEntry, SpecCache, etc.
├── spec/
│   ├── loader.ts             # Read YAML file, compute SHA-256 hash
│   ├── parser.ts             # Build ParsedSpec index from raw OpenAPI object
│   └── ref-resolver.ts       # Recursive $ref expansion with cycle detection
├── cache/
│   └── cache.ts              # Read/write .openapi-cache/cache.json
└── tools/
    ├── get-spec-info.ts
    ├── list-endpoints-by-tag.ts
    ├── search-endpoints.ts
    ├── get-endpoint.ts
    └── get-schema.ts
```

## Cache

- Location: `<spec-dir>/.openapi-cache/cache.json`
- Key: SHA-256 hash of the YAML file content
- Invalidated automatically when the file changes
- Also invalidated when `CACHE_VERSION` constant in `src/types.ts` is bumped

## Gotchas

- Spec loader only supports **YAML** files (not JSON)
- `search_endpoints` defaults to `limit: 10`; max is 100
- To force-invalidate all caches (e.g. after `ParsedSpec` shape changes), bump `CACHE_VERSION` in `src/types.ts`

## MCP Tools

| Tool | Description |
|------|-------------|
| `get_spec_info` | API title, version, servers, and tag summary |
| `list_endpoints_by_tag` | All endpoints for a given tag |
| `search_endpoints` | Keyword search ranked by relevance |
| `get_endpoint` | Full endpoint details with resolved $refs |
| `get_schema` | Full schema with resolved $refs |
