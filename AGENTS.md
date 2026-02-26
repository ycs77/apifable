# AGENTS.md

## Technology Stack

- Node.js v24+
- TypeScript
- MCP SDK (`@modelcontextprotocol/sdk`), protocol version 2025-11-25
- Zod v4 (schema validation for MCP tool inputs)
- `@clack/prompts` (CLI interactive prompts and styled output)
- `cac` (CLI argument parsing)
- `minisearch` (fuzzy search fallback in search_endpoints)
- `tsdown` (bundler, not tsc)
- `yaml` (YAML parsing)

## TypeScript Formatting

2 spaces, single quotes, no semicolons, trailing commas.

## Commands

- `pnpm build` — production build
- `pnpm type-check` — TypeScript type checking
- `pnpm lint --fix` — ESLint for TypeScript files with auto-fix (uses `@ycs77/eslint-config`)
- `pnpm eslint [...files] --fix` — ESLint for specific files with auto-fix

## Running the Server

```bash
pnpm build
node bin/apifable.js init                # create apifable.config.json
node bin/apifable.js mcp                 # uses spec from apifable.config.json
```

## Init Command

```bash
node bin/apifable.js init                # initialize apifable configuration (includes recipe selection)
```

## Add Command

```bash
node bin/apifable.js add <name>          # install a recipe to .apifable/recipes/
```

## Architecture

```
bin/
└── apifable.js               # CLI entry point (loads dist/index.js)
src/
├── index.ts                  # CLI (cac), spec loading, cache check, MCP server setup
├── types.ts                  # Shared types: ParsedSpec, EndpointEntry, SpecCache, RecipeMeta, ApifableConfig, etc.
├── logo.ts                   # ASCII Art logo with gradient color themes
├── config/
│   └── config.ts             # getConfigPath / readConfig / writeConfig / configExists
├── spec/
│   ├── loader.ts             # Read YAML/JSON file, compute SHA-256 hash
│   ├── parser.ts             # Build ParsedSpec index from raw OpenAPI object
│   └── ref-resolver.ts       # Recursive $ref expansion with cycle detection
├── cache/
│   └── cache.ts              # Read/write .apifable/cache/cache.json
├── recipes/
│   ├── loader.ts             # listRecipes / getRecipe / listUserRecipes / getUserRecipe
│   └── utils.ts              # isValidRecipeName
├── commands/
│   ├── init.ts               # initialize() — init command handler (includes recipe selection)
│   └── add.ts                # add(name) — install a recipe to .apifable/recipes/
└── tools/
    ├── get-spec-info.ts
    ├── list-endpoints-by-tag.ts
    ├── search-endpoints.ts
    ├── get-endpoint.ts
    └── get-schema.ts

skills/
├── apifable-codegen/
│   └── SKILL.md              # Claude Code skill for AI-driven code generation from spec
└── apifable-recipe-creator/
    └── SKILL.md              # Claude Code skill for creating custom recipes

recipes/                      # Built-in recipe .md files (top-level, included in package via `files`)

.apifable/
└── recipes/                  # User-installed recipes (via init or add)

apifable.config.json          # Project-level config (spec path)
```

## Config

- Location: `<cwd>/apifable.config.json`
- Format: `{ "spec": "openapi.yaml" }`
- Created by `apifable init`; should be committed to version control
- `configExists()` is used as a guard in the `mcp` command — exits with an error if the file is missing
- `--spec` in the `mcp` command overrides the config value when provided

## Cache

- Location: `<cwd>/.apifable/cache/cache.json`
- Key: SHA-256 hash of the YAML file content
- Invalidated automatically when the file changes
- Also invalidated when `CACHE_VERSION` constant in `src/types.ts` is bumped

## Recipes

- Built-in recipes live in the top-level `recipes/` directory (no longer copied by tsdown)
- At runtime, `src/recipes/loader.ts` resolves recipes via `join(import.meta.dirname, '..', 'recipes')` — since the bundle is at `dist/index.js`, this resolves to the top-level `recipes/`
- User recipes are stored in `<cwd>/.apifable/recipes/` after running `apifable init` (multiselect) or `apifable add <name>`; files with invalid frontmatter are silently skipped when listing
- Recipe frontmatter fields: `name`, `type`, `description` (parsed with `yaml` package)
- Recipe types: `fetch-snippet`, `form`, `api-types`, `backend-handler`
- The `skills/apifable-codegen/SKILL.md` skill handles AI-driven code generation using recipes + MCP tools
- The `skills/apifable-recipe-creator/SKILL.md` skill handles creating custom recipes from scratch

## Gotchas

- `search_endpoints` defaults to `limit: 10`; max is 100
- To force-invalidate all caches (e.g. after `ParsedSpec` shape changes), bump `CACHE_VERSION` in `src/types.ts`
- `search_endpoints` fuzzy fallback (`minisearch`, fuzzy: `0.2`, prefix matching): response includes `matchType: "exact" | "fuzzy"`, fuzzy results include `score`.

## MCP Tools

| Tool | Description |
|------|-------------|
| `get_spec_info` | API title, version, servers, and tag summary |
| `list_endpoints_by_tag` | All endpoints for a given tag |
| `search_endpoints` | Keyword search ranked by relevance; fuzzy fallback when no exact matches found |
| `get_endpoint` | Full endpoint details with resolved $refs |
| `get_schema` | Full schema with resolved $refs |
