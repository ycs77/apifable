---
name: api-types
type: api-types
description: TypeScript interface and type definitions from OpenAPI schemas
---

## Rules

- Use `interface` for object schemas; use `type` for unions, intersections, and primitives
- Property names stay as-is from the OpenAPI schema (no renaming)
- Required properties are non-optional; optional properties use `?`
- Use TypeScript primitives: `string`, `number`, `boolean`
- Arrays use `Type[]` syntax
- `$ref` references become the referenced type name
- Enum schemas become `type Foo = 'a' | 'b' | 'c'`
- `allOf` becomes an intersection type: `type A = B & C & { ... }`
- `oneOf` / `anyOf` becomes a union type: `type A = B | C`
- `additionalProperties: true` adds `[key: string]: unknown` index signature
- Export each type/interface as a named export
- Group related types together; place base types before derived types
- Add JSDoc comments from the schema `description` field when present

## Example

Given schemas `User`, `CreateUserRequest`, `UserRole`:

```ts
/** User role in the system */
export type UserRole = 'admin' | 'editor' | 'viewer'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  createdAt: string
  /** Optional display name */
  displayName?: string
}

export interface CreateUserRequest {
  name: string
  email: string
  role: UserRole
  displayName?: string
}

export interface PaginatedUsers {
  items: User[]
  total: number
  page: number
  pageSize: number
}
```

Given a schema with `allOf`:

```ts
export interface AdminUser extends User {
  permissions: string[]
}

// Or as intersection type:
export type AdminUser = User & {
  permissions: string[]
}
```
