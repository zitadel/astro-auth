---
title: Custom Pages
group: OAuth Provider
---

# Custom auth pages

Point `pages.signIn` and `pages.error` at your custom routes:

## Config

```ts
// auth.config.ts
import { defineConfig } from '@zitadel/astro-auth';

export default defineConfig({
  // ...
  pages: { signIn: '/auth/login', error: '/auth/error' },
});
```

## Custom sign-in page

```astro
---
// src/pages/auth/login.astro
const callbackUrl = Astro.url.searchParams.get('callbackUrl') ?? '/';
---
<form action="/api/auth/signin/github" method="post">
  <input type="hidden" name="csrfToken" value="" />
  <input type="hidden" name="callbackUrl" value={callbackUrl} />
  <button type="submit">Sign in with GitHub</button>
</form>

<script>
  // Populate the CSRF token client-side
  const r = await fetch('/api/auth/csrf');
  const { csrfToken } = await r.json();
  const input = document.querySelector('input[name="csrfToken"]') as HTMLInputElement;
  if (input) input.value = csrfToken ?? '';
</script>
```

## Custom error page

```astro
---
// src/pages/auth/error.astro
const error = Astro.url.searchParams.get('error') ?? 'default';
---
<main>
  <h1>Sign-in error</h1>
  <p>Code: {error}</p>
</main>
```
