---
name: backend-express
type: backend-handler
description: Express route handler with typed request and response
---

## Rules

- Use `express` with TypeScript; import `Request`, `Response`, `NextFunction`
- Handler function name uses the operationId in camelCase
- Path parameters are accessed via `req.params` and typed in `ParamsDictionary`
- Query parameters are accessed via `req.query` and typed inline
- Request body is accessed via `req.body` and typed from the request body schema
- Response type is typed using `Response<ResponseSchema>`
- Use `try/catch` for async error handling; pass errors to `next(err)`
- Return `res.status(201)` for POST endpoints that create resources
- Return `res.status(204).send()` for DELETE endpoints with no response body
- Export the handler as a named export

## Example

Given `GET /users/:id` with operationId `getUser` returning `User`:

```ts
import type { NextFunction, Request, Response } from 'express'

export async function getUser(
  req: Request<{ id: string }>,
  res: Response<User>,
  next: NextFunction,
): Promise<void> {
  try {
    const user = await userService.findById(req.params.id)
    if (!user) {
      res.status(404).json({ message: 'User not found' } as any)
      return
    }
    res.json(user)
  } catch (err) {
    next(err)
  }
}
```

Given `POST /users` with operationId `createUser` and body `CreateUserRequest`:

```ts
import type { NextFunction, Request, Response } from 'express'

export async function createUser(
  req: Request<{}, User, CreateUserRequest>,
  res: Response<User>,
  next: NextFunction,
): Promise<void> {
  try {
    const user = await userService.create(req.body)
    res.status(201).json(user)
  } catch (err) {
    next(err)
  }
}
```

Given `GET /users` with query param `role`:

```ts
import type { NextFunction, Request, Response } from 'express'

export async function listUsers(
  req: Request<{}, User[], {}, { role?: string }>,
  res: Response<User[]>,
  next: NextFunction,
): Promise<void> {
  try {
    const users = await userService.findAll({ role: req.query.role })
    res.json(users)
  } catch (err) {
    next(err)
  }
}
```
