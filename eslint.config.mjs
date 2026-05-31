import mridang from '@mridang/eslint-defaults';
import eslintPluginAstro from 'eslint-plugin-astro';

export default [
  {
    ignores: [
      'coverage/**',
      '.out/**',
      '.npm/**',
      'docs/**',
      'playground/**',
      // Repo-specific: generated component type definitions
      'src/components/index.d.ts',
    ],
  },
  ...mridang.configs.recommended,
  ...eslintPluginAstro.configs['flat/recommended'],
  // Override eslint-plugin-astro's project: null setting to enable type-aware
  // linting for TypeScript extracted from Astro component scripts
  {
    files: ['**/*.astro/*.ts'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
      },
    },
  },
];
