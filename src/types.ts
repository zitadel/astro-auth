import type { AuthConfig, Session } from '@auth/core/types';

/**
 * Re-exported provider types from Auth.js core.
 *
 * @public
 */
export type { BuiltInProviders } from '@auth/core/providers';

/**
 * Utility type for string literals with autocomplete support.
 *
 * @internal
 */
export type LiteralUnion<T extends U, U = string> =
  | T
  | (U & Record<never, never>);

/**
 * Options for the sign-in flow.
 *
 * @public
 */
export interface SignInOptions {
  /** URL to redirect to after successful sign-in */
  callbackUrl?: string;
  /** Whether to redirect after sign-in */
  redirect?: boolean;
}

/**
 * Authorization parameters passed to the OAuth provider.
 *
 * @public
 */
export interface SignInAuthorizationParams {
  [key: string]: string;
}

/**
 * Astro-specific sign-in options extending base options.
 *
 * @public
 */
export interface AstroSignInOptions extends SignInOptions {
  /** Custom auth endpoint prefix */
  prefix?: string;
}

/**
 * Options for the sign-out flow.
 *
 * @public
 */
export interface SignOutParams {
  /** URL to redirect to after sign-out */
  callbackUrl?: string;
  /** Whether to redirect after sign-out */
  redirect?: boolean;
}

/**
 * Astro-specific sign-out options extending base options.
 *
 * @public
 */
export interface AstroSignOutParams extends SignOutParams {
  /** Custom auth endpoint prefix */
  prefix?: string;
}

/**
 * Authentication configuration for Astro integration.
 *
 * Excludes internal Auth.js properties not relevant to Astro usage.
 *
 * @public
 */
export type AstroAuthConfig = Omit<AuthConfig, 'raw'>;

/**
 * Return type for getSession function.
 *
 * @public
 */
export type GetSessionResult = Promise<Session | null>;
