---
name: fetch-ts
type: fetch-snippet
description: TypeScript fetch function with typed response
---

## Rules

- Function name uses the operationId converted to camelCase
- Return type uses the success response schema (e.g. `Promise<User>`)
- Path parameters become required function arguments (typed as `string` or `number`)
- Query parameters become an optional object argument `params?: { ... }`
- POST/PUT/PATCH request bodies become a typed `body` argument
- Use `async/await` syntax
- Throw an error for non-2xx responses including the HTTP status code and statusText
- Use template literals for path parameter interpolation

## Example

Given `GET /users/{id}` with operationId `getUserById` returning `User`:

```ts
async function getUserById(id: string): Promise<User> {
  const response = await fetch(`/api/users/${id}`)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }
  return response.json() as Promise<User>
}
```

Given `GET /users` with operationId `listUsers` and query param `role`:

```ts
async function listUsers(params?: { role?: string }): Promise<User[]> {
  const url = new URL('/api/users', window.location.origin)
  if (params?.role !== undefined) url.searchParams.set('role', params.role)
  const response = await fetch(url.toString())
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }
  return response.json() as Promise<User[]>
}
```

Given `POST /users` with operationId `createUser` and request body `CreateUserRequest`:

```ts
async function createUser(body: CreateUserRequest): Promise<User> {
  const response = await fetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }
  return response.json() as Promise<User>
}
```
