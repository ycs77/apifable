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

這個指令會在專案根目錄建立 `apifable.config.json`，設定檔應提交至版本控制，讓團隊共享相同的 OpenAPI 規格書路徑。

開始執行後，這時你可以選擇 **Manual file** 和 **Remote URL** 的其中一種。

#### 1. Manual file (手動管理檔案)

如果你的 OpenAPI 規格書已經由團隊放在專案內，或你打算自行管理檔案更新，適合使用這個方式。

init 會要求你輸入本地檔案路徑，例如 `openapi.yaml`。

接著你需要手動將 OpenAPI 規格書放到該路徑。當後端 API 更新時，也需要手動更新這個檔案。

#### 2. Remote URL (遠端 URL)

如果你的 OpenAPI 規格書可以透過固定 URL 取得，比如後端 API Docs 提供的 OpenAPI Spec URL，就適合使用這個方式。

init 會先要求你輸入遠端 URL，例如 `https://api.example.com/openapi.yaml`，再輸入下載到本地的路徑，例如 `./openapi.yaml`。

> [!NOTE]
> 在這個模式下，`init` 也會自動把下載後的本地 spec 路徑加入 `.gitignore`，因為這個檔案預期會由遠端來源重新抓取與更新。

之後你可以執行以下指令，將 OpenAPI 規格書從遠端下載到本地（`spec.url` → `spec.path`）。每次需要更新規格書時，只要重新執行即可：

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

若下載遠端 OpenAPI 規格書需要驗證（私有 API），請將機密 headers 存放在 `.apifable/auth.json`。此檔案**不應**提交至版本控制：

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

以下是一些探索 API 和實作功能的提示詞範例。

### 探索 API

```
幫我列出 API
```

```
給我文章相關的 API
```

```
列出 Post 標籤下的 API
```

```
給我文章留言的 API 詳情
```

```
給我 GET /posts/{id}/comments 的 API 詳情
```

```
給我 postComments 的 API 詳情
```

### 實作功能

```
實作文章留言功能

文章頁面: src/pages/posts/[id].tsx

相關 API:
- GET /posts/{id}/comments (文章留言列表)
- POST /posts/{id}/comments (新增文章留言)
```

> [!TIP]
> 撰寫實作功能的 prompt 時，建議附上所需的上下文，例如頁面路徑、元件位置、相關 API、可參考的實作模式或範例等。

### AI Agent 指引

將以下內容加入專案的 `AGENTS.md`，幫助 AI 代理更有效地使用 apifable：

```markdown
## API 整合 (apifable)

- 撰寫串接程式碼前，務必先用 `get_endpoint` 確認正確的路徑、方法與參數，不要憑假設。
- 呈現 apifable 工具回傳 endpoint 列表的資料時，依序顯示 `Method` (Uppercase)、`Path`、`Summary` 欄位。所有值必須原樣保留，包含 `[ 32 - 001 ]` 等摘要前綴。不得省略、重命名、改寫或新增額外欄位。
- 儲存產生的型別時，放在 `src/types/` 下並依領域命名 (例如 `src/types/auth.ts`、`src/types/user.ts`)，不要使用 OpenAPI tag 名稱。
```

以上為建議的指引範例，你可以根據專案需求調整 endpoint 列表顯示的欄位和 types 的存放路徑。

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

回傳完整的 Endpoint 物件，包含參數、請求體與回應，且支援的內部 component `$ref` 均已內聯解析。

### `search_schemas`

**輸入：**
- `query`（string）：搜尋關鍵字
- `limit`（number，optional）：最多回傳幾筆結果（預設：10）

跨 Schema 名稱及描述的關鍵字搜尋，結果依相關性排序。若無精確匹配結果，會自動切換為模糊搜尋。回應包含 `matchType` 欄位（`"exact"` 或 `"fuzzy"`）；模糊搜尋結果另含每筆結果的 `score` 欄位。空結果時也可能包含 `message` 欄位，提供下一步操作建議。

### `get_schema`

**輸入：**
- `name`（string）：`components/schemas` 中的 Schema 名稱

回傳支援的內部 component `$ref` 均已解析的完整 Schema。

### `get_types`

**輸入（擇一模式）：**
- `schemas`（string[]）：`components/schemas` 中的 Schema 名稱陣列
- `method`（string）+ `path`（string）：HTTP 方法與 Endpoint 路徑
- `operationId`（string）：Operation ID（例如 `listUsers`）

回傳 self-contained 的 TypeScript 宣告程式碼文字。在 endpoint 模式下，會先沿著支援的內部 component `$ref` 展開，再收集傳遞相依型別，且不包含 import 陳述式。

模式規則：
- 一次呼叫只能使用一種模式：`schemas`、`method` + `path`、或 `operationId`
- 不能在同一個呼叫中混用不同模式

## 限制

- 不支援外部 `$ref`（例如指向其他檔案或 URL 的參照）。
- 不支援 OpenAPI 2.0（Swagger），僅支援 OpenAPI 3.0 與 3.1 規格書。

## 贊助

如果我製作的套件對你有幫助，歡迎考慮[贊助我](https://www.patreon.com/ycs77)來支持我的工作~ 我會很感謝你~ 而且您的大頭貼還可以顯示在我的主要專案中。

<p align="center">
  <a href="https://www.patreon.com/ycs77">
    <img src="https://cdn.jsdelivr.net/gh/ycs77/static/sponsors.svg" alt="Sponsors" />
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
