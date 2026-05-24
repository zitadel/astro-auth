import Credentials from '@auth/core/providers/credentials';
import type { FullAuthConfig } from '@zitadel/astro-auth';

type GetEnvFunction = (key: string) => string | undefined;

export function createAuthOptions(getEnv: GetEnvFunction): FullAuthConfig {
  const oauthIssuerUrl = getEnv('OAUTH_ISSUER_URL');
  return {
    trustHost: true,
    providers: [
      ...(oauthIssuerUrl
        ? [
            {
              id: 'mock-oidc',
              name: 'Mock OIDC',
              type: 'oidc' as const,
              issuer: oauthIssuerUrl,
              clientId: getEnv('OAUTH_CLIENT_ID') ?? 'test-client',
              clientSecret: getEnv('OAUTH_CLIENT_SECRET') ?? 'test-secret',
            },
          ]
        : []),
      Credentials({
        credentials: {
          username: { label: 'Username' },
          password: { label: 'Password', type: 'password' },
        },
        authorize(credentials) {
          if (
            credentials?.username === 'jsmith' &&
            credentials?.password === 'hunter2'
          ) {
            return { id: '1', name: 'J Smith', email: 'jsmith@example.com' };
          }
          return null;
        },
      }),
    ],
    basePath: '/api/auth',
    prefix: '/api/auth',
    session: { strategy: 'jwt' },
    secret: getEnv('AUTH_SECRET')!,
    callbacks: {
      redirect({ url, baseUrl }) {
        try {
          // Resolve relative URLs (Auth.js passes them unresolved) against baseUrl
          const parsed = new URL(url, baseUrl);
          const base = new URL(baseUrl);
          // Block cross-origin redirects
          if (parsed.origin !== base.origin) {
            return `${baseUrl}/profile`;
          }
          // When no explicit callbackUrl is set (default = base URL /), send to profile
          if (parsed.pathname === '/' && !parsed.search) {
            return `${baseUrl}/profile`;
          }
          // Otherwise pass through (handles signout → logout callback path)
          return parsed.href;
        } catch {
          return `${baseUrl}/profile`;
        }
      },
    },
  };
}
