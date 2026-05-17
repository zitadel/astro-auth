import type { APIRoute } from 'astro';

// noinspection JSUnusedGlobalSymbols
/**
 * Handles the logout callback by clearing all Auth.js session cookies and
 * redirecting to the success page. Used by Playwright tests to verify cookie
 * clearing. State validation is omitted in the playground.
 */
export const GET: APIRoute = async ({ cookies, request }) => {
  const cookieHeader = request.headers.get('cookie') ?? '';
  for (const part of cookieHeader.split(';')) {
    const name = part.trim().split('=')[0].trim();
    if (name.startsWith('authjs.')) {
      cookies.delete(name, { path: '/' });
    }
  }
  return new Response(null, {
    status: 302,
    headers: { Location: '/' },
  });
};
