import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.recommendedTypeChecked,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Calling setState synchronously inside effects is intentional in several places
      // (localStorage restore on mount, clearing stale results, tour position recalc).
      'react-hooks/set-state-in-effect': 'off',

      // PokemonResultsView exports pure utility functions alongside the default component
      // export so they can be unit-tested. Fast Refresh still works for the component.
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
])
