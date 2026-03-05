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

apifable 幫助 AI Agent 讀取 OpenAPI 規格。輕鬆探索 API 結構、搜尋 Endpoint、生成 TypeScript 型別——讓你的 AI Agent 隨時掌握所需的上下文，寫出準確的 API 程式碼。

## ✨ 功能特色

- 📦 **OpenAPI 3.0 / 3.1** — 支援任何標準 OpenAPI 規格
- 🤖 **MCP 伺服器** — 直接接入 Claude、Cursor、Windsurf 等 AI 代理
- 🔍 **API 探索** — 瀏覽 Endpoint、關鍵字搜尋、查看完整的 request/response 細節
- 🏷️ **TypeScript 型別生成** — 從規格直接產生可用的型別定義

## 開始使用

### 安裝

執行 `apifable init` 以建立專案設定檔：

```bash
npx apifable@latest init
```

這會在專案根目錄建立 `apifable.config.json`，設定檔應提交至版本控制，讓團隊共享相同的規格路徑。

### 準備你的 Spec

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

執行以下指令下載規格：

```bash
npx apifable@latest fetch
```

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

可依照常見情境直接使用以下提示詞，快速從「找 API」走到「完成開發」。

### 先掌握 API 全貌

```
這個 API 有哪些 Tag？
```

```
這份規格中，和講師與課程相關的 Endpoint 有哪些？
```

### 快速定位需要的 Endpoint

```
搜尋和「講師課程列表」相關的 Endpoint
```

```
列出 Lecturer 這個 Tag 底下的所有 Endpoint
```

### 釐清 request / response 細節

```
顯示 `GET /lecturers/{id}/courses` 的完整詳情
```

```
給我看 LecturerCourseListResponse 的 Schema
```

### 產生開發需要的型別

```
幫我為 `GET /lecturers/{id}/courses` 產生 TypeScript 型別
```

```
幫我產生這些 schemas 的型別：Lecturer、Course、LecturerCourseListResponse
```

### 直接進入功能實作

```
幫我建立講師的課程列表功能（React），並使用這份規格中的 Endpoint 與型別
```

### 推薦的快速開發流程

多數情境下，建議依這個順序提問：

1. 先探索 API（`get_spec_info` / `search_endpoints`）
2. 鎖定契約細節（`get_endpoint` / `get_schema`）
3. 只產生需要的型別（`generate_types`）
4. 再請 Agent 產生 UI 或 service 程式碼

這樣可以讓輸出更精準，也能避免產生不必要的程式碼。

### AI Agent 指引

在專案的 `AGENTS.md` 中加入以下內容，可以幫助 AI Agent 更有效地使用 apifable：

````markdown
## API 整合 (apifable)

本專案使用 apifable MCP 伺服器來探索 OpenAPI 規格並產生型別。

### 工作流程

處理 API Endpoint 時，請依照以下順序：

1. **探索** — 使用 `get_spec_info` 了解可用的 Tag 和安全機制
2. **搜尋** — 使用 `search_endpoints` 或 `list_endpoints_by_tag` 定位目標 Endpoint
3. **查看** — 使用 `get_endpoint` 取得完整的 request/response 細節與安全需求
4. **型別** — 使用 `generate_types` 產生 Endpoint 對應的 TypeScript 型別
5. **實作** — 使用產生的型別撰寫功能程式碼

### 型別檔案命名

將產生的型別儲存至檔案時，請依據 API 語意使用英文命名：
- `auth.ts` — 認證/登入相關型別
- `user.ts` — 使用者個人資料與帳號型別
- `post.ts` — 文章與部落格相關型別
- `common.ts` — 多個檔案共用的型別

Agent 應依照 schema 語意決定檔名，而非依照 OpenAPI tag 名稱。

### 規則

- 不要猜測 API 路徑或參數，務必先用 `get_endpoint` 確認
- 呈現 apifable 工具回傳的所有欄位名稱和值時，必須完整原樣呈現。不得省略、裁減或簡化任何部分（例如：保留完整的 summary (說明) 文字，包括 `[ 32 - 001 ]` 等前綴）
- 不得從範例值推測或修改欄位型別
````

## MCP Tools 參考

### `get_spec_info`

回傳 API 的標題、版本、描述、伺服器列表，以及所有 Tag 與其 Endpoint 數量。探索陌生規格時，建議從這裡開始。

### `list_endpoints_by_tag`

**輸入：**
- `tag`（string）：要篩選的 Tag 名稱

回傳屬於指定 Tag 的所有 Endpoint。當結果超過 30 筆時會顯示警告。

### `search_endpoints`

**輸入：**
- `query`（string）：搜尋關鍵字
- `tag`（string，optional）：將搜尋限制在特定 Tag 內
- `limit`（number，optional）：最多回傳幾筆結果（預設：10）

跨 operationId、路徑、摘要及描述的關鍵字搜尋，結果依相關性排序。若無精確匹配結果，會自動切換為模糊搜尋。回應包含 `matchType` 欄位（`"exact"` 或 `"fuzzy"`）；模糊搜尋結果另含每筆結果的 `score` 欄位。

### `get_endpoint`

**輸入（擇一）：**
- `method`（string）+ `path`（string）：HTTP 方法與 Endpoint 路徑（例如 `get` + `/users/{id}`）
- `operationId`（string）：Operation ID（例如 `listUsers`）

回傳完整的 Endpoint 物件——參數、請求體、回應——所有 `$ref` 均已內聯解析。

### `search_schemas`

**輸入：**
- `query`（string）：搜尋關鍵字
- `limit`（number，optional）：最多回傳幾筆結果（預設：10）

跨 Schema 名稱及描述的關鍵字搜尋，結果依相關性排序。若無精確匹配結果，會自動切換為模糊搜尋。回應包含 `matchType` 欄位（`"exact"` 或 `"fuzzy"`）；模糊搜尋結果另含每筆結果的 `score` 欄位。

### `get_schema`

**輸入：**
- `name`（string）：`components/schemas` 中的 Schema 名稱

回傳所有 `$ref` 均已解析的完整 Schema。

### `generate_types`

**輸入（擇一模式）：**
- `schemas`（string[]）：`components/schemas` 中的 Schema 名稱陣列
- `method`（string）+ `path`（string）：HTTP 方法與 Endpoint 路徑
- `operationId`（string）：Operation ID（例如 `listUsers`）

回傳 self-contained 的 TypeScript 宣告程式碼文字。會自動包含 transitive dependencies，且不包含 import 陳述式。

模式規則：
- 一次呼叫只能使用一種模式：`schemas`、`method` + `path`、或 `operationId`
- 不能在同一個呼叫中混用不同模式

範例 payload：

```json
{ "schemas": ["User", "Address"] }
```

```json
{ "method": "get", "path": "/lecturers/{id}/courses" }
```

```json
{ "operationId": "listUsers" }
```

## 為什麼

當我使用 Claude Code 等 AI Agent 協助開發前端專案時，發現後端 API 的整合始終是一大痛點。每當需要產生對應的 API 程式碼，往往只能手動複製貼上 API 路徑與參數來讓 Agent 理解，過程既繁瑣又不夠優雅。

於是我將注意力轉向 OpenAPI 協定，發現這是一個非常適合與 Agent 協作的格式。然而，當時市面上並沒有任何 MCP 工具能達到我期望的標準：有些套件雖然功能接近，卻無法正常讀取高達 2MB 的 openapi.yaml 檔案；有些則是與 Agent 協作的體驗不夠流暢。因此，我透過 Claude Code 來 Vibe Coding 開發了 apifable，讓開發者能輕鬆透過 AI Agent 查詢 API 規格並精確產生 TypeScript 型別。

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

## Credits

- [@reapi/mcp-openapi](https://github.com/ReAPI-com/mcp-openapi) — 最初的靈感來源

## License

[MIT LICENSE](LICENSE)

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=ycs77/apifable&type=date)](https://www.star-history.com/#ycs77/apifable&type=date)

[ico-version]: https://img.shields.io/npm/v/apifable?style=flat-square
[ico-license]: https://img.shields.io/badge/license-MIT-brightgreen?style=flat-square
[ico-downloads]: https://img.shields.io/npm/dt/apifable?style=flat-square

[link-npm]: https://www.npmjs.com/package/apifable
[link-downloads]: https://www.npmjs.com/package/apifable
