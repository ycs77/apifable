# AGENTS.md

## Keep This File Strict

- Do not add repo tours, architecture summaries, or file inventories.
- Only keep constraints, non-obvious behavior, and things an agent must not do.
- If a fact is easy to find with grep, it probably does not belong here.

## Constraints

- Node.js v22+
- Zod v4
- MCP SDK protocol version `2025-11-25` (stable)
- Bundler is `tsdown`, not `tsc`
- TypeScript formatting: 2 spaces, single quotes, no semicolons, trailing commas

## Commands

- `pnpm build`
- `pnpm type-check`
- `pnpm test --run`
- `pnpm lint --fix`
- `pnpm eslint [...files] --fix`

## Rules

- Config priority: CLI flag > config > default value
- Prefer pure-function tests first; controlled temp-dir fs tests are allowed, but skip MCP handlers, CLI code, prompt flows, process.exit paths, and real network calls
- Do not reintroduce ParsedSpec cache assumptions; parsed specs are built directly

## Non-Obvious Behavior

- `HTTP_METHODS` and `isValidHttpMethod` live in `src/http-methods.ts`; do not re-declare method lists in tools or parsers
- `search_endpoints` default `limit` is 10; max is 100
- `search_schemas` default `limit` is 10; max is 100
- `search_endpoints` and `search_schemas` return real match count in `total`; truncated responses use `hasMore`
- `search_endpoints` fuzzy fallback uses MiniSearch with `fuzzy: 0.2` and prefix matching; response includes `matchType`, fuzzy results include `score`, empty fuzzy results include `message`
- `get_endpoint` validates mutually exclusive modes in the tool function, not the handler; valid modes are `method` + `path` or `operationId`; empty `operationId` is an error
- `get_endpoint`, `get_types`, `get_schema`, and `list_endpoints_by_tag` use `src/tools/suggestions.ts` for guided not-found errors; `findSimilarNames` tries substring matches before MiniSearch fuzzy fallback and returns up to 5 suggestions
- `list_endpoints_by_tag` supports `limit` and `offset`; response includes `total`, `offset`, `hasMore`; warn when `total > 30 && limit === undefined`
- `get_types` accepts exactly one mode per call: `schemas`, `method` + `path`, or `operationId`; mixing modes is an error
- `get_types` returns self-contained TypeScript declarations as code text with no imports
- `get_types` supports inline JSON request/response schemas through `src/tools/inline-schemas.ts`; names are `{PascalOperationId}Request|Response` or `{Method}{NormalizedPath}Request|Response` when there is no `operationId`
- Inline schema extraction only promotes top-level non-`$ref` JSON request schemas and first 2xx response schemas to inline roots; nested `$ref` values still use normal dependency tracking
- Zod schemas use `.loose()` to allow unknown keys; path-specific errors for invalid known field types (not `.passthrough()` which is deprecated in Zod v4)
- Auth headers live in `.apifable/auth.json` and are not version-controlled; `spec.headers` in config is for non-secret headers; auth values override config on key conflict; both support `${ENV_VAR}` expansion and keep undefined vars unchanged
