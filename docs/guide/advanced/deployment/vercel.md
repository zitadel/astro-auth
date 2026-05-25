---
title: Vercel
group: Advanced
category: Deployment
---

# Deploying on Vercel

When deploying on Vercel ensure all required environment variables are set.
Read more about general deployment [here](./self-hosted.md).

## Differences to Self hosted deployments

Vercel can automatically assign domain names for your application. If you
would like to access the generated domain through your environment variables
you can access the [system environment variable `VERCEL_URL`](https://vercel.com/docs/projects/environment-variables/system-environment-variables).

This variable is available at both build and run-time. Set `AUTH_URL` dynamically
so that callbacks and signed-cookie origins resolve to the deployed URL:

```bash
AUTH_URL=https://${VERCEL_URL}
```

Most platforms allow you to compose env vars at build time. If yours doesn't,
you can derive AUTH_URL at runtime from `process.env.VERCEL_URL` inside your
auth configuration.

> **Warning:** Securing a preview deployment (with an OAuth provider) comes
> with some critical obstacles. Most OAuth providers only allow a single
> redirect/callback URL, or at least a set of full static URLs. Meaning you
> cannot set the value before publishing the site and you cannot use wildcard
> subdomains in the callback URL settings of your OAuth provider. To avoid
> this, OAuth has a few suggestions you can find
> [here](https://authjs.dev/getting-started/deployment).
