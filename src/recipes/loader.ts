import type { RecipeMeta } from '../types'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { parse as parseYaml } from 'yaml'
import { isValidRecipeName } from './utils'

function parseFrontmatter(content: string): { meta: RecipeMeta, body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!match) {
    throw new Error('Invalid recipe format: missing frontmatter')
  }
  const meta = parseYaml(match[1]) as RecipeMeta
  const body = match[2]
  return { meta, body }
}

function getBuiltinDir(): string {
  return join(import.meta.dirname, 'recipes', 'built-in')
}

export async function listBuiltinRecipes(): Promise<RecipeMeta[]> {
  const dir = getBuiltinDir()
  const files = await readdir(dir)
  const mdFiles = files.filter(f => f.endsWith('.md')).sort()
  const recipes: RecipeMeta[] = []
  for (const file of mdFiles) {
    const content = await readFile(join(dir, file), 'utf-8')
    const { meta } = parseFrontmatter(content)
    recipes.push(meta)
  }
  return recipes
}

export async function getBuiltinRecipe(name: string): Promise<string | null> {
  if (!isValidRecipeName(name)) return null
  const filePath = join(getBuiltinDir(), `${name}.md`)
  try {
    return await readFile(filePath, 'utf-8')
  } catch {
    return null
  }
}

export async function listUserRecipes(cwd: string): Promise<RecipeMeta[]> {
  const dir = join(cwd, '.apifable', 'recipes')
  try {
    const files = await readdir(dir)
    const mdFiles = files.filter(f => f.endsWith('.md')).sort()
    const recipes: RecipeMeta[] = []
    for (const file of mdFiles) {
      const content = await readFile(join(dir, file), 'utf-8')
      try {
        const { meta } = parseFrontmatter(content)
        recipes.push(meta)
      } catch {
        // skip files with invalid frontmatter
      }
    }
    return recipes
  } catch {
    return []
  }
}

export async function getUserRecipe(cwd: string, name: string): Promise<string | null> {
  if (!isValidRecipeName(name)) return null
  const filePath = join(cwd, '.apifable', 'recipes', `${name}.md`)
  try {
    return await readFile(filePath, 'utf-8')
  } catch {
    return null
  }
}
