/**
 * Re-exports Astro components for authentication UI.
 *
 * These components provide pre-built UI elements for sign-in, sign-out,
 * and session management in Astro applications.
 *
 * @public
 */

// Component exports are consumed by end users importing from the package.
// IDEs cannot detect usage across package boundaries, resulting in false
// positive unused export warnings.
// noinspection JSUnusedGlobalSymbols
export { default as Auth } from './Auth.astro';
// noinspection JSUnusedGlobalSymbols
export { default as SignIn } from './SignIn.astro';
// noinspection JSUnusedGlobalSymbols
export { default as SignOut } from './SignOut.astro';
