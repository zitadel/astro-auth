/**
 * Shared authentication types for auth-astro
 *
 * These types maintain backward compatibility with next-auth interfaces
 * while working with @auth/core
 */

import type { AuthConfig, Session } from '@auth/core/types'

export type { BuiltInProviders } from '@auth/core/providers'
export type LiteralUnion<T extends U, U = string> = T | (U & Record<never, never>)

export interface SignInOptions {
	callbackUrl?: string
	redirect?: boolean
}

export interface SignInAuthorizationParams {
	[key: string]: string
}

export interface AstroSignInOptions extends SignInOptions {
	prefix?: string
}

export interface SignOutParams {
	callbackUrl?: string
	redirect?: boolean
}

export interface AstroSignOutParams extends SignOutParams {
	prefix?: string
}

/**
 * Define a public Astro config that cannot select the internal overload.
 *
 * The type excludes the `raw` property so that calls to `Auth` resolve to the
 * `Promise<Response>` signature. This alias should be used for all Astro code
 * paths that invoke `Auth`.
 */
export type AstroAuthConfig = Omit<AuthConfig, 'raw'>

/**
 * Promise that resolves to a session or null if no session exists.
 */
export type GetSessionResult = Promise<Session | null>
