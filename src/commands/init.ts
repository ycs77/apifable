import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { cancel, confirm, intro, isCancel, log, multiselect, outro, text } from '@clack/prompts'
import { configExists, writeConfig } from '../config/config'
import { showLogo } from '../logo'
import { getRecipe, listRecipes } from '../recipes/loader'

export async function initialize(): Promise<void> {
  console.log()
  showLogo()
  console.log()

  intro('apifable')

  if (await configExists()) {
    const shouldOverwrite = await confirm({ message: 'apifable.config.json already exists. Overwrite?' })
    if (isCancel(shouldOverwrite) || !shouldOverwrite) {
      outro('Aborted.')
      return
    }
  }

  const spec = await text({
    message: 'Path to OpenAPI spec file:',
    defaultValue: 'openapi.yaml',
    validate: value => {
      if (!value) return 'Spec path is required'
    },
  })

  if (isCancel(spec)) {
    cancel('Cancelled.')
    process.exit(0)
  }

  await writeConfig({ spec })

  const recipes = await listRecipes()
  if (recipes.length > 0) {
    const selected = await multiselect({
      message: 'Select recipes to install:',
      options: recipes.map(r => ({
        value: r.name,
        label: r.name,
        hint: r.description,
      })),
      required: false,
    })

    if (!isCancel(selected) && selected.length > 0) {
      const recipesDir = join(process.cwd(), '.apifable', 'recipes')
      await mkdir(recipesDir, { recursive: true })

      for (const name of selected) {
        const content = await getRecipe(name)
        if (content) {
          await writeFile(join(recipesDir, `${name}.md`), content, 'utf-8')
        }
      }

      log.success(`Installed ${selected.length} recipe${selected.length > 1 ? 's' : ''} to .apifable/recipes/`)
    }
  }

  const gitignorePath = join(process.cwd(), '.gitignore')
  const gitignoreEntry = '.apifable/cache/'

  let gitignoreContent = ''
  try {
    gitignoreContent = await readFile(gitignorePath, 'utf-8')
  } catch {
    // file does not exist, will create
  }

  if (!gitignoreContent.includes(gitignoreEntry)) {
    const separator = gitignoreContent
      ? (gitignoreContent.endsWith('\n') ? '\n' : '\n\n')
      : ''
    await writeFile(gitignorePath, `${gitignoreContent}${separator}# apifable cache\n${gitignoreEntry}\n`, 'utf-8')
    log.success('Updated .gitignore')
  }

  log.success('Created apifable.config.json')
  outro('Done! Next, add apifable to the MCP config for your AI agent.')
}
