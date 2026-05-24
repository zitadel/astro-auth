---
title: Protecting Pages
group: Application Side
---

# Protecting pages

Astro gates pages from the `.astro` page frontmatter. Call `Astro.redirect`
when the session is absent and the page never renders.

## In an Astro page

```astro
---
// src/pages/profile.astro
import { getSession } from '@zitadel/astro-auth/server';
import authConfig from '../../auth.config';

const session = await getSession(Astro.request, authConfig);
if (!session) {
  return Astro.redirect(`/auth/login?callbackUrl=${encodeURIComponent(Astro.url.pathname)}`);
}
---
<h1>Hello, {session.user?.name}</h1>
```

## Reusable middleware

For protecting many pages at once, use Astro's middleware feature:

```ts
// src/middleware.ts
import { defineMiddleware } from 'astro:middleware';
import { getSession } from '@zitadel/astro-auth/server';
import authConfig from '../auth.config';

const protectedPaths = ['/profile', '/dashboard'];

export const onRequest = defineMiddleware(async (context, next) => {
  if (protectedPaths.some((p) => context.url.pathname.startsWith(p))) {
    const session = await getSession(context.request, authConfig);
    if (!session) return context.redirect('/auth/login');
    context.locals.session = session;
  }
  return next();
});
```

Then in pages, read `Astro.locals.session` directly.
