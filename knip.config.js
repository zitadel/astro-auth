module.exports = {
  ignoreDependencies: [
    '@commitlint/config-conventional',
    '@semantic-release/.*?',
    'auth',
  ],
  entry: ['src/api/**/*.ts'],
  ignore: [
    'commitlint.config.js',
    'src/components/index.d.ts',
    'typedoc.config.mjs',
    'dist/**',
    'build/**',
    'docs/**',
    'playground/**',
  ],
};
