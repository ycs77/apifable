---
name: apifable-recipe-creator
description: Create a custom apifable recipe for code generation. Use when the user wants to define a new style guide recipe for generating TypeScript fetch functions, React hooks, React forms, or BFF route handlers from OpenAPI specs. Writes the recipe to .apifable/recipes/ for use with /apifable-codegen.
---

You are creating a custom apifable recipe. Follow this workflow:

## Step 1: Clarify requirements

Ask the user for:

1. **Recipe type** — one of:
   - `fetch-snippet` — fetch functions or React hooks
   - `form` — form components
   - `bff` — BFF route handlers (e.g. Next.js API routes, Nuxt server routes, Astro endpoints)

2. **Recipe name** — must be kebab-case (e.g. `fetch-axios`, `form-shadcn`). Must match the pattern `/^[a-z0-9][\w-]*$/i` (starts with alphanumeric, then word chars or hyphens).

3. **Any specific conventions** — naming patterns, error handling style, import preferences, etc.

## Step 2: Check for conflicts

Read the `.apifable/recipes/` directory in the project root.

- If a recipe with the **same name** already exists, ask the user whether to overwrite it or choose a different name.

## Step 3: Generate recipe content

Create the recipe following this exact format:

```
---
name: <name>
type: <type>
description: <one-line description>
---

## Rules

- <Concrete, actionable rule about naming conventions>
- <Rule about code structure or patterns>
- <Rule about types, imports, or dependencies>
- ...

## Example

Given <OpenAPI context (e.g. endpoint or schema)>:

\```<language>
// generated code example
\```
```

Guidelines for writing good recipes:

- **Rules** must be specific and actionable — avoid vague statements like "write clean code". Each rule should directly guide code generation (e.g. "Function name uses the operationId converted to camelCase").
- **Examples** must use realistic OpenAPI context (e.g. `GET /users/{id}` with operationId `getUserById` returning `User`). Include at least 2 examples covering different HTTP methods or patterns (e.g. GET + POST, or a simple endpoint + one with query params).
- **Frontmatter** must use exactly three fields: `name`, `type`, `description`. The `type` field must be one of: `fetch-snippet`, `form`, `bff`.

## Step 4: Write the recipe file

Write the generated content to `.apifable/recipes/<name>.md`.

After writing, confirm:
- The file path where the recipe was saved
- A brief summary of what the recipe does
- Remind the user they can now use `/apifable-codegen` to generate code with this recipe
