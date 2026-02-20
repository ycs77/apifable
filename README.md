<div align="center">

# apifable

**Read the spec. Understand the story. Generate the code.**

[![NPM version][ico-version]][link-npm]
[![Software License][ico-license]](LICENSE)
[![Total Downloads][ico-downloads]][link-downloads]

</div>

---

## Overview

apifable is a toolkit for deeply exploring OpenAPI specs and generating code from them. Built as an MCP server, it gives AI agents the tools to read, search, and understand any OpenAPI spec — then turn that knowledge into working code.

## ✨ Features

- 🗺️ Explore API structure, tags, and endpoints
- 🔍 Search endpoints by keyword
- 📋 Retrieve full endpoint details — parameters, request bodies, and responses
- 🧩 Fetch fully resolved schemas
- 🔗 Resolve all `$ref`s inline, including circular references
- ⚡ Cache parsed specs to disk for fast startup

## Tools

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

Keyword search across operationId, path, summary, and description. Results are ranked by relevance.

### `get_endpoint`

**Inputs:**
- `method` (string): HTTP method (e.g. `get`, `post`)
- `path` (string): Endpoint path (e.g. `/users/{id}`)

Returns the full endpoint object — parameters, requestBody, responses — with all `$ref`s resolved inline.

### `get_schema`

**Inputs:**
- `name` (string): Schema name from `components/schemas`

Returns the full schema with all `$ref`s resolved. Lists available schema names on error.

## Recommended Query Pattern

```
1. get_spec_info          → understand tags and structure
2. search_endpoints       → find relevant endpoints by keyword
3. get_endpoint           → fetch full details for a specific endpoint
4. get_schema             → fetch a schema referenced in the endpoint
```

## Installation

### Using Claude Desktop

Add the following to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "apifable": {
      "command": "npx",
      "args": ["-y", "apifable", "mcp", "--spec", "/absolute/path/to/your/openapi.yaml"]
    }
  }
}
```

Replace `/absolute/path/to/your/openapi.yaml` with the path to your OpenAPI spec file in the Claude Desktop directory.

## License

[MIT LICENSE](LICENSE.md)

[ico-version]: https://img.shields.io/npm/v/apifable?style=flat-square
[ico-license]: https://img.shields.io/badge/license-MIT-brightgreen?style=flat-square
[ico-downloads]: https://img.shields.io/npm/dt/apifable?style=flat-square

[link-npm]: https://www.npmjs.com/package/apifable
[link-downloads]: https://www.npmjs.com/package/apifable
