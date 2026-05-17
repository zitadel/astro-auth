import type { APIRoute } from 'astro';
import { getSession } from '@zitadel/astro-auth/server';
import { createAuthOptions } from '../../lib/auth.js';

/** Protected endpoint — returns 403 when the request is unauthenticated. */
// noinspection JSUnusedGlobalSymbols
export const GET: APIRoute = async ({ request }) => {
  const authConfig = createAuthOptions((key) => process.env[key]);
  const session = await getSession(request, authConfig);
  if (!session) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
