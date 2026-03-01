export function isValidRecipeName(name: string): boolean {
  return name.length <= 100 && /^[a-z0-9][\w-]*$/i.test(name)
}
