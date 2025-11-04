import type { PluginOption } from 'vite';
import type { AuthConfig } from '@auth/core/types';

/**
 * Configuration options specific to the Astro integration.
 *
 * @public
 */
export interface AstroIntegrationOptions {
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
  extends AstroIntegrationOptions,
    Omit<AuthConfig, 'raw'> {}

/**
 * Environment variables structure used by Auth.js configuration.
 *
 * @public
 */
export interface AuthEnvVars {
  AUTH_SECRET?: string;
  AUTH_TRUST_HOST?: string;
  VERCEL?: string;
  CF_PAGES?: string;
  NODE_ENV?: string;
}

/**
 * Retrieves environment variables from the runtime environment.
 *
 * This function provides a safe way to access Vite's `import.meta.env` object,
 * which may not be available in all contexts (e.g., during Jest testing).
 * By extracting this logic into a separate function with a parameter override,
 * we enable easy testing while maintaining the same behavior in production.
 *
 * @param envOverride - Optional environment variables to use instead of import.meta.env
 * @returns Object containing Auth.js-related environment variables
 *
 * @internal
 *
 * @remarks
 * This function accepts an optional parameter for testing purposes. In production
 * code, it reads from `import.meta.env`. In tests, callers can pass a mock
 * environment object to control the values without complex mocking.
 *
 * @example Production usage
 * ```ts
 * const env = getEnvVars()
 * console.log(env.AUTH_SECRET)
 * ```
 *
 * @example Test usage
 * ```ts
 * const env = getEnvVars({ AUTH_SECRET: 'test-secret' })
 * ```
 */
const getEnvVars = (envOverride?: AuthEnvVars): AuthEnvVars => {
  if (envOverride) {
    return envOverride;
  }

  if (typeof import.meta !== 'undefined' && import.meta.env) {
    const env = import.meta.env;
    return {
      AUTH_SECRET: env.AUTH_SECRET,
      AUTH_TRUST_HOST: env.AUTH_TRUST_HOST,
      VERCEL: env.VERCEL,
      CF_PAGES: env.CF_PAGES,
      NODE_ENV: env.NODE_ENV,
    };
  }

  return {
    AUTH_SECRET: undefined,
    AUTH_TRUST_HOST: undefined,
    VERCEL: undefined,
    CF_PAGES: undefined,
    NODE_ENV: undefined,
  };
};

/**
 * Helper function to define authentication configuration with type safety.
 *
 * This function applies default values and reads environment variables to
 * provide a complete configuration object. Environment variables are only
 * used as fallbacks when values are not explicitly provided in the config.
 *
 * Environment variables read (in order of precedence for `trustHost`):
 * - `AUTH_SECRET`: Secret key for signing/encrypting tokens
 * - `AUTH_TRUST_HOST`: Whether to trust the X-Forwarded-Host header
 * - `VERCEL`: Automatically set by Vercel (enables trustHost)
 * - `CF_PAGES`: Automatically set by Cloudflare Pages (enables trustHost)
 * - `NODE_ENV`: Node environment (trustHost enabled if not 'production')
 *
 * @param config - Authentication configuration object
 * @param envOverride - Optional environment variables for testing
 * @returns Configuration with defaults applied
 *
 * @example
 * ```ts
 * import { defineConfig } from 'astro-auth'
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
export const defineConfig = (
  config: Readonly<FullAuthConfig>,
  envOverride?: AuthEnvVars,
): FullAuthConfig => {
  const { AUTH_SECRET, AUTH_TRUST_HOST, VERCEL, CF_PAGES, NODE_ENV } =
    getEnvVars(envOverride);

  const prefix = config.prefix ?? '/api/auth';
  const secret = config.secret ?? AUTH_SECRET;
  const trustHost =
    config.trustHost ??
    !!(AUTH_TRUST_HOST ?? VERCEL ?? CF_PAGES ?? NODE_ENV !== 'production');

  return {
    ...config,
    prefix,
    basePath: prefix,
    secret,
    trustHost,
  };
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
    name: 'astro-auth-config',
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
