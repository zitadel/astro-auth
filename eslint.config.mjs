import mridang from '@mridang/eslint-defaults';
import eslintPluginAstro from 'eslint-plugin-astro';

export default [
  {
    ignores: [
      'README.md',
      'README.md/**',
      'src/components/index.d.ts',
      '.vscode/**',
      '.claude/**',
      'dist/**',
      'build/**',
      '.out/**',
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
