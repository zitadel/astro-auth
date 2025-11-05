module.exports = {
  ignoreDependencies: [
    '@semantic-release/.*?',
    'auth',
    'jest-environment-jsdom',
  ],
  entry: ['src/api/**/*.ts'],
  ignore: ['src/components/index.d.ts'],
};
