import type { PluginOption } from 'vite';
import type { AuthConfig } from '@auth/core/types';

/**
 * Configuration options specific to the Astro integration.
 *
 * @public
 */
export interface AstroAuthConfig {
  /**
   * Base path for authentication routes.
   *
   * @defaultValue '/api/auth'
   *
   * @example
   * ```js
   * authAstro({ prefix: '/auth' })
   * // Routes will be available at /auth/signin, /auth/signout, etc.
   * ```
   */
  prefix?: string;

  /**
   * Whether the integration should automatically inject authentication
   * endpoints.
   *
   * Set to `false` if you want to manually define authentication routes.
   *
   * @defaultValue true
   */
  injectEndpoints?: boolean;

  /**
   * Path to the authentication configuration file.
   *
   * @defaultValue './auth.config'
   *
   * @example
   * ```js
   * authAstro({ configFile: './config/authentication.ts' })
   * ```
   */
  configFile?: string;
}

/**
 * Complete authentication configuration merging Astro-specific options
 * with Auth.js core configuration.
 *
 * @public
 */
export interface FullAuthConfig
  extends AstroAuthConfig,
    Omit<AuthConfig, 'raw'> {}

/**
 * Helper function to define authentication configuration with type safety.
 *
 * @param config - Authentication configuration object
 * @returns Configuration with defaults applied
 *
 * @example
 * ```ts
 * import { defineConfig } from 'auth-astro'
 * import GitHub from '@auth/core/providers/github'
 *
 * export default defineConfig({
 *   providers: [
 *     GitHub({
 *       clientId: process.env.GITHUB_ID,
 *       clientSecret: process.env.GITHUB_SECRET
 *     })
 *   ],
 *   secret: process.env.AUTH_SECRET
 * })
 * ```
 *
 * @public
 */
export const defineConfig = (config: FullAuthConfig): FullAuthConfig => {
  config.prefix ??= '/api/auth';
  config.basePath = config.prefix;
  return config;
};

/**
 * Creates a Vite virtual module plugin for auth configuration.
 *
 * Allows importing user configuration via the `auth:config` virtual module
 * regardless of the actual file location specified in the integration
 * configuration.
 *
 * @param configFile - Path to the configuration file
 * @returns Vite plugin for handling the virtual module
 *
 * @internal
 */
export const virtualConfigModule = (
  configFile: string = './auth.config',
): PluginOption => {
  const virtualModuleId = 'auth:config';
  const resolvedId = '\0' + virtualModuleId;

  return {
    name: 'auth-astro-config',
    resolveId: (id) => {
      if (id === virtualModuleId) {
        return resolvedId;
      }
    },
    load: (id) => {
      if (id === resolvedId) {
        return `import authConfig from "${configFile}"; export default authConfig`;
      }
    },
  };
};
