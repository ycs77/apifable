---
name: apifable-codegen
description: Generate code from an OpenAPI spec using apifable recipes. Use when the user wants to generate TypeScript types/interfaces from API schemas, TypeScript fetch functions, React custom hooks (with loading/error state), React form components (react-hook-form + zod), or Express/Hono route handlers from API endpoints. Reads .apifable/recipes/ for style guides, uses apifable MCP tools to fetch spec data, and writes generated code to project files.
---

You are generating code from an OpenAPI spec using apifable recipes. Follow this workflow:

## Step 1: Verify MCP tools are available

Call `get_spec_info`. If the call fails, the apifable MCP server is not running — inform the user and ask them to start it:

```bash
npx apifable@latest mcp --spec ./path/to/openapi.yaml
```

If successful, show the user a brief summary (title, version, available tags).

## Step 2: Find the right recipe

First, determine which recipe type is needed based on the user's request:

| Request type | Recipe name | `type` value |
|---|---|---|
| TypeScript types/interfaces | `api-types` | `api-types` |
| Fetch functions | `fetch-ts` | `fetch-snippet` |
| React hooks | `fetch-react-hook` | `fetch-snippet` |
| React forms | `form-react` | `form` |
| Express handlers | `backend-express` | `backend-handler` |
| Hono handlers | `backend-hono` | `backend-handler` |

Check `.apifable/recipes/` in the project root for an installed recipe matching the needed type. If found, use it.

If no matching recipe is installed, check available built-in recipes:

```bash
npx apifable@latest recipe list
```

If a suitable built-in recipe exists, offer to install it:

```bash
npx apifable@latest recipe add <name>
```

If the user declines, or if no built-in recipe fits the user's needs, generate a custom recipe `.md` file and write it to `.apifable/recipes/<name>.md`. Use the following format (frontmatter + `## Rules` + `## Example`):

````
---
name: <name>
type: <type>  # fetch-snippet | form | api-types | backend-handler
description: <description>
---

## Rules

- <Rule describing naming conventions>
- <Rule describing code structure>
- <Rule describing types or imports>

## Example

Given <context (e.g. endpoint or schema)>:

```<language>
// example code
```
````

## Step 3: Fetch spec data

Use the appropriate MCP tools to get the data needed for code generation:

- **For types from schemas (api-types)**:
  1. Use the schema list returned by `get_spec_info` in Step 1.
  2. If total schemas ≤ 20, call `get_schema` for all of them, then proceed to Step 4.
  3. If total schemas > 20, show the list to the user and ask before proceeding:
     > Found N schemas. How would you like to proceed?
     > - All schemas (one file per tag)
     > - Specific tags only
     > - Specific schemas only
  4. Depending on the chosen option:
     - **All schemas or Specific tags only**: use `list_endpoints_by_tag` for each tag to identify which schemas are referenced by that tag's endpoints. Schemas not tied to any tag go into a shared file (e.g. `common.ts`). If a schema is referenced by multiple tags, ask the user which file it should go into.
     - **Specific schemas only**: call `get_schema` directly for the specified schemas. No tag grouping needed.
  5. Proceed to Step 4 to confirm the output path before generating.
- **For endpoint handlers/hooks/fetch functions**: Use `search_endpoints` or `list_endpoints_by_tag` to discover relevant endpoints, then call `get_endpoint` for **each** endpoint individually to get its full request/response schema.

Always resolve all `$ref` references — the MCP tools do this automatically.

> Note: `search_endpoints` defaults to `limit: 10` (max 100). Increase it if you need to cover more endpoints.

## Step 4: Confirm output path

If the user has not specified an output path, ask before generating.

- For a **single file** (most cases, including api-types "Specific schemas only"):
  > Where should I write the generated code? (e.g., `src/api/users.ts`)

- For **api-types split by tag** ("All schemas" or "Specific tags only"):
  > Where should I write the generated files? (e.g., `src/types/` — each tag will be written as `<tag>.ts`)

## Step 5: Generate and write code

Read the recipe file from `.apifable/recipes/` to get the style guide.

Generate code by following the recipe's rules and examples exactly:
- Match the naming conventions specified in the recipe
- Follow the code structure shown in the examples
- Use the exact types derived from the spec data
- Generate one function/component/type per endpoint or schema unless the user requests otherwise

**For api-types — single file** (≤ 20 schemas, or "Specific schemas only"):
All schemas were already fetched in Step 3. Generate all types, then write to the confirmed file. If the file already exists, show the user the content that will be added and confirm before overwriting or appending.

**For api-types — batch mode** ("All schemas" or "Specific tags only" with > 20 schemas):
For each tag in the confirmed scope:
1. Fetch the tag's schemas in **fixed batches of 15 in declaration order** using `get_schema`.
2. Generate types for the batch.
3. Append to `<output-dir>/<tag>.ts` (write on first batch of each file, append after).
4. Confirm progress with the user before moving to the next tag.

**For all other recipe types** (fetch functions, hooks, forms, handlers):
Generate and write to the confirmed file. If the file already exists, show the user the content that will be added and confirm before overwriting or appending.

After all writing is done, briefly confirm what was generated and where it was saved.
