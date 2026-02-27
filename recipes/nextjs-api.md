---
name: nextjs-api
type: bff
description: Next.js App Router API route handler with typed request and response
---

## Rules

- Use Next.js App Router `app/api/` route handler convention
- Export named async functions matching the HTTP method: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`
- Import `NextRequest` and `NextResponse` from `next/server`
- Use `ofetch` from the `ofetch` package to call the backend API, with `baseURL` set to `process.env.API_BASE_URL`
- Type the `ofetch` call with a generic parameter matching the response schema (e.g. `ofetch<User>(...)`)
- Path parameters are accessed via the second argument `{ params }`, where `params` is a `Promise` that must be awaited
- Request body is parsed via `await request.json()` and typed from the request body schema
- Query parameters are accessed via `request.nextUrl.searchParams`
- Return `NextResponse.json(data)` for JSON responses
- Return `NextResponse.json(data, { status: 201 })` for POST endpoints that create resources
- Return `new NextResponse(null, { status: 204 })` for DELETE endpoints with no response body
- Wrap handler logic in `try/catch`; return `NextResponse.json({ error }, { status: 500 })` on failure

## Example

Given `GET /users/:id` with operationId `getUser` returning `User`:

```ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { ofetch } from 'ofetch'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const user = await ofetch<User>(`/users/${id}`, {
      baseURL: process.env.API_BASE_URL,
    })
    return NextResponse.json(user)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

Given `POST /users` with operationId `createUser` and body `CreateUserRequest`:

```ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { ofetch } from 'ofetch'

export async function POST(request: NextRequest) {
  try {
    const body: CreateUserRequest = await request.json()
    const user = await ofetch<User>('/users', {
      baseURL: process.env.API_BASE_URL,
      method: 'POST',
      body,
    })
    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

Given `GET /users` with query param `role`:

```ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { ofetch } from 'ofetch'

export async function GET(request: NextRequest) {
  try {
    const role = request.nextUrl.searchParams.get('role') ?? undefined
    const users = await ofetch<User[]>('/users', {
      baseURL: process.env.API_BASE_URL,
      query: { role },
    })
    return NextResponse.json(users)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```
