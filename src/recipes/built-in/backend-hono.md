---
name: backend-hono
type: backend-handler
description: Hono route handler with Zod validation
---

## Rules

- Use `hono` with `@hono/zod-validator` for request validation
- Handler is defined inline with `app.get(...)` / `app.post(...)` etc.
- Path parameters are accessed via `c.req.param('name')`, typed as `string`
- Use `zValidator('json', schema)` middleware for POST/PUT/PATCH request bodies
- Use `zValidator('query', schema)` middleware for query parameter validation
- Access validated data via `c.req.valid('json')` or `c.req.valid('query')`
- Return `c.json(data)` for JSON responses
- Return `c.json(data, 201)` for POST endpoints that create resources
- Return `c.body(null, 204)` for DELETE endpoints with no response body
- Export the router as the default export or a named `router` export

## Example

Given `GET /users/:id` with operationId `getUser` returning `User`:

```ts
import { Hono } from 'hono'

const app = new Hono()

app.get('/users/:id', async c => {
  const id = c.req.param('id')
  const user = await userService.findById(id)
  if (!user) {
    return c.json({ message: 'User not found' }, 404)
  }
  return c.json(user)
})

export default app
```

Given `POST /users` with operationId `createUser` and body `CreateUserRequest`:

```ts
import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(['admin', 'user']),
})

const app = new Hono()

app.post('/users', zValidator('json', createUserSchema), async c => {
  const body = c.req.valid('json')
  const user = await userService.create(body)
  return c.json(user, 201)
})

export default app
```

Given `GET /users` with query param `role`:

```ts
import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'

const querySchema = z.object({
  role: z.enum(['admin', 'user']).optional(),
})

const app = new Hono()

app.get('/users', zValidator('query', querySchema), async c => {
  const { role } = c.req.valid('query')
  const users = await userService.findAll({ role })
  return c.json(users)
})

export default app
```
