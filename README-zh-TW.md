<div align="center">

![](https://raw.githubusercontent.com/ycs77/apifable/main/banner.jpg)

# apifable

**讀取規格。理解脈絡。生成程式碼。**

[![NPM version][ico-version]][link-npm]
[![Software License][ico-license]](LICENSE)
[![Total Downloads][ico-downloads]][link-downloads]

[English](README.md) | 繁體中文

</div>

---

## 概覽

apifable 幫助 AI Agent 讀取 OpenAPI 規格，並生成符合專案慣例的程式碼。從讀取 API 規格到產出具備型別的、可直接上線的程式碼，整個流程一氣呵成——讓你把時間花在開發功能上，而不是重複的樣板程式碼。

## 為什麼

當時我正在開發前端專案，配合 Claude Code 等 AI Agent 來幫助我產生程式碼，但唯獨後端的 API 部分無法和 Agent 配合得很好。需要產生對應的 API 程式碼時，似乎 copy and paste 是唯一的方法，但這樣既麻煩又不優雅。

於是我把注意力轉向了 OpenAPI 協定，我發現這是一個很適合和 Agent 協作的格式，但當時都沒有一個 MCP 工具可以達到我的標準。有些工具接近我的需求，但無法正常讀取高達 2MB 的 openapi.yaml 檔案，也缺少了自訂程式碼模板的功能。因此我和 Claude Code 合作，打造了 apifable，可以輕鬆地透過 AI Agent 查詢 API 規格，並產生符合專案標準的程式碼。

## ✨ 功能特色

- 🤖 **MCP 伺服器** — 開箱即用，直接接入 Claude 等 AI 代理
- 🗺️ **規格概覽** — 清晰呈現任何 API 的結構與可用端點
- 🔍 **端點搜尋** — 透過關鍵字搜尋快速定位相關端點，並支援模糊搜尋
- 📋 **完整端點詳情** — 查看任意端點的完整資訊，所有 `$ref` 均已內聯解析
- 🧩 **Schema 瀏覽器** — 瀏覽所有參考均已完整解析的 Schema
- 📦 **Recipes** — 安裝風格指南，告訴 AI 如何為你的專案生成程式碼
- ✨ **程式碼生成技能** — 從規格資料生成帶型別的 fetch 函式、React Hook、表單及路由處理器
- 🧑‍🍳 **Recipe 建立技能** — 建立符合你的框架與慣例的自訂 Recipe

## MCP Tools

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

## 建議查詢流程

```
1. get_spec_info          → 了解 Tag 與整體結構
2. search_endpoints       → 透過關鍵字找到相關端點
3. get_endpoint           → 取得特定端點的完整詳情
4. get_schema             → 取得端點中引用的 Schema
```

## Recipes

Recipes 是風格指南 `.md` 檔案，告訴 AI 如何為你的專案生成程式碼。每個 Recipe 針對特定的使用模式，包含命名慣例、結構規則，以及具體的程式碼範例。

apifable 內建 6 個 Recipe，涵蓋最常見的使用情境：

| 名稱 | 類型 | 說明 |
|------|------|------|
| `fetch-ts` | `fetch-snippet` | 帶型別回應的 TypeScript fetch 函式 |
| `fetch-react-hook` | `fetch-snippet` | 含 loading/error 狀態的 React 自訂 Hook |
| `form-react` | `form` | 搭配 react-hook-form 與 zod 驗證的 React 表單 |
| `api-types` | `api-types` | 從 OpenAPI Schema 生成 TypeScript 介面與型別定義 |
| `backend-express` | `backend-handler` | 帶型別請求與回應的 Express 路由處理器 |
| `backend-hono` | `backend-handler` | 搭配 Zod 驗證的 Hono 路由處理器 |

### Recipe 指令

```bash
# 列出所有內建 Recipe
apifable recipe list

# 將 Recipe 安裝至專案
apifable recipe add fetch-ts
# → 寫入 .apifable/recipes/fetch-ts.md
```

已安裝的 Recipe 存放於 `.apifable/recipes/`。你可以自由編輯，以符合專案的慣例——變數命名、錯誤處理風格、import 路徑等。

## 透過 Agent 生成程式碼

apifable 內建兩個 Agent Skill，彼此搭配使用：

- **`apifable-codegen`** — 將 MCP 伺服器與 Recipes 整合為完整的程式碼生成工作流程
- **`apifable-recipe-creator`** — 建立符合你的框架與慣例的自訂 Recipe

### 程式碼生成工作流程

1. **找到 Recipe** — 讀取 `.apifable/recipes/` 中已安裝的風格指南；若沒有合適的，會建議執行 `recipe add`，或使用 `/apifable-recipe-creator` 建立自訂 Recipe
2. **取得規格資料** — 呼叫 `get_endpoint` 或 `get_schema` 以取得所需的精確型別與結構
3. **生成程式碼** — 遵循 Recipe 的規則與範例，使用真實規格資料確保型別與名稱的正確性
4. **寫入檔案** — 詢問存放位置，然後將輸出寫入你的專案

### 範例提示詞

```
Generate TypeScript types for all schemas in the Users tag
```

```
Create a React hook for `GET /posts/{id}`
```

```
Add an Express route handler for `POST /orders`
```

```
Create a recipe for Axios fetch functions
```

## 安裝

### Claude Code

在 `.mcp.json` 中加入以下設定：

```json
{
  "mcpServers": {
    "apifable": {
      "command": "npx",
      "args": ["-y", "apifable@latest", "mcp", "--spec", "openapi.yaml"]
    }
  }
}
```

將 `openapi.yaml` 替換為你的 OpenAPI 規格檔案路徑。

## .gitignore

apifable 將已解析的規格快取存放於 `.apifable/cache/`。已安裝的 Recipe 位於 `.apifable/recipes/`，屬於專案檔案，建議提交至版本控制。僅需將快取目錄加入 `.gitignore`：

```
# apifable cache
.apifable/cache/
```

## License

[MIT LICENSE](LICENSE.md)

[ico-version]: https://img.shields.io/npm/v/apifable?style=flat-square
[ico-license]: https://img.shields.io/badge/license-MIT-brightgreen?style=flat-square
[ico-downloads]: https://img.shields.io/npm/dt/apifable?style=flat-square

[link-npm]: https://www.npmjs.com/package/apifable
[link-downloads]: https://www.npmjs.com/package/apifable
