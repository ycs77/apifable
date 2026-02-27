import type { RecipeMeta } from '../types'
import { access, readdir, readFile } from 'node:fs/promises'
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

function getRecipesDir(): string {
  // Bundled as dist/index.js → import.meta.dirname is dist/, so .. reaches the project root
  return join(import.meta.dirname, '..', 'recipes')
}

export async function listRecipes(): Promise<RecipeMeta[]> {
  const dir = getRecipesDir()
  const entries = await readdir(dir, { withFileTypes: true })
  const recipeDirs = entries
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort()
  const recipes: RecipeMeta[] = []
  for (const recipeName of recipeDirs) {
    const skillPath = join(dir, recipeName, 'SKILL.md')
    try {
      const content = await readFile(skillPath, 'utf-8')
      const { meta } = parseFrontmatter(content)
      recipes.push(meta)
    } catch {
      // skip invalid recipe directories
    }
  }
  return recipes
}

export async function getRecipe(name: string): Promise<string | null> {
  if (!isValidRecipeName(name)) return null
  const filePath = join(getRecipesDir(), name, 'SKILL.md')
  try {
    return await readFile(filePath, 'utf-8')
  } catch {
    return null
  }
}

export async function getRecipeDir(name: string): Promise<string | null> {
  if (!isValidRecipeName(name)) return null
  const dirPath = join(getRecipesDir(), name)
  const skillPath = join(dirPath, 'SKILL.md')
  try {
    await access(skillPath)
    return dirPath
  } catch {
    return null
  }
}

export async function listUserRecipes(cwd: string): Promise<RecipeMeta[]> {
  const dir = join(cwd, '.apifable', 'recipes')
  try {
    const entries = await readdir(dir, { withFileTypes: true })
    const recipeDirs = entries
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name)
      .sort()
    const recipes: RecipeMeta[] = []
    for (const recipeName of recipeDirs) {
      const content = await readFile(join(dir, recipeName, 'SKILL.md'), 'utf-8')
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
  const filePath = join(cwd, '.apifable', 'recipes', name, 'SKILL.md')
  try {
    return await readFile(filePath, 'utf-8')
  } catch {
    return null
  }
}
