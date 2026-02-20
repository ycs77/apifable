export interface SpecInfo {
  title: string
  version: string
  description: string
  servers: string[]
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
  servers?: Array<{ url?: string, description?: string }>
  tags?: Array<{ name?: string, description?: string }>
  paths?: Record<string, PathItemObject>
  components?: {
    schemas?: Record<string, unknown>
  }
}

export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete' | 'head' | 'options' | 'trace'

export interface OperationObject {
  operationId?: string
  summary?: string
  description?: string
  tags?: string[]
  parameters?: unknown[]
  requestBody?: unknown
  responses?: Record<string, unknown>
}

export type PathItemObject = {
  [K in HttpMethod]?: OperationObject
}
