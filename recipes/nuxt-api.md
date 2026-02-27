---
name: nuxt-api
type: bff
description: Nuxt server API route with event handler and validation
---

## Rules

- Use Nuxt `server/api/` route convention
- Export default using `defineEventHandler` from `h3`
- Use `ofetch` from the `ofetch` package to call the backend API, with `baseURL` set to `process.env.API_BASE_URL`
- Type the `ofetch` call with a generic parameter matching the response schema (e.g. `ofetch<User>(...)`)
- Path parameters are accessed via `getRouterParam(event, 'name')`
- Request body is read via `readBody(event)` and typed from the request body schema
- For validated request bodies, use `readValidatedBody(event, schema.parse)` with a Zod schema
- Query parameters are accessed via `getQuery(event)`
- Return data directly from the handler — Nuxt auto-serializes to JSON
- Use `setResponseStatus(event, 201)` for POST endpoints that create resources
- Use `setResponseStatus(event, 204)` and return `null` for DELETE endpoints with no response body
- Use `createError({ statusCode, statusMessage })` to throw HTTP errors

## Example

Given `GET /users/:id` with operationId `getUser` returning `User`:

```ts
import { ofetch } from 'ofetch'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const user = await ofetch<User>(`/users/${id}`, {
    baseURL: process.env.API_BASE_URL,
  })
  return user
})
```

Given `POST /users` with operationId `createUser` and body `CreateUserRequest`:

```ts
import { ofetch } from 'ofetch'
import { z } from 'zod'

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(['admin', 'user']),
})

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, createUserSchema.parse)
  const user = await ofetch<User>('/users', {
    baseURL: process.env.API_BASE_URL,
    method: 'POST',
    body,
  })
  setResponseStatus(event, 201)
  return user
})
```

Given `GET /users` with query param `role`:

```ts
import { ofetch } from 'ofetch'

export default defineEventHandler(async (event) => {
  const { role } = getQuery(event)
  const users = await ofetch<User[]>('/users', {
    baseURL: process.env.API_BASE_URL,
    query: { role },
  })
  return users
})
```
