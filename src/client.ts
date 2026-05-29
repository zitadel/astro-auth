const BASE_PATH = '/api/auth';

/**
 * Submits a CSRF-protected POST form to an Auth.js action endpoint.
 *
 * Auth.js v5 only accepts POST requests carrying a CSRF token at its action
 * endpoints; a plain GET navigation is rejected as an `UnknownAction` and
 * redirects to the Configuration error page. We fetch the current CSRF token
 * and submit a hidden form so the browser performs a real POST navigation.
 *
 * @param action - The Auth.js endpoint to post to
 * @param fields - Extra hidden fields to include alongside the CSRF token
 */
async function postToAuth(
  action: string,
  fields: Record<string, string>,
): Promise<void> {
  const res = await fetch(`${BASE_PATH}/csrf`);
  const { csrfToken } = (await res.json()) as { csrfToken: string };

  const form = document.createElement('form');
  form.method = 'POST';
  form.action = action;

  for (const [name, value] of Object.entries({ csrfToken, ...fields })) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }

  document.body.appendChild(form);
  form.submit();
}

/**
 * Client-side sign-in helper for Astro applications.
 *
 * @param provider - The provider ID to sign in with. When omitted, the request
 *   targets the provider chooser page.
 * @param options - Sign-in options
 *
 * @public
 */
export async function signIn(
  provider?: string,
  options: { callbackUrl?: string } = {},
): Promise<void> {
  const action = provider
    ? `${BASE_PATH}/signin/${provider}`
    : `${BASE_PATH}/signin`;
  const fields: Record<string, string> = {};
  if (options.callbackUrl) {
    fields.callbackUrl = options.callbackUrl;
  }
  await postToAuth(action, fields);
}

/**
 * Client-side sign-out helper for Astro applications.
 *
 * @param options - Sign-out options
 *
 * @public
 */
export async function signOut(
  options: { callbackUrl?: string } = {},
): Promise<void> {
  const fields: Record<string, string> = {};
  if (options.callbackUrl) {
    fields.callbackUrl = options.callbackUrl;
  }
  await postToAuth(`${BASE_PATH}/signout`, fields);
}
