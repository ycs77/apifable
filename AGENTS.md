# AGENTS.md

## Technology Stack

- Node.js v24+
- TypeScript
- MCP SDK (`@modelcontextprotocol/sdk`)
- Zod (schema validation)
- tsdown (bundler, not tsc)

## TypeScript Formatting

2 spaces, single quotes, no semicolons, trailing commas.

## Commands

- `pnpm build` — production build
- `pnpm lint --fix` — ESLint for TypeScript files with auto-fix (uses `@ycs77/eslint-config`)
- `pnpm eslint [...files] --fix` — ESLint for specific files with auto-fix
