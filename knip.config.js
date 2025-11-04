module.exports = {
  ignoreDependencies: ['@semantic-release/.*?', 'auth'],
  entry: ['src/api/**/*.ts'],
  ignore: ['src/components/index.d.ts'],
};
