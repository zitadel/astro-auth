import type { APIRoute } from 'astro';

/** Public endpoint — accessible without authentication. */
// noinspection JSUnusedGlobalSymbols
export const GET: APIRoute = async () => {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
