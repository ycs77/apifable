---
name: fetch-react-hook
type: fetch-snippet
description: React custom hook with loading/error state
---

## Rules

- Hook name uses `use` prefix followed by the operationId in PascalCase (e.g. `useGetUser`)
- Returns `{ data, loading, error }` where `data` is typed from the response schema
- Initialise `data` as `null`, `loading` as `true`, `error` as `null`
- Use `useEffect` to trigger the fetch on mount (or when dependencies change)
- Set `loading: false` in both success and error paths (use a `finally` block)
- Path parameters and required query params become hook arguments
- Optional query params become part of an optional `options` argument
- Export the hook as a named export

## Example

Given `GET /users/{id}` with operationId `getUser` returning `User`:

```ts
import { useEffect, useState } from 'react'

export function useGetUser(id: string) {
  const [data, setData] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/users/${id}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
        return res.json() as Promise<User>
      })
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false))
  }, [id])

  return { data, loading, error }
}
```

Given `GET /posts` with operationId `listPosts` returning `Post[]` with optional query `tag`:

```ts
import { useEffect, useState } from 'react'

export function useListPosts(options?: { tag?: string }) {
  const [data, setData] = useState<Post[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    setLoading(true)
    const url = new URL('/api/posts', window.location.origin)
    if (options?.tag !== undefined) url.searchParams.set('tag', options.tag)
    fetch(url.toString())
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
        return res.json() as Promise<Post[]>
      })
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false))
  }, [options?.tag])

  return { data, loading, error }
}
```
