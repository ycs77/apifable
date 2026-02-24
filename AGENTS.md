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
node bin/apifable.js mcp --spec ./path/to/openapi.yaml  # also accepts .json
```

## Recipe Commands

```bash
node bin/apifable.js recipe list               # list all built-in recipes
node bin/apifable.js recipe add <name>         # install a built-in recipe to .apifable/recipes/
```

## Architecture

```
bin/
└── apifable.js               # CLI entry point (loads dist/index.js)
src/
├── index.ts                  # CLI (cac), spec loading, cache check, MCP server setup
├── types.ts                  # Shared types: ParsedSpec, EndpointEntry, SpecCache, RecipeMeta, etc.
├── spec/
│   ├── loader.ts             # Read YAML/JSON file, compute SHA-256 hash
│   ├── parser.ts             # Build ParsedSpec index from raw OpenAPI object
│   └── ref-resolver.ts       # Recursive $ref expansion with cycle detection
├── cache/
│   └── cache.ts              # Read/write .apifable/cache/cache.json
├── recipes/
│   ├── loader.ts             # listBuiltinRecipes / getBuiltinRecipe / listUserRecipes / getUserRecipe
│   └── built-in/             # Built-in style guide .md files (copied to dist/recipes/built-in/ at build)
│       ├── fetch-ts.md
│       ├── fetch-react-hook.md
│       ├── form-react.md
│       ├── api-types.md
│       ├── backend-express.md
│       └── backend-hono.md
├── commands/
│   └── recipe.ts             # recipeList() / recipeAdd(name) — CLI handlers
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

.apifable/
└── recipes/                  # User-installed recipes (via recipe add)
```

## Cache

- Location: `<cwd>/.apifable/cache/cache.json`
- Key: SHA-256 hash of the YAML file content
- Invalidated automatically when the file changes
- Also invalidated when `CACHE_VERSION` constant in `src/types.ts` is bumped

## Recipes

- Built-in recipes live in `src/recipes/built-in/*.md`; tsdown copies the `built-in/` directory to `dist/recipes/` at build time, resulting in `dist/recipes/built-in/`
- At runtime, `src/recipes/loader.ts` resolves built-in recipes via `join(import.meta.dirname, 'recipes', 'built-in')` — since everything is bundled into `dist/index.js`, `import.meta.dirname` = `dist/`
- User recipes are stored in `<cwd>/.apifable/recipes/` after running `recipe add <name>`; files with invalid frontmatter are silently skipped when listing
- `recipe list` displays built-in recipes only (Name, Type, Description columns); user recipes are not listed
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
