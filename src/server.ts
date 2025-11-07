/**
 * > **caution**
 * > `astro-auth` is currently experimental. Be aware of breaking changes between versions.
 *
 *
 * Astro Auth is the unofficial Astro integration for Auth.js.
 * It provides a simple way to add authentication to your Astro site in a few lines of code.
 *
 * ## Installation
 *
 * `astro-auth` requires building your site in `server` mode with a platform adaper like `@astrojs/node`.
 * ```js
 * // astro.config.mjs
 * export default defineConfig({
 *   output: "server",
 *   adapter: node({
 *     mode: 'standalone'
 *   })
 * });
 * ```
 *
 * ```bash npm2yarn2pnpm
 * npm install @auth/core @auth/astro
 * ```
 */
import { Auth, createActionURL, setEnvDefaults } from '@auth/core';
import type { APIContext } from 'astro';
import authConfig from 'auth:config';
import type { AstroAuthConfig } from './types.js';
import type { Session } from '@auth/core/types';

function AstroAuthHandler(prefix: string, options = authConfig) {
  const normalizedPrefix = prefix.endsWith('/') ? prefix.slice(0, -1) : prefix;
  return async ({ request }: APIContext) => {
    const url = new URL(request.url);
    // Only handle requests that match our prefix path
    // Non-matching paths return undefined because this handler is mounted as [...auth]
    if (!url.pathname.startsWith(normalizedPrefix + '/')) {
      return;
    }

    return await Auth(request, options);
  };
}

/**
 * Creates a set of Astro endpoints for authentication.
 *
 * @param options - The configuration for authentication providers and other options.
 * @returns An object with `GET` and `POST` methods that can be exported in an Astro endpoint.
 * @throws {Error} When auth configuration is not found or not properly configured.
 *
 * @example
 * ```ts
 * export const { GET, POST } = AstroAuth({
 *   providers: [
 *     GitHub({
 *       clientId: process.env.GITHUB_ID!,
 *       clientSecret: process.env.GITHUB_SECRET!,
 *     }),
 *   ],
 *   debug: false,
 * })
 * ```
 */
export function AstroAuth(options = authConfig) {
  const config = options ?? authConfig;
  if (!config) {
    throw new Error(
      'Auth configuration not found. Please ensure auth.config is properly configured.',
    );
  }
  const { prefix = '/api/auth', ...authOptions } = config;

  const handler = AstroAuthHandler(prefix, authOptions);
  return {
    async GET(context: APIContext) {
      return await handler(context);
    },
    async POST(context: APIContext) {
      return await handler(context);
    },
  };
}

/**
 * Retrieves the current session for a Request.
 *
 * This function extracts session information from the request cookies and
 * validates it against the Auth.js configuration. It returns the session
 * object if valid or null if no valid session exists.
 *
 * @param req - The Request object
 * @param config - The authentication configuration
 * @returns Promise resolving to session data or null
 * @throws {Error} When session validation fails or Auth.js returns an error
 *
 * @example
 * ```ts
 * const session = await getSession(request, authConfig)
 * if (!session) throw new Error ("Not authenticated")
 * ```
 */
export async function getSession(
  req: Request,
  config: AstroAuthConfig,
): Promise<Session | null> {
  setEnvDefaults(process.env, config);
  const url = createActionURL(
    'session',
    new URL(req.url).protocol.replace(':', ''),
    new Headers(req.headers),
    process.env,
    config,
  );
  const headers = new Headers(req.headers);
  const response = await Auth(
    new Request(url, {
      headers,
    }),
    config,
  );
  const status = response.status ?? 200;
  const data = await response.json();
  if (!data || !Object.keys(data).length) {
    return null;
  } else {
    const astroGlobal = globalThis as unknown as {
      Astro?: { response?: { headers?: Headers } };
    };
    const target =
      astroGlobal.Astro && astroGlobal.Astro.response
        ? astroGlobal.Astro.response.headers
        : undefined;
    if (target) {
      const h = response.headers as unknown as {
        getSetCookie?: () => string[];
      };
      if (h && typeof h.getSetCookie === 'function') {
        const cookies = h.getSetCookie();
        if (Array.isArray(cookies)) {
          for (const c of cookies) {
            target.append('Set-Cookie', c);
          }
        }
      } else {
        const single = response.headers.get('set-cookie');
        if (single) {
          target.append('Set-Cookie', single);
        }
      }
    }
    if (status === 200) {
      return data as Session;
    } else {
      throw new Error(
        `[astro-auth] getSession failed: ${status} ${JSON.stringify(data)}`,
      );
    }
  }
}
