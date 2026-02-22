import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts'],
  fixedExtension: false,
  copy: [{ from: 'src/recipes/built-in', to: 'dist/recipes' }],
})
