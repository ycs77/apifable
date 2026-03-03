export interface SecuritySchemeInfo {
  name: string
  type: string
  scheme?: string
  bearerFormat?: string
  description?: string
  in?: string
  openIdConnectUrl?: string
  flowTypes?: string[]
}

export interface SpecInfo {
  title: string
  version: string
  description: string
  servers: string[]
  security: Record<string, string[]>[]
  securitySchemes: SecuritySchemeInfo[]
}

export interface TagInfo {
  name: string
  description: string
  endpointCount: number
}

export interface SearchResultItem {
  method: string
  path: string
  operationId: string
  summary: string
  tags: string[]
  score?: number
}

export interface EndpointEntry {
  method: string
  path: string
  operationId: string
  summary: string
  description: string
  tags: string[]
}

export interface ParsedSpec {
  info: SpecInfo
  tags: TagInfo[]
  endpointIndex: EndpointEntry[]
  schemas: Record<string, unknown>
  rawSpec: OpenAPIObject
}

export const CACHE_VERSION = 1

export interface SpecCache {
  version: number
  hash: string
  cachedAt: string
  spec: ParsedSpec
}

export interface OpenAPIObject {
  openapi?: string
  info?: {
    title?: string
    version?: string
    description?: string
  }
  servers?: {
    url?: string
    description?: string
  }[]
  tags?: {
    name?: string
    description?: string
  }[]
  paths?: Record<string, PathItemObject>
  security?: Record<string, string[]>[]
  components?: {
    schemas?: Record<string, unknown>
    securitySchemes?: Record<string, SecuritySchemeObject>
  }
}

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K]
}

export interface ApifableSpecConfig {
  path: string
  url?: string
  headers?: Record<string, string>
}

export interface ApifableConfig {
  spec: ApifableSpecConfig
  types: {
    output: string
    commonFileName: string
  }
}

export type ApifableUserConfig = DeepPartial<ApifableConfig>

export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete' | 'head' | 'options' | 'trace'

export interface SecuritySchemeObject {
  type: string
  description?: string
  name?: string
  in?: string
  scheme?: string
  bearerFormat?: string
  openIdConnectUrl?: string
  flows?: Record<string, { scopes?: Record<string, string> }>
}

export interface OperationObject {
  operationId?: string
  summary?: string
  description?: string
  tags?: string[]
  parameters?: unknown[]
  requestBody?: unknown
  responses?: Record<string, unknown>
  security?: Record<string, string[]>[]
}

export type PathItemObject = {
  [K in HttpMethod]?: OperationObject
}
