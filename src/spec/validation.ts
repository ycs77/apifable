import type { OpenAPIObject } from '../types.ts'
import { z } from 'zod'

const openAPIStructureSchema = z.object({
  openapi: z.string().min(1),
  info: z.object({
    title: z.string().min(1),
    version: z.string().min(1),
  }).loose(),
  paths: z.record(z.string(), z.unknown()),
}).loose()

export function validateOpenAPIDocument(value: unknown, sourceLabel = 'document'): OpenAPIObject {
  const result = openAPIStructureSchema.safeParse(value)
  if (!result.success) {
    const issue = result.error.issues[0]
    const fieldPath = issue.path.length > 0 ? issue.path.join('.') : '(root)'
    throw new Error(`Invalid OpenAPI document in ${sourceLabel}: ${fieldPath}: ${issue.message}`)
  }

  return result.data as OpenAPIObject
}
