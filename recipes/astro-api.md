---
name: astro-api
type: bff
description: Astro API endpoint with typed params and response
---

## Rules

- Use Astro `src/pages/api/` route convention
- Import and use the `APIRoute` type from `astro`
- Use `ofetch` from the `ofetch` package to call the backend API, with `baseURL` set to `import.meta.env.API_BASE_URL`
- Type the `ofetch` call with a generic parameter matching the response schema (e.g. `ofetch<User>(...)`)
- Export named const matching the HTTP method: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`
- Each handler is typed as `APIRoute`
- Path parameters are accessed via `params` from the context argument
- Request body is parsed via `await request.json()` and typed from the request body schema
- Query parameters are accessed via `new URL(request.url).searchParams`
- Return `new Response(JSON.stringify(data))` with appropriate headers for JSON responses
- Return `new Response(JSON.stringify(data), { status: 201 })` for POST endpoints that create resources
- Return `new Response(null, { status: 204 })` for DELETE endpoints with no response body
- Use `getStaticPaths` export for dynamic routes in static mode

## Example

Given `GET /users/:id` with operationId `getUser` returning `User`:

```ts
import type { APIRoute } from 'astro'
import { ofetch } from 'ofetch'

export const GET: APIRoute = async ({ params }) => {
  const user = await ofetch<User>(`/users/${params.id}`, {
    baseURL: import.meta.env.API_BASE_URL,
  })
  return new Response(JSON.stringify(user), {
    headers: { 'Content-Type': 'application/json' },
  })
}
```

Given `POST /users` with operationId `createUser` and body `CreateUserRequest`:

```ts
import type { APIRoute } from 'astro'
import type { CreateUserRequest } from '@/types'
import { ofetch } from 'ofetch'

export const POST: APIRoute = async ({ request }) => {
  const body: CreateUserRequest = await request.json()
  const user = await ofetch<User>('/users', {
    baseURL: import.meta.env.API_BASE_URL,
    method: 'POST',
    body,
  })
  return new Response(JSON.stringify(user), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  })
}
```

Given `GET /users` with query param `role`:

```ts
import type { APIRoute } from 'astro'
import { ofetch } from 'ofetch'

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url)
  const role = url.searchParams.get('role') ?? undefined
  const users = await ofetch<User[]>('/users', {
    baseURL: import.meta.env.API_BASE_URL,
    query: { role },
  })
  return new Response(JSON.stringify(users), {
    headers: { 'Content-Type': 'application/json' },
  })
}
```
