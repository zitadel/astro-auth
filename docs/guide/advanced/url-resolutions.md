---
title: URL Resolution
group: Advanced
---

# URL resolution

This page clarifies how the SDK resolves the authentication base URL.

## `AUTH_URL` environment variable

The recommended way to configure the auth origin is to set the `AUTH_URL`
environment variable to the full public URL of your application:

```bash
AUTH_URL=https://my-app.com
```

The SDK derives:

- **origin:** scheme + host + port (used for cookie domain, callback URLs)
- **basePath:** any path component (default `/api/auth`)

## Defaults

If `AUTH_URL` is not set:

- In **development**, the origin is inferred from incoming requests.
- In **production**, the SDK throws `AUTH_NO_ORIGIN` to surface the
  misconfiguration early.

## Override per environment

You can set different `AUTH_URL` values per environment (development,
staging, production) using your platform's environment variable system. See
the [deployment guides](./deployment/self-hosted.md) for platform-specific
patterns (Vercel, Netlify, self-hosted).
