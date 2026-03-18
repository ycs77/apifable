import type { HttpMethod } from './types.ts'

export const HTTP_METHODS: HttpMethod[] = [
  'get',
  'post',
  'put',
  'patch',
  'delete',
  'head',
  'options',
  'trace',
]

export function isValidHttpMethod(method: string): method is HttpMethod {
  return HTTP_METHODS.includes(method as HttpMethod)
}
