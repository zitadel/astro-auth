---
title: Caching
group: Advanced
children:
  - ./url-resolutions.md
  - ./deployment/self-hosted.md
  - ./deployment/vercel.md
  - ./deployment/netlify.md
---

# Caching content

Hosting providers often offer caching at the edge. Most sites see big
speed wins (and cost savings) by taking advantage of it — no cold
start, no request processing, no JavaScript parsing, just HTML served
straight from a CDN.

By default the user's session is read server-side via `Astro.locals` /
`getSession()` and rendered into the HTML. That's fine for personalised
pages, but it's a footgun the moment those pages are cached: a cached
response containing user A's session will be served to user B.

To add caching in Astro, set `Cache-Control` via `Astro.response.headers`
or mark a page as prerendered. See the
[Astro on-demand rendering docs](https://docs.astro.build/en/guides/on-demand-rendering/).

:::warning
If you cache a route, that route MUST NOT call `getSession()` or render
session data server-side. Otherwise the first user's session leaks into
the cached HTML served to everyone else.
:::

## Page specific cache rules

For a single cached route, set `Cache-Control` from the page frontmatter
and avoid touching the session server-side. Read the session on the
client instead.

```astro
---
// src/pages/index.astro
Astro.response.headers.set(
  'cache-control',
  'public, max-age=86400, s-maxage=86400',
);
// Do not call getSession() here. Read session client-side via a
// component fetch to /api/auth/session if you need it.
const posts = await fetchPosts();
---
<main>{/* ... */}</main>
```

Alternatively, prerender the page entirely:

```astro
---
export const prerender = true;
---
<main>Static landing page</main>
```

## Global cache rules

To cache most pages by default, set `Cache-Control` in middleware and
only override it on routes (like `/profile`) that must stay dynamic.

```ts
// src/middleware.ts
import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (context, next) => {
  const response = await next();
  response.headers.set(
    'cache-control',
    'public, max-age=86400, s-maxage=86400',
  );
  return response;
});
```

## Combining rules

Headers set later in the request lifecycle (in a page's frontmatter)
override headers set in middleware. So you can flip the default per
route.

For example: cache every page except `/profile`.

```ts
// src/middleware.ts — global default: cached
response.headers.set('cache-control', 'public, max-age=86400, s-maxage=86400');
```

```astro
---
// src/pages/profile.astro — opt this route back into dynamic rendering
import { getSession } from '@/lib/auth';
Astro.response.headers.set('cache-control', 'private, no-store');
const session = await getSession(Astro.request);
---
<pre>{JSON.stringify(session, null, 2)}</pre>
```
