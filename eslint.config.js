import ycs77, { GLOB_MARKDOWN_CODE } from '@ycs77/eslint-config'

export default ycs77({
  typescript: true,
  ignores: [
    GLOB_MARKDOWN_CODE,
  ],
})
  .append({
    rules: {
      'no-console': 'off',
    },
  })
