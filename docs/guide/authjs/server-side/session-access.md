---
title: Session Access
group: Auth.js Provider
category: Server Side
---

# Server-side session access

Access the current session in any `.astro` page frontmatter or API route
using the module-level `getSession` from `@zitadel/astro-auth/server`:

## In an Astro page

```astro
---
// src/pages/profile.astro
import { getSession } from '@zitadel/astro-auth/server';
import authConfig from '../../auth.config';

const session = await getSession(Astro.request, authConfig);
if (!session) return Astro.redirect('/auth/login');
---
<h1>Hello, {session.user?.name}</h1>
```

## In an API route

```ts
// src/pages/api/me.ts
import type { APIRoute } from 'astro';
import { getSession } from '@zitadel/astro-auth/server';
import authConfig from '../../../auth.config';

export const GET: APIRoute = async ({ request }) => {
  const session = await getSession(request, authConfig);
  if (!session) {
    return new Response(JSON.stringify({ error: 'unauthorised' }), { status: 401 });
  }
  return new Response(JSON.stringify({ user: session.user }));
};
```

## Return shape

`getSession()` returns the `Session` object Auth.js builds in the `session`
callback, or `null` when no valid session exists. It throws when Auth.js
returns a non-200.
