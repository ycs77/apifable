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

`apifable fetch` reads `spec.path` and `spec.url` from `apifable.config.json` to download the spec locally.

For private APIs that require authentication, add a `spec.headers` field to your config:

```json
{
  "spec": {
    "path": "openapi.yaml",
    "url": "https://example.com/openapi.yaml",
    "headers": {
      "Authorization": "Bearer YOUR_TOKEN"
    }
  }
}
```

To fetch the spec, run:

```bash
npx apifable@latest fetch
```

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

This project uses apifable MCP server for OpenAPI spec exploration and type generation.

### Workflow

When working with API endpoints, follow this sequence:

1. **Discover** — Use `get_spec_info` to understand available tags and security schemes
2. **Find** — Use `search_endpoints` or `list_endpoints_by_tag` to locate the target endpoint
3. **Inspect** — Use `get_endpoint` to get full request/response details and security requirements
4. **Type** — Use `get_types` to generate TypeScript types for the endpoint
5. **Implement** — Write the feature code using the generated types

### Type File Naming

When saving generated types to files, use semantic English names based on the API domain:
- `auth.ts` — authentication/login related types
- `user.ts` — user profile and account types
- `post.ts` — blog post and article types
- `common.ts` — shared types used across multiple files

The agent decides file names based on schema semantics, not OpenAPI tag names.

### Rules

- Do not guess API paths or parameters, always verify with `get_endpoint` first
- Present all property name and values from apifable tools exactly as returned, do not omit, truncate, or simplify any part (e.g., keep full summary text including any prefixes like `[ 32 - 001 ]`)
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
