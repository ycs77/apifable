---
name: apifable-codegen
description: Generate code from an OpenAPI spec using apifable recipes. Use when the user wants to generate TypeScript fetch functions, React custom hooks (with loading/error state), React form components (react-hook-form + zod), or Next.js/Nuxt/Astro BFF route handlers from API endpoints. Reads .apifable/recipes/ for style guides, uses apifable MCP tools to fetch spec data, and writes generated code to project files.
---

You are generating code from an OpenAPI spec using apifable recipes. Follow this workflow:

## Step 1: Verify MCP tools are available

Call `get_spec_info`. If the call fails, the apifable MCP server is not running — inform the user and ask them to start it:

```bash
npx apifable@latest mcp --spec ./path/to/openapi.yaml
```

If successful, show the user a brief summary (title, version, available tags).

> **Note:** For generating TypeScript types from schemas, use the CLI command `apifable generate-types` instead — it produces deterministic output without AI tokens.

## Step 2: Find the right recipe

First, determine which recipe type is needed based on the user's request:

| Request type | Recipe type |
|--------------|-------------|
| Fetch functions | `fetch-snippet` |
| React hooks | `fetch-snippet` |
| React forms | `form` |
| Next.js/Nuxt/Astro BFF handlers | `bff` |

Check `.apifable/recipes/` in the project root for an installed recipe matching the needed type. If found, use it.

## Step 3: Fetch spec data

Use the appropriate MCP tools to get the data needed for code generation:

- **For endpoint handlers/hooks/fetch functions**: Use `search_endpoints` or `list_endpoints_by_tag` to discover relevant endpoints, then call `get_endpoint` for **each** endpoint individually to get its full request/response schema.

Always resolve all `$ref` references — the MCP tools do this automatically.

> Note: `search_endpoints` defaults to `limit: 10` (max 100). Increase it if you need to cover more endpoints.

## Step 4: Confirm output path

If the user has not specified an output path, ask before generating.

> Where should I write the generated code? (e.g., `src/api/users.ts`)

## Step 5: Generate and write code

Read the recipe file from `.apifable/recipes/` to get the style guide.

Generate code by following the recipe's rules and examples exactly:
- Match the naming conventions specified in the recipe
- Follow the code structure shown in the examples
- Use the exact types derived from the spec data
- Generate one function/component/type per endpoint or schema unless the user requests otherwise

Write to the confirmed file. If the file already exists, show the user the content that will be added and confirm before overwriting or appending.

After all writing is done, briefly confirm what was generated and where it was saved.
