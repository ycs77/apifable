import { defineConfig } from 'oxfmt'

export default defineConfig({
  semi: false,
  singleQuote: true,
  trailingComma: 'all',
  arrowParens: 'avoid',
  sortImports: {
    groups: [
      'type-import',
      ['type-internal', 'type-subpath'],
      ['type-parent', 'type-sibling', 'type-index'],
      'value-builtin',
      'value-external',
      ['value-internal', 'value-subpath'],
      ['value-parent', 'value-sibling', 'value-index'],
      'side_effect',
      'style',
      'unknown',
    ],
    newlinesBetween: false,
  },
})
