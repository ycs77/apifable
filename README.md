<div align="center">

![apifable banner](https://raw.githubusercontent.com/ycs77/apifable/main/banner.jpg)

# apifable

**Read the spec. Understand the API. Integrate with confidence.**

[![NPM version][ico-version]][link-npm]
[![Software License][ico-license]](LICENSE)
[![Total Downloads][ico-downloads]][link-downloads]

English | [繁體中文](README-zh-TW.md)

</div>

---

## Overview

apifable is an MCP server that helps AI integrate APIs more smoothly into TypeScript frontend projects. It makes it easy to explore API structure, search endpoints, and generate TypeScript types, giving your AI agent the context it needs to write accurate integration code.

## ✨ Features

- 📦 **AI-ready API context** — give AI the structure it needs to understand and work with your API
- 📘 **OpenAPI 3.0 / 3.1 support** — works with standard specs as a reliable source of truth
- 🤖 **MCP server for AI agents** — plug into Claude, Cursor, and Windsurf
- 🔍 **API exploration tools** — browse endpoints, search by keyword, and inspect full request/response details
- 🏷️ **TypeScript type generation** — generate TypeScript type definitions ready to use in frontend code

## Getting Started

### Installation

Run `apifable init` to set up your project configuration:

```bash
npx apifable@latest init
```

This creates `apifable.config.json` in your project root. The config file should be committed to version control so the spec path is shared with your team.

After the command starts, you can choose between **Manual file** and **Remote URL**.

#### 1. Manual file

Use this mode if your OpenAPI spec already lives in the project, or if you want to manage spec updates yourself.

init will ask for the local file path, such as `openapi.yaml`.

You then need to place your OpenAPI spec at that path manually. When the backend API changes, you also need to update that file manually.

#### 2. Remote URL

Use this mode if your OpenAPI spec is available from a stable remote URL, such as the OpenAPI spec endpoint provided by your backend API docs.

init will first ask for the remote URL, such as `https://api.example.com/openapi.yaml`, and then ask for the local output path, such as `./openapi.yaml`.

> [!NOTE]
> In this mode, `init` also adds the downloaded local spec path to `.gitignore` automatically, because the file is intended to be refreshed from the remote source.

You can then run the following command to download the OpenAPI spec from the remote URL to your local path (`spec.url` → `spec.path`). Whenever the spec changes, just run it again to refresh:

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

If downloading the remote OpenAPI spec requires authentication (private API), store secret headers in `.apifable/auth.json`. This file should **not** be committed to version control:

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

Here are some example prompts you can use to explore APIs and build features.

### Explore the API

```
List all APIs
```

```
Show me APIs related to posts
```

```
List APIs under the Post tag
```

```
Show me the API details for post comments
```

```
Show me the API details for GET /posts/{id}/comments
```

```
Show me the API details for postComments
```

### Build a feature

```
Implement the post comments feature

Post page: src/pages/posts/[id].tsx

Related APIs:
- GET /posts/{id}/comments (list post comments)
- POST /posts/{id}/comments (create a post comment)
```

> [!TIP]
> When writing a prompt to build a feature, include relevant context: page paths, component locations, related APIs, and any patterns or examples to follow.

### AI Agent Guidance

Add the following to your project's `AGENTS.md` to help AI agents use apifable more effectively:

```markdown
## API Integration (apifable)

- Always use `get_endpoint` to verify the exact path, method, and parameters before writing integration code. Never assume.
- When presenting endpoint list data from apifable tools, display exactly these columns in order: `Method` (Uppercase), `Path`, `Summary`. Keep all values verbatim, including summary prefixes like `[ 32 - 001 ]`. Do not omit, rename, paraphrase, or add extra columns.
- When saving generated types, store them under `src/types/` and name files by domain (e.g., `src/types/auth.ts`, `src/types/user.ts`), not by OpenAPI tag names.
```

The above is a recommended starting point. Feel free to adjust the endpoint list columns and the types folder path to match your project.

## MCP Tools Reference

### `get_spec_info`

Returns the API title, version, description, servers, and all tags with their endpoint counts. Start here to understand the shape of an unfamiliar spec.

### `list_endpoints_by_tag`

**Inputs:**
- `tag` (string): The tag name to filter by
- `limit` (number, optional): Max endpoints to return
- `offset` (number, optional): Number of endpoints to skip (default: 0)

Returns all endpoints belonging to the given tag. The response includes `total`, `offset`, and `hasMore` fields for pagination. Includes a warning when results exceed 30 items and no `limit` is specified.

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

Returns the full endpoint object, including parameters, requestBody, and responses, with supported internal component `$ref`s resolved inline.

### `search_schemas`

**Inputs:**
- `query` (string): Keyword to search for
- `limit` (number, optional): Max results to return (default: 10)

Keyword search across schema name and description. Results are ranked by relevance. If no exact matches are found, automatically falls back to fuzzy search. The response includes a `matchType` field (`"exact"` or `"fuzzy"`); fuzzy results also include a `score` field per result. Empty results may also include a `message` field with guidance for the next step.

### `get_schema`

**Inputs:**
- `name` (string): Schema name from `components/schemas`

Returns the full schema with supported internal component `$ref`s resolved.

### `get_types`

**Inputs (choose one mode):**
- `schemas` (string[]): Array of schema names from `components/schemas`
- `method` (string) + `path` (string): HTTP method and endpoint path
- `operationId` (string): Operation ID (e.g. `listUsers`)

Generates self-contained TypeScript declarations as code text. In endpoint mode it follows supported internal component `$ref`s before collecting schema dependencies. It automatically includes transitive dependencies and does not include import statements.

Mode rules:
- Use exactly one mode per call: `schemas`, `method` + `path`, or `operationId`
- Do not mix modes in the same call

## Limitations

- External `$ref`s (e.g. references to other files or URLs) are not supported.
- OpenAPI 2.0 (Swagger) is not supported. Only OpenAPI 3.0 and 3.1 specs are supported.

## Sponsor

If you think this package has helped you, please consider [Becoming a sponsor](https://www.patreon.com/ycs77) to support my work~ and your avatar will be visible on my major projects.

<p align="center">
  <a href="https://www.patreon.com/ycs77">
    <img src="https://cdn.jsdelivr.net/gh/ycs77/static/sponsors.svg" alt="Sponsors" />
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
