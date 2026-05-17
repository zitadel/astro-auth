import type { APIRoute } from 'astro';

/** Middleware-protected endpoint — auth enforced by middleware.ts. */
// noinspection JSUnusedGlobalSymbols
export const GET: APIRoute = async () => {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
