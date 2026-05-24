---
title: Session Access (client)
group: Application Side
---

# Client-side session access

Astro is server-first — most session work happens in `.astro` frontmatter.
For interactive components (React/Vue/Svelte islands), pass the session
down from the page as a prop, or fetch `/api/auth/session` client-side.

## In an Astro page

```astro
---
// src/pages/profile.astro
import { getSession } from '@zitadel/astro-auth/server';
import authConfig from '../../auth.config';
import UserBadge from '../components/UserBadge';

const session = await getSession(Astro.request, authConfig);
---
<UserBadge client:load user={session?.user} />
```

## In a client island

For purely client-side fetch:

```ts
// src/components/UserBadge.tsx (React island)
import { useEffect, useState } from 'react';

export function UserBadge() {
  const [session, setSession] = useState<{ user?: { name?: string } } | null>(null);
  useEffect(() => {
    fetch('/api/auth/session').then((r) => r.json()).then(setSession);
  }, []);
  if (!session) return <span>Loading…</span>;
  if (!session.user) return <a href="/auth/login">Sign in</a>;
  return <span>Hello, {session.user.name}</span>;
}
```

## signIn / signOut

```ts
import { signIn, signOut } from '@zitadel/astro-auth/client';

<button onClick={() => signIn('github')}>Sign in with GitHub</button>
<button onClick={() => signOut()}>Sign out</button>
```
