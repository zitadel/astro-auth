module.exports = {
  ignore: [
    'commitlint.config.js',
    'src/components/index.d.ts',
    'playground/**',
  ],
  ignoreDependencies: [
    '@commitlint/config-conventional',
    '@semantic-release/.*?',
    '@tsconfig/node22',
    'auth',
  ],
  entry: ['src/api/**/*.ts'],
};
