<div align="center">

![apifable banner](https://raw.githubusercontent.com/ycs77/apifable/main/banner.jpg)

# apifable

**讀取規格。理解 API。生成型別。**

[![NPM version][ico-version]][link-npm]
[![Software License][ico-license]](LICENSE)
[![Total Downloads][ico-downloads]][link-downloads]

[English](README.md) | 繁體中文

</div>

---

## 概覽

apifable 幫助 AI Agent 讀取 OpenAPI 規格。輕鬆探索 API 結構、搜尋端點、生成 TypeScript 型別——讓你的 AI Agent 隨時掌握所需的上下文，寫出準確的 API 程式碼。

## ✨ 功能特色

- 🤖 **MCP 伺服器** — 開箱即用，直接接入 Claude 等 AI 代理
- 🗺️ **規格概覽** — 清晰呈現任何 API 的結構與可用端點
- 🔍 **端點搜尋** — 透過關鍵字搜尋快速定位相關端點，並支援模糊搜尋
- 📋 **完整端點詳情** — 查看任意端點的完整資訊，所有 `$ref` 均已內聯解析
- 🧩 **Schema 瀏覽器** — 瀏覽所有參考均已完整解析的 Schema
- 🏷️ **TypeScript 型別生成** — 直接從 OpenAPI 規格生成型別定義

## 開始使用

### 安裝

執行 `apifable init` 以建立專案設定檔：

```bash
npx apifable@latest init
```

這會在專案根目錄建立 `apifable.config.json`，設定檔應提交至版本控制，讓團隊共享相同的規格路徑。

### Claude Code

在 `.mcp.json` 中加入以下設定：

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

其他 AI Agent 如 Cursor、Windsurf 等，可以參考上述方式將 apifable 設定為 MCP 伺服器。

## 使用方式

### 範例提示詞

```
Petstore API 有哪些端點？
```

```
給我看 CreateOrder 的 Schema
```

```
搜尋和 "user" 相關的端點
```

```
顯示 `GET /pets/{petId}` 的完整詳情
```

```
這個 API 有哪些 Tag？
```

## CLI 指令

### 下載 Spec

`apifable fetch` 會從 `apifable.config.json` 讀取 `spec.path` 和 `spec.url`，下載規格至本地。

若 API 需要驗證（私有 API），可在設定檔中加入 `spec.headers`：

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

設定完成後，執行以下指令下載規格：

```bash
npx apifable@latest fetch
```

### 產生型別

直接從 OpenAPI 規格產生 TypeScript 型別：

```bash
npx apifable@latest generate-types
```

## MCP Tools 參考

### `get_spec_info`

回傳 API 的標題、版本、描述、伺服器列表，以及所有 Tag 與其端點數量。探索陌生規格時，建議從這裡開始。

### `list_endpoints_by_tag`

**輸入：**
- `tag`（string）：要篩選的 Tag 名稱

回傳屬於指定 Tag 的所有端點。當結果超過 30 筆時會顯示警告。

### `search_endpoints`

**輸入：**
- `query`（string）：搜尋關鍵字
- `tag`（string，optional）：將搜尋限制在特定 Tag 內
- `limit`（number，optional）：最多回傳幾筆結果（預設：10）

跨 operationId、路徑、摘要及描述的關鍵字搜尋，結果依相關性排序。若無精確匹配結果，會自動切換為模糊搜尋。回應包含 `matchType` 欄位（`"exact"` 或 `"fuzzy"`）；模糊搜尋結果另含每筆結果的 `score` 欄位。

### `get_endpoint`

**輸入：**
- `method`（string）：HTTP 方法（例如 `get`、`post`）
- `path`（string）：端點路徑（例如 `/users/{id}`）

回傳完整的端點物件——參數、請求體、回應——所有 `$ref` 均已內聯解析。

### `get_schema`

**輸入：**
- `name`（string）：`components/schemas` 中的 Schema 名稱

回傳所有 `$ref` 均已解析的完整 Schema。發生錯誤時會列出可用的 Schema 名稱。

### `generate_types`

**輸入（擇一模式）：**
- `schemas`（string[]，optional）：`components/schemas` 中的 Schema 名稱陣列
- `method`（string，optional）：端點模式的 HTTP 方法（例如 `get`、`post`）
- `path`（string，optional）：端點路徑（例如 `/users/{id}`）

回傳 self-contained 的 TypeScript 宣告程式碼文字。會自動包含 transitive dependencies，且不包含 import 陳述式。

模式規則：
- 一次呼叫只能使用 `schemas` 模式或 `method` + `path` 模式其中之一
- 不能在同一個呼叫中混用兩種模式
- 端點模式必須同時提供 `method` 與 `path`

範例 payload：

```json
{ "schemas": ["User", "Address"] }
```

```json
{ "method": "get", "path": "/lecturers/{id}/courses" }
```

## 為什麼

當時我正在開發前端專案，配合 Claude Code 等 AI Agent 來幫助我產生程式碼，但唯獨後端的 API 部分無法和 Agent 配合得很好。需要產生對應的 API 程式碼時，似乎複製貼上是唯一的方法，但這樣既麻煩又不優雅。

於是我把注意力轉向了 OpenAPI 協定，我發現這是一個很適合和 Agent 協作的格式，但當時都沒有一個 MCP 工具可以達到我的標準。有些工具接近我的需求，但無法正常讀取高達 2MB 的 openapi.yaml 檔案。因此我和 Claude Code 合作，打造了 apifable，可以輕鬆地透過 AI Agent 查詢 API 規格，並從中生成 TypeScript 型別。

## 贊助

如果我製作的套件對你有幫助，歡迎考慮[贊助我](https://www.patreon.com/ycs77)來支持我的工作~ 我會很感謝你~ 而且您的大頭貼還可以顯示在我的主要專案中。

<p align="center">
  <a href="https://www.patreon.com/ycs77">
    <img src="https://cdn.jsdelivr.net/gh/ycs77/static/sponsors.svg"/>
  </a>
</p>

<a href="https://www.patreon.com/ycs77">
  <img src="https://c5.patreon.com/external/logo/become_a_patron_button.png" alt="Become a Patron" />
</a>

## License

[MIT LICENSE](LICENSE)

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=ycs77/apifable&type=date)](https://www.star-history.com/#ycs77/apifable&type=date)

[ico-version]: https://img.shields.io/npm/v/apifable?style=flat-square
[ico-license]: https://img.shields.io/badge/license-MIT-brightgreen?style=flat-square
[ico-downloads]: https://img.shields.io/npm/dt/apifable?style=flat-square

[link-npm]: https://www.npmjs.com/package/apifable
[link-downloads]: https://www.npmjs.com/package/apifable
