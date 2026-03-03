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

apifable helps AI agents work with OpenAPI 3.0/3.1 specifications. It makes it easy to explore API structure, search endpoints, and generate TypeScript types — so your AI agent always has the context it needs to write accurate API code.

## ✨ Features

- 🤖 **MCP server** — plug into AI agents like Claude out of the box
- 🗺️ **Spec overview** — get a clear summary of any API's structure and available endpoints
- 🔍 **Endpoint search** — find relevant endpoints fast with keyword search and fuzzy fallback
- 📋 **Full endpoint details** — inspect any endpoint in full detail with all `$ref`s resolved
- 🧩 **Schema browser** — explore schemas with all references fully resolved
- 🏷️ **TypeScript type generation** — generate type definitions directly from your OpenAPI spec

## Getting Started

### Installation

Run `apifable init` to set up your project configuration:

```bash
npx apifable@latest init
```

This creates `apifable.config.json` in your project root. The config file should be committed to version control so the spec path is shared with your team.

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

You can also fetch the spec and generate TypeScript types in one step:

```bash
npx apifable@latest fetch --types
```

Alternatively, run type generation separately:

```bash
npx apifable@latest generate-types
```

## Usage

### Quick Prompt Playbook

Use these prompts by scenario to quickly move from API discovery to implementation.

#### 1. Understand the API first

```
What tags are available in this API?
```

```
What endpoints does this API have for lecturers and courses?
```

#### 2. Find the endpoint you need

```
Search for endpoints related to "lecturer course list"
```

```
List endpoints under the "Lecturer" tag
```

#### 3. Inspect request/response details

```
Show me the full details of `GET /lecturers/{id}/courses`
```

```
Show me the schema for LecturerCourseListResponse
```

#### 4. Generate types for coding

```
Generate TypeScript types for `GET /lecturers/{id}/courses`
```

```
Generate types for schemas: Lecturer, Course, LecturerCourseListResponse
```

#### 5. Ask for implementation directly

```
Build the lecturer's course list feature in React. Use the endpoint and schemas from this spec.
```

### Recommended Flow for Fast Development

For most tasks, this sequence gives the best result:

1. Start with API discovery (`get_spec_info` / `search_endpoints`)
2. Lock the exact contract (`get_endpoint` / `get_schema`)
3. Generate only needed types (`generate_types`)
4. Ask the agent to implement UI or service code with those types

This keeps outputs precise and avoids generating unnecessary code.

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

### `get_schema`

**Inputs:**
- `name` (string): Schema name from `components/schemas`

Returns the full schema with all `$ref`s resolved. Lists available schema names on error.

### `generate_types`

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

I was working on a frontend project, using AI agents like Claude Code to help me generate code — but the backend API part didn't work so well with the agent. Whenever I needed to generate the corresponding API code, copy and paste seemed to be the only option, and that was both tedious and inelegant.

So I turned my attention to the OpenAPI specification. I realized it was a great format for collaborating with agents, but at the time no existing MCP tool met my standards. Some came close, but couldn't properly handle openapi.yaml files as large as 2 MB. So I teamed up with Claude Code to build apifable, making it easy to query API specs through AI agents and generate TypeScript types from them.

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
