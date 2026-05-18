/**
 * Client-side sign-in helper for Remix applications.
 *
 * @param provider - The provider ID to sign in with
 * @param options - Sign-in options
 */
export async function signIn(
  provider?: string,
  options: { callbackUrl?: string } = {},
): Promise<void> {
  const basePath = '/api/auth';
  const params = new URLSearchParams();
  if (options.callbackUrl) {
    params.set('callbackUrl', options.callbackUrl);
  }
  const paramStr = params.toString();
  const url = provider
    ? `${basePath}/signin/${provider}${paramStr ? `?${paramStr}` : ''}`
    : `${basePath}/signin${paramStr ? `?${paramStr}` : ''}`;
  window.location.href = url;
}

/**
 * Client-side sign-out helper for Remix applications.
 *
 * @param options - Sign-out options
 */
export async function signOut(
  options: { callbackUrl?: string } = {},
): Promise<void> {
  const basePath = '/api/auth';
  const params = new URLSearchParams();
  if (options.callbackUrl) {
    params.set('callbackUrl', options.callbackUrl);
  }
  const paramStr = params.toString();
  window.location.href = `${basePath}/signout${paramStr ? `?${paramStr}` : ''}`;
}
