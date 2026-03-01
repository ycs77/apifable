import { access, cp, mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { confirm, intro, isCancel, log, outro } from '@clack/prompts'
import { getRecipeDir } from '../recipes/loader'
import { isValidRecipeName } from '../recipes/utils'

export async function add(name: string): Promise<void> {
  intro('apifable')

  if (!isValidRecipeName(name)) {
    log.error(`Invalid recipe name: "${name}"`)
    process.exit(1)
  }
  const recipeDir = await getRecipeDir(name)
  if (!recipeDir) {
    log.error(`Recipe not found: ${name}\nRun "apifable init" to browse available recipes.`)
    process.exit(1)
  }

  const recipesDir = join(process.cwd(), '.apifable', 'recipes')
  const destDir = join(recipesDir, name)
  const destSkillPath = join(destDir, 'SKILL.md')

  let exists = false
  try {
    await access(destSkillPath)
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
  await rm(destDir, { recursive: true, force: true })
  await cp(recipeDir, destDir, { recursive: true, force: true })
  log.success(`Recipe added: .apifable/recipes/${name}/`)

  outro()
}
