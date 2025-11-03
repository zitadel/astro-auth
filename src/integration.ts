import type { AstroIntegration } from 'astro'
import { type AstroAuthConfig, virtualConfigModule } from './config'
import { dirname, join } from 'node:path'

export default (config: AstroAuthConfig = {}): AstroIntegration => ({
	name: 'astro-auth',
	hooks: {
		'astro:config:setup': async ({ config: astroConfig, injectRoute, updateConfig, logger }) => {
			updateConfig({
				vite: {
					plugins: [virtualConfigModule(config.configFile)],
					optimizeDeps: { exclude: ['auth:config'] },
				},
			})

			config.prefix ??= '/api/auth'

			if (config.injectEndpoints !== false) {
				const currentDir = dirname(import.meta.url.replace('file://', ''))
				const entrypoint = join(`${currentDir}/api/[...auth].ts`)
				injectRoute({
					pattern: `${config.prefix}/[...auth]`,
					entrypoint,
				})
			}

			if (!astroConfig.adapter) {
				logger.error('No Adapter found, please make sure you provide one in your Astro config')
			}
		},
	},
})
