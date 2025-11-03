import type { AstroIntegration } from 'astro';
import { dirname, join } from 'node:path';
import { type AstroAuthConfig, virtualConfigModule } from './config';
import { fileURLToPath } from 'node:url';

/**
 * Creates an Astro integration for authentication using Auth.js.
 *
 * This integration handles:
 * - Virtual module configuration for auth settings
 * - Automatic route injection for authentication endpoints
 * - Vite configuration for proper module resolution
 *
 * @param config - Configuration options for the integration
 * @returns Configured Astro integration
 *
 * @remarks
 * This integration requires server-side rendering. Ensure you have
 * configured an Astro adapter (e.g., `@astrojs/node`, `@astrojs/vercel`)
 * in your Astro config.
 *
 * @public
 */
export default (config: AstroAuthConfig = {}): AstroIntegration => ({
  name: 'astro-auth',
  hooks: {
    'astro:config:setup': async ({
      config: astroConfig,
      injectRoute,
      updateConfig,
      logger,
    }) => {
      // Configure Vite to handle the virtual auth config module
      updateConfig({
        vite: {
          plugins: [virtualConfigModule(config.configFile)],
          optimizeDeps: { exclude: ['auth:config'] },
        },
      });

      // Set default authentication endpoint prefix
      config.prefix ??= '/api/auth';

      // Inject authentication routes unless explicitly disabled
      if (config.injectEndpoints !== false) {
        const entrypoint = fileURLToPath(
          new URL('./api/[...auth].ts', import.meta.url),
        );

        injectRoute({
          pattern: `${config.prefix}/[...auth]`,
          entrypoint,
        });
      }

      if (!astroConfig.adapter) {
        throw new Error(
          'No adapter found. Authentication requires server-side rendering. Please add an adapter to your Astro config.',
        );
      }
    },
  },
});
