module.exports = {
  ignoreDependencies: [
    '@commitlint/config-conventional',
    '@semantic-release/.*?',
    '@jest/globals',
    '@tsconfig/node22',
    'auth',
  ],
  ignoreBinaries: ['typedoc'],
  entry: ['src/api/**/*.ts'],
  ignore: [
    'commitlint.config.js',
    'dist/**',
    'build/**',
    'src/components/index.d.ts',
    'typedoc.config.mjs',
  ],
};
