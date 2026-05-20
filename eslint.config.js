import antfu from '@antfu/eslint-config'

export default antfu(
  {
    ignores: ['files/*.md'],
    react: true,
    typescript: true,
  },
  {
    files: ['app/components/ui/**/*.{ts,tsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  }
)
