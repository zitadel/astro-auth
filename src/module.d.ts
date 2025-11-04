/**
 * Ambient module declarations for the astro-auth plugin.
 *
 * This file declares TypeScript types for modules that exist at runtime
 * but are not standard TypeScript files, enabling proper type checking
 * and IDE support throughout the codebase.
 */

/**
 * Type declaration for Astro component files.
 *
 * Provides TypeScript support for importing .astro components by
 * defining their module signature. This declaration is consumed by
 * TypeScript's module resolution system during type checking.
 *
 * @example
 * ```ts
 * import MyComponent from './MyComponent.astro'
 * ```
 *
 * @remarks
 * The unused export warning from linters can be safely ignored. This
 * is an ambient type declaration used by TypeScript's type system for
 * module resolution, not runtime code.
 */
declare module '*.astro' {
  import type { AstroComponentFactory } from 'astro/runtime/server/index.js';
  const component: AstroComponentFactory;
  export default component;
}

/**
 * Virtual module declaration for auth configuration.
 *
 * @remarks
 * The `auth:config` module is a virtual module created by Vite through
 * the `virtualConfigModule` plugin defined in config.ts. It does not
 * correspond to an actual file on disk but is instead resolved
 * dynamically at build time.
 *
 * This pattern solves the challenge of importing user configuration
 * across the plugin codebase without hardcoding file paths. Since
 * users may place their auth configuration file at any location in
 * their project, the virtual module provides a stable import specifier
 * that works consistently regardless of the actual file location.
 *
 * The integration registers a Vite plugin that intercepts imports of
 * `auth:config` and resolves them to the user's specified
 * configuration file path (defaulting to `./auth.config` if not
 * explicitly configured via the `configFile` option).
 *
 * This declaration informs TypeScript that the `auth:config` module
 * exists and exports a default value conforming to the
 * `FullAuthConfig` type, preventing module resolution errors during
 * type checking while maintaining type safety.
 *
 * @example
 * User configuration in `auth.config.ts`:
 * ```ts
 * export default {
 *   providers: [GitHub({
 *     clientId: process.env.GITHUB_ID,
 *     clientSecret: process.env.GITHUB_SECRET
 *   })],
 *   secret: process.env.AUTH_SECRET
 * }
 * ```
 *
 * @example
 * Plugin code consuming the virtual module:
 * ```ts
 * import authConfig from 'auth:config'
 *
 * export const { GET, POST } = AstroAuth(authConfig)
 * ```
 *
 * @example
 * Custom configuration file path in `astro.config.mjs`:
 * ```js
 * export default defineConfig({
 *   integrations: [
 *     authAstro({
 *       configFile: './config/authentication.ts'
 *     })
 *   ]
 * })
 * ```
 */
declare module 'auth:config' {
  const config: import('./config').FullAuthConfig;
  // Default export is consumed by the virtual module system and imported
  // throughout the plugin via 'auth:config'. IDEs cannot trace virtual
  // module usage, resulting in false positive unused export warnings.
  // noinspection JSUnusedGlobalSymbols
  export default config;
}
