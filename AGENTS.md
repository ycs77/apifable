# AGENTS.md

## Constraints

- Node.js v22+, Zod v4
- MCP SDK protocol version `2025-11-25` (stable)
- Bundler is `tsdown` (not tsc)
- TypeScript formatting: 2 spaces, single quotes, no semicolons, trailing commas

## Commands

- `pnpm build` — production build
- `pnpm type-check` — TypeScript type checking
- `pnpm test --run` — run Vitest unit tests once
- `pnpm lint --fix` — ESLint for TypeScript files with auto-fix (uses `@ycs77/eslint-config`)
- `pnpm eslint [...files] --fix` — ESLint for specific files with auto-fix

## Config

- Priority: CLI flag > config > default value
- `types.commonFileName` default: `common` (produces `common.ts`)

## Gotchas

- `search_endpoints` defaults to `limit: 10`; max is 100
- To force-invalidate all caches (e.g. after `ParsedSpec` shape changes), bump `CACHE_VERSION` in `src/types.ts`
- `search_endpoints` fuzzy fallback (`minisearch`, fuzzy: `0.2`, prefix matching): response includes `matchType: "exact" | "fuzzy"`, fuzzy results include `score`
- `get_endpoint` accepts either `method` + `path` or `operationId` (mutually exclusive)
- `generate_types` supports exactly one mode per call: `schemas` (schema names), `method` + `path` (endpoint), or `operationId`; mixing modes returns an error
- `generate_types` returns self-contained TypeScript declarations as code text (no import statements)
