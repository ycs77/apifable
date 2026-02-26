import { access, mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { confirm, intro, isCancel, log, outro } from '@clack/prompts'
import { readConfig } from '../config/config'
import { getBuiltinRecipe, listBuiltinRecipes } from '../recipes/loader'
import { isValidRecipeName } from '../recipes/utils'

export async function recipeList(): Promise<void> {
  intro('apifable')

  const config = await readConfig()
  if (!config) {
    log.error('No apifable.config.json found. Run "apifable init" to initialize.')
    process.exit(1)
  }

  const recipes = await listBuiltinRecipes()
  if (recipes.length === 0) {
    log.warn('No built-in recipes found.')
    outro()
    return
  }
  const nameWidth = Math.max('Name'.length, ...recipes.map(r => r.name.length))
  const typeWidth = Math.max('Type'.length, ...recipes.map(r => r.type.length))
  const header = `${'Name'.padEnd(nameWidth)}  ${'Type'.padEnd(typeWidth)}  Description`
  const divider = `${'-'.repeat(nameWidth)}  ${'-'.repeat(typeWidth)}  ${'-'.repeat(11)}`
  const rows = recipes.map(
    recipe => `${recipe.name.padEnd(nameWidth)}  ${recipe.type.padEnd(typeWidth)}  ${recipe.description}`,
  )
  log.message([header, divider, ...rows].join('\n'))

  outro()
}

export async function recipeAdd(name: string): Promise<void> {
  intro('apifable')

  const config = await readConfig()
  if (!config) {
    log.error('No apifable.config.json found. Run "apifable init" to initialize.')
    process.exit(1)
  }

  if (!isValidRecipeName(name)) {
    log.error(`Invalid recipe name: "${name}"`)
    process.exit(1)
  }
  const content = await getBuiltinRecipe(name)
  if (!content) {
    log.error(`Recipe not found: ${name}\nRun "apifable recipe list" to see available recipes.`)
    process.exit(1)
  }

  const recipesDir = join(process.cwd(), '.apifable', 'recipes')
  const destPath = join(recipesDir, `${name}.md`)

  let exists = false
  try {
    await access(destPath)
    exists = true
  } catch {
    // file does not exist
  }

  if (exists) {
    const shouldOverwrite = await confirm({ message: `Recipe "${name}" already exists. Overwrite?` })
    if (isCancel(shouldOverwrite) || !shouldOverwrite) {
      outro('Aborted.')
      return
    }
  }

  await mkdir(recipesDir, { recursive: true })
  await writeFile(destPath, content, 'utf-8')
  log.success(`Recipe added: .apifable/recipes/${name}.md`)

  outro()
}
