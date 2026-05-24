import type { APIRoute } from 'astro';
import { getSession } from '@zitadel/astro-auth/server';
import authConfig from '../../../auth.config.ts';
import type { Session } from '@auth/core/types';

// noinspection JSUnusedGlobalSymbols
/**
 * ZITADEL UserInfo API Route
 *
 * Fetches extended user information from ZITADEL's UserInfo endpoint.
 * This provides real-time user data including roles, custom attributes,
 * and organization membership that may not be in the cached session.
 *
 * ## Usage
 *
 * ```typescript
 * const response = await fetch('/api/userinfo');
 * const userInfo = await response.json();
 * ```
 *
 * ## Returns
 *
 * Extended user profile with ZITADEL-specific claims like roles and metadata.
 */
export const GET: APIRoute = async ({ request }) => {
  const session: Session | null = await getSession(request, authConfig);

  if (!session?.accessToken) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  try {
    const response = await fetch(
      `${process.env.ZITADEL_DOMAIN}/oidc/v1/userinfo`,
      {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      },
    );

    if (!response.ok) {
      // noinspection ExceptionCaughtLocallyJS
      throw new Error(`UserInfo API error: ${response.status}`);
    }

    const userInfo = await response.json();
    return new Response(JSON.stringify(userInfo), {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('UserInfo fetch failed:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch user info' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
  }
};
