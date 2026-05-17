import { defineMiddleware } from 'astro:middleware';
import { getSession } from '@zitadel/astro-auth/server';
import { createAuthOptions } from './lib/auth.js';

/** Protects /api/protected/* routes before the route handler runs. */
export const onRequest = defineMiddleware(async (context, next) => {
  if (context.url.pathname.startsWith('/api/protected/')) {
    const authConfig = createAuthOptions(
      (key) => (import.meta.env[key] as string | undefined) ?? process.env[key],
    );
    const session = await getSession(context.request, authConfig);
    if (!session) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }
  return next();
});
