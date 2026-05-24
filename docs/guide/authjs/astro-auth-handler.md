---
title: AstroAuth Factory
group: Auth.js Provider
---

# AstroAuth Factory

`@zitadel/astro-auth` uses Astro's integration pattern. The integration
auto-mounts the auth routes; you supply the config via `auth.config.ts`:

## astro.config.mjs

```js
import { defineConfig } from 'astro/config';
import authAstro from '@zitadel/astro-auth';

export default defineConfig({
  output: 'server',
  integrations: [authAstro()],
});
```

## auth.config.ts

```ts
import { defineConfig } from '@zitadel/astro-auth';
import GitHub from '@auth/core/providers/github';

export default defineConfig({
  secret: import.meta.env.AUTH_SECRET,
  providers: [
    GitHub({
      clientId: import.meta.env.GITHUB_ID,
      clientSecret: import.meta.env.GITHUB_SECRET,
    }),
  ],
});
```

## Programmatic factory

For advanced cases (custom route mounting), `AstroAuth()` returns:

```ts
import { AstroAuth } from '@zitadel/astro-auth/server';

const { handlers, GET, POST, getSession, signIn, signInUrl, signOut, signOutUrl } =
  AstroAuth();
```

## Server-side reads

`getSession` is also exported standalone from `@zitadel/astro-auth/server`
for use in `.astro` pages. See
[Server-side session access](./server-side/session-access.md).
