---
title: Self Hosted
group: Advanced
category: Deployment
---

# Self Hosting

This guide explains how you can self-host a Astro application running
`@zitadel/astro-auth`.

## OAuth Provider

When deploying the OAuth provider, the application must be informed what
URL it is running at. This is to properly determine callback URLs when
navigating users to external OAuth providers.

Set the `AUTH_URL` environment variable to your application's full public
URL:

```bash
AUTH_URL=https://my-awesome-app.com
```

The URL consists of:

- **scheme:** http / https
- **host:** e.g., localhost, example.org, google.com
- **port:** empty (implies `:80` for http and `:443` for https), :3000, :8888

An example of `AUTH_URL` would be: `https://my-awesome-app.com`

In addition to verifying that the URL is correctly set, also ensure that you
have a secure [`secret` set](../../authjs/quick-start.md) — this is used to
sign and encrypt session JWTs and must be a long random string.

## Required environment variables

For production, set:

- `AUTH_URL` — the full public URL of your application
- `AUTH_SECRET` — a 32+ byte random string used to sign session JWTs
- Provider credentials (e.g. `ZITADEL_CLIENT_ID`, `ZITADEL_CLIENT_SECRET`)

> **Tip:** Generate a secret with:
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```
