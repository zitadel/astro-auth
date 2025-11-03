module.exports = {
	ignoreDependencies: ['@semantic-release/.*?'],
	entry: ['src/index.ts', 'src/api/[...auth].ts'],
}
