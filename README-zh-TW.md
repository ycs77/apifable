<div align="center">

![apifable banner](https://raw.githubusercontent.com/ycs77/apifable/main/banner.jpg)

# apifable

**讀懂規格。理解 API。更有把握地完成串接。**

[![NPM version][ico-version]][link-npm]
[![Software License][ico-license]](LICENSE)
[![Total Downloads][ico-downloads]][link-downloads]

[English](README.md) | 繁體中文

</div>

---

## 概覽

apifable 是一個 MCP Server，幫助 AI 更順暢地在 TypeScript 前端專案中串接 API。它讓 AI Agent 能輕鬆探索 API 結構、搜尋 Endpoint，並產生 TypeScript 型別，隨時取得撰寫準確整合程式碼所需的上下文。

## ✨ 功能特色

- 📦 **為 AI 準備好的 API 上下文** — 提供 AI 理解與使用 API 所需的完整結構
- 📘 **支援 OpenAPI 3.0 / 3.1** — 以標準規格作為 API 開發的可靠依據
- 🤖 **適用 AI Agent 的 MCP Server** — 可直接接入 Claude、Cursor、Windsurf 等工具
- 🔍 **API 探索工具** — 瀏覽 Endpoint、關鍵字搜尋、查看完整的 request/response 細節
- 🏷️ **TypeScript 型別生成** — 產生可直接用於前端開發的 TypeScript 型別定義

## 開始使用

### 安裝

執行 `apifable init` 以建立專案設定檔：

```bash
npx apifable@latest init
```

這會在專案根目錄建立 `apifable.config.json`，設定檔應提交至版本控制，讓團隊共享相同的 OpenAPI 規格書路徑。

### 準備你的 Spec

執行指令將 OpenAPI 規格書下載到本地（`spec.url` → `spec.path`）：

```bash
npx apifable@latest fetch
```

#### Headers

可以與團隊共享的非機密 headers，加入 `apifable.config.json` 的 `spec.headers`：

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

#### Auth Headers（機密 Token）

若 API 需要驗證（私有 API），請將機密 headers 存放在 `.apifable/auth.json`。此檔案**不應**提交至版本控制：

```json
{
  "headers": {
    "Authorization": "Bearer YOUR_SECRET_TOKEN"
  }
}
```

`apifable.config.json` 和 `.apifable/auth.json` 的 header 值均支援 `${ENV_VAR}` 語法。

```json
{
  "headers": {
    "Authorization": "Bearer ${MY_API_KEY}"
  }
}
```

#### Headers 優先順序（高到低）

1. `.apifable/auth.json` 的 headers（覆蓋同名 key）
2. `apifable.config.json` 的 `spec.headers`

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

其他 AI Agent 如 Cursor、Windsurf 等，可以參考上述方式將 apifable 設定為 MCP Server。

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
3. 只產生需要的型別（`get_types`）
4. 再請 Agent 產生 UI 或 service 程式碼

這樣可以讓輸出更精準，也能避免產生不必要的程式碼。

### AI Agent 指引

將以下內容加入專案的 `AGENTS.md`，幫助 AI 代理更有效地使用 apifable：

```markdown
## API 整合 (apifable)

- 將 apifable 的輸出視為 API 契約的唯一依據；spec 未明確定義的欄位、參數、列舉值、回應結構與範例，一律不得推測。
- 撰寫或修改 API 串接程式碼前，先用 `get_endpoint` 確認實際契約，並只用 `get_types` 產生目前任務所需的 endpoint 或 schema 型別。
- apifable 的輸出必須原樣保留；不得重命名、翻譯、截斷、正規化，或自行補完缺漏的契約細節。
- 儲存產生的型別檔案時，優先沿用專案既有的型別目錄，並依領域語意命名，不要使用 OpenAPI tag 名稱；若專案沒有既有慣例，再使用 `src/types/`。
- 只有在契約細節仍不清楚時才使用 `get_schema`。
- 若 spec 缺口會影響 API 契約正確性，必須指出缺口並停止；否則只能繼續處理不影響契約的部分，並明確標示假設，不得自行補完缺漏的 API 細節。
```

## MCP Tools 參考

### `get_spec_info`

回傳 API 的標題、版本、描述、伺服器列表，以及所有 Tag 與其 Endpoint 數量。探索陌生規格時，建議從這裡開始。

### `list_endpoints_by_tag`

**輸入：**
- `tag`（string）：要篩選的 Tag 名稱
- `limit`（number，optional）：最多回傳幾筆 Endpoint
- `offset`（number，optional）：略過幾筆 Endpoint（預設：0）

回傳屬於指定 Tag 的所有 Endpoint。回應包含 `total`、`offset`、`hasMore` 欄位以支援分頁。當結果超過 30 筆且未指定 `limit` 時會顯示警告。

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

回傳完整的 Endpoint 物件，包含參數、請求體與回應，且所有 `$ref` 均已內聯解析。

### `search_schemas`

**輸入：**
- `query`（string）：搜尋關鍵字
- `limit`（number，optional）：最多回傳幾筆結果（預設：10）

跨 Schema 名稱及描述的關鍵字搜尋，結果依相關性排序。若無精確匹配結果，會自動切換為模糊搜尋。回應包含 `matchType` 欄位（`"exact"` 或 `"fuzzy"`）；模糊搜尋結果另含每筆結果的 `score` 欄位。

### `get_schema`

**輸入：**
- `name`（string）：`components/schemas` 中的 Schema 名稱

回傳所有 `$ref` 均已解析的完整 Schema。

### `get_types`

**輸入（擇一模式）：**
- `schemas`（string[]）：`components/schemas` 中的 Schema 名稱陣列
- `method`（string）+ `path`（string）：HTTP 方法與 Endpoint 路徑
- `operationId`（string）：Operation ID（例如 `listUsers`）

回傳 self-contained 的 TypeScript 宣告程式碼文字。會自動包含傳遞相依型別，且不包含 import 陳述式。

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

## 限制

- `$ref` 解析只支援指向 `#/components/schemas/` 的內部參照，不支援外部 `$ref`（例如指向其他檔案或 URL 的參照）。
- 不支援 OpenAPI 2.0（Swagger），僅支援 OpenAPI 3.0 與 3.1 規格書。

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
