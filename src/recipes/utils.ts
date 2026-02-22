export function isValidRecipeName(name: string): boolean {
  return /^[a-z0-9][\w-]*$/i.test(name)
}
