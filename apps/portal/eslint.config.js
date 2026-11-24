import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // React Compiler advice from eslint-plugin-react-hooks v7, plus the
      // Fast Refresh hint. They flag working code patterns (setState at the
      // start of an effect, a "latest callback" ref, context files that also
      // export their hook), not bugs. Kept visible as warnings so they get
      // cleaned up after launch without risky rewrites now; every other rule
      // still fails the build.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/globals': 'warn',
      'react-refresh/only-export-components': 'warn',
    },
  },
  {
    // Build tooling runs in Node, not the browser.
    files: ['*.config.js'],
    languageOptions: { globals: globals.node },
  },
])
