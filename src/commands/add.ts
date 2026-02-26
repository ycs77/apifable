import { access, mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { confirm, intro, isCancel, log, outro } from '@clack/prompts'
import { getRecipe } from '../recipes/loader'
import { isValidRecipeName } from '../recipes/utils'

export async function add(name: string): Promise<void> {
  intro('apifable')

  if (!isValidRecipeName(name)) {
    log.error(`Invalid recipe name: "${name}"`)
    process.exit(1)
  }
  const content = await getRecipe(name)
  if (!content) {
    log.error(`Recipe not found: ${name}\nRun "apifable add <name>" to install a recipe.`)
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
