import mridang from '@mridang/eslint-defaults'

export default [
	{
		ignores: ['README.md', 'README.md/**'],
	},
	...mridang.configs.recommended,
]
