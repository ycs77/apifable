import { access, mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createInterface } from 'node:readline'
import { getBuiltinRecipe, listBuiltinRecipes } from '../recipes/loader'
import { isValidRecipeName } from '../recipes/utils'

async function prompt(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close()
      resolve(answer)
    })
  })
}

export async function recipeList(): Promise<void> {
  const recipes = await listBuiltinRecipes()
  if (recipes.length === 0) {
    console.log('No built-in recipes found.')
    return
  }
  const nameWidth = Math.max('Name'.length, ...recipes.map(r => r.name.length))
  const typeWidth = Math.max('Type'.length, ...recipes.map(r => r.type.length))
  const header = `${'Name'.padEnd(nameWidth)}  ${'Type'.padEnd(typeWidth)}  Description`
  const divider = `${'-'.repeat(nameWidth)}  ${'-'.repeat(typeWidth)}  ${'-'.repeat(11)}`
  console.log(header)
  console.log(divider)
  for (const recipe of recipes) {
    console.log(`${recipe.name.padEnd(nameWidth)}  ${recipe.type.padEnd(typeWidth)}  ${recipe.description}`)
  }
}

export async function recipeAdd(name: string): Promise<void> {
  if (!isValidRecipeName(name)) {
    console.error(`Invalid recipe name: "${name}"`)
    process.exit(1)
  }
  const content = await getBuiltinRecipe(name)
  if (!content) {
    console.error(`Recipe not found: ${name}`)
    console.error(`Run "apifable recipe list" to see available recipes.`)
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
    const answer = await prompt(`Recipe "${name}" already exists. Overwrite? (y/N) `)
    if (answer.toLowerCase() !== 'y') {
      console.log('Aborted.')
      return
    }
  }

  await mkdir(recipesDir, { recursive: true })
  await writeFile(destPath, content, 'utf-8')
  console.log(`Recipe added: .apifable/recipes/${name}.md`)
}
