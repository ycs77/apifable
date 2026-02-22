---
name: form-react
type: form
description: React form with react-hook-form and zod validation
---

## Rules

- Use `react-hook-form` with `zodResolver` for validation
- Derive the Zod schema from the request body schema in the OpenAPI spec
- Component name uses PascalCase form of the operationId (e.g. `CreateUserForm`)
- Required fields have no `.optional()` in the Zod schema
- String fields with `minLength`/`maxLength` use `.min()`/`.max()` constraints
- Enum fields use `z.enum([...])`
- Submit handler calls the fetch function and handles loading/error state
- Show field-level error messages using `errors.<field>?.message`
- Disable the submit button while submitting

## Example

Given `POST /users` with operationId `createUser` and body `{ name: string, email: string, role: 'admin' | 'user' }`:

```tsx
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  role: z.enum(['admin', 'user']),
})

type FormData = z.infer<typeof schema>

export function CreateUserForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    const response = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <input {...register('name')} placeholder="Name" />
        {errors.name && <p>{errors.name.message}</p>}
      </div>
      <div>
        <input {...register('email')} type="email" placeholder="Email" />
        {errors.email && <p>{errors.email.message}</p>}
      </div>
      <div>
        <select {...register('role')}>
          <option value="admin">Admin</option>
          <option value="user">User</option>
        </select>
        {errors.role && <p>{errors.role.message}</p>}
      </div>
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Creating...' : 'Create User'}
      </button>
    </form>
  )
}
```
