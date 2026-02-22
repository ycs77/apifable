import ycs77, { GLOB_MARKDOWN_CODE, GLOB_SRC } from '@ycs77/eslint-config'

export default ycs77({
  typescript: true,
  ignores: [
    GLOB_MARKDOWN_CODE,
  ],
})
  .append({
    files: [GLOB_SRC],
    rules: {
      'no-console': 'off',
    },
  })
