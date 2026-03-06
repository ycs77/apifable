<div align="center">

![apifable banner](https://raw.githubusercontent.com/ycs77/apifable/main/banner.jpg)

# apifable

**Read the spec. Understand the API. Generate the types.**

[![NPM version][ico-version]][link-npm]
[![Software License][ico-license]](LICENSE)
[![Total Downloads][ico-downloads]][link-downloads]

English | [繁體中文](README-zh-TW.md)

</div>

---

## Overview

apifable helps AI agents work with OpenAPI specifications. It makes it easy to explore API structure, search endpoints, and generate TypeScript types — so your AI agent always has the context it needs to write accurate API code.

## ✨ Features

- 📦 **OpenAPI 3.0 / 3.1** — works with any standard OpenAPI spec
- 🤖 **MCP server** — plug into AI agents like Claude, Cursor, and Windsurf
- 🔍 **API exploration** — browse endpoints, search by keyword, and inspect full request/response details
- 🏷️ **TypeScript type generation** — generate ready-to-use type definitions from your spec

## Getting Started

### Installation

Run `apifable init` to set up your project configuration:

```bash
npx apifable@latest init
```

This creates `apifable.config.json` in your project root. The config file should be committed to version control so the spec path is shared with your team.

### Prepare Your Spec

`apifable fetch` reads `spec.path` and `spec.url` from `apifable.config.json` to download the spec locally:

```bash
npx apifable@latest fetch
```

#### Headers

For non-sensitive headers that can be shared with your team, add `spec.headers` to `apifable.config.json`:

```json
{
  "spec": {
    "path": "openapi.yaml",
    "url": "https://example.com/openapi.yaml",
    "headers": {
      "X-Api-Version": "2"
    }
  }
}
```

#### Auth Headers (Secret Tokens)

For private APIs that require authentication, store secret headers in `.apifable/auth.json` — this file should **not** be committed to version control:

```json
{
  "headers": {
    "Authorization": "Bearer YOUR_SECRET_TOKEN"
  }
}
```

Both `apifable.config.json` and `.apifable/auth.json` support `${ENV_VAR}` syntax in header values.

```json
{
  "headers": {
    "Authorization": "Bearer ${MY_API_KEY}"
  }
}
```

#### Headers Priority (highest to lowest)

1. `.apifable/auth.json` headers (overrides same-named keys)
2. `apifable.config.json` `spec.headers`

### Claude Code

Add the following to your `.mcp.json`:

```json
{
  "mcpServers": {
    "apifable": {
      "command": "npx",
      "args": ["-y", "apifable@latest", "mcp"]
    }
  }
}
```

For other AI agents such as Cursor and Windsurf, you can follow the same approach to configure apifable as an MCP server.

## Usage

Use these prompts by scenario to quickly move from API discovery to implementation.

### Understand the API first

```
What tags are available in this API?
```

```
What endpoints does this API have for lecturers and courses?
```

### Find the endpoint you need

```
Search for endpoints related to "lecturer course list"
```

```
List endpoints under the "Lecturer" tag
```

### Inspect request/response details

```
Show me the full details of `GET /lecturers/{id}/courses`
```

```
Show me the schema for LecturerCourseListResponse
```

### Generate types for coding

```
Generate TypeScript types for `GET /lecturers/{id}/courses`
```

```
Generate types for schemas: Lecturer, Course, LecturerCourseListResponse
```

### Ask for implementation directly

```
Build the lecturer's course list feature in React. Use the endpoint and schemas from this spec.
```

### Recommended Flow for Fast Development

For most tasks, this sequence gives the best result:

1. Start with API discovery (`get_spec_info` / `search_endpoints`)
2. Lock the exact contract (`get_endpoint` / `get_schema`)
3. Generate only needed types (`get_types`)
4. Ask the agent to implement UI or service code with those types

This keeps outputs precise and avoids generating unnecessary code.

### AI Agent Guidance

Add the following to your project's `AGENTS.md` to help AI agents use apifable more effectively:

````markdown
## API Integration (apifable)

- Always verify API paths and parameters with `get_endpoint` before writing code — never guess
- Use `get_types` to generate TypeScript types before implementing API calls
- Present all property names and values from apifable tools exactly as returned — do not omit, truncate, or simplify any part (e.g., keep full summary text including any prefixes like `[ 32 - 001 ]`)
- When saving generated types to files, save them under `src/types/` and name files by domain semantics (e.g., `src/types/auth.ts`, `src/types/user.ts`), not by OpenAPI tag names
````

## MCP Tools Reference

### `get_spec_info`

Returns the API title, version, description, servers, and all tags with their endpoint counts. Start here to understand the shape of an unfamiliar spec.

### `list_endpoints_by_tag`

**Inputs:**
- `tag` (string): The tag name to filter by

Returns all endpoints belonging to the given tag. Includes a warning when results exceed 30 items.

### `search_endpoints`

**Inputs:**
- `query` (string): Keyword to search for
- `tag` (string, optional): Restrict search to a specific tag
- `limit` (number, optional): Max results to return (default: 10)

Keyword search across operationId, path, summary, and description. Results are ranked by relevance. If no exact matches are found, automatically falls back to fuzzy search. The response includes a `matchType` field (`"exact"` or `"fuzzy"`); fuzzy results also include a `score` field per result.

### `get_endpoint`

**Inputs (choose one):**
- `method` (string) + `path` (string): HTTP method and endpoint path (e.g. `get` + `/users/{id}`)
- `operationId` (string): Operation ID (e.g. `listUsers`)

Returns the full endpoint object — parameters, requestBody, responses — with all `$ref`s resolved inline.

### `search_schemas`

**Inputs:**
- `query` (string): Keyword to search for
- `limit` (number, optional): Max results to return (default: 10)

Keyword search across schema name and description. Results are ranked by relevance. If no exact matches are found, automatically falls back to fuzzy search. The response includes a `matchType` field (`"exact"` or `"fuzzy"`); fuzzy results also include a `score` field per result.

### `get_schema`

**Inputs:**
- `name` (string): Schema name from `components/schemas`

Returns the full schema with all `$ref`s resolved.

### `get_types`

**Inputs (choose one mode):**
- `schemas` (string[]): Array of schema names from `components/schemas`
- `method` (string) + `path` (string): HTTP method and endpoint path
- `operationId` (string): Operation ID (e.g. `listUsers`)

Generates self-contained TypeScript declarations as code text. It automatically includes transitive dependencies and does not include import statements.

Mode rules:
- Use exactly one mode per call: `schemas`, `method` + `path`, or `operationId`
- Do not mix modes in the same call

Example payloads:

```json
{ "schemas": ["User", "Address"] }
```

```json
{ "method": "get", "path": "/lecturers/{id}/courses" }
```

```json
{ "operationId": "listUsers" }
```

## Why

While using AI agents like Claude Code to assist in frontend development, I realized that backend API integration remained a major pain point. Whenever I needed to generate corresponding API code, I often had to manually copy and paste API paths and parameters for the agent to understand—a process that was both tedious and inelegant.

So I turned my attention to the OpenAPI specification and found it to be a format perfectly suited for AI collaboration. However, no existing MCP tool met my standards at the time: some were close in functionality but couldn't handle large `openapi.yaml` files (up to 2MB), while others offered a clunky experience. I decided to build **apifable** via "Vibe Coding" with Claude Code, making it easy to query API specs through AI agents and generate precise TypeScript types.

## Sponsor

If you think this package has helped you, please consider [Becoming a sponsor](https://www.patreon.com/ycs77) to support my work~ and your avatar will be visible on my major projects.

<p align="center">
  <a href="https://www.patreon.com/ycs77">
    <img src="https://cdn.jsdelivr.net/gh/ycs77/static/sponsors.svg"/>
  </a>
</p>

<a href="https://www.patreon.com/ycs77">
  <img src="https://c5.patreon.com/external/logo/become_a_patron_button.png" alt="Become a Patron" />
</a>

## Credits

- [@reapi/mcp-openapi](https://github.com/ReAPI-com/mcp-openapi) — for the initial inspiration

## License

[MIT LICENSE](LICENSE)

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=ycs77/apifable&type=date)](https://www.star-history.com/#ycs77/apifable&type=date)

[ico-version]: https://img.shields.io/npm/v/apifable?style=flat-square
[ico-license]: https://img.shields.io/badge/license-MIT-brightgreen?style=flat-square
[ico-downloads]: https://img.shields.io/npm/dt/apifable?style=flat-square

[link-npm]: https://www.npmjs.com/package/apifable
[link-downloads]: https://www.npmjs.com/package/apifable
