---
title: Introduction
group: Getting Started
children:
  - ./installation.md
---

# Introduction

`@zitadel/astro-auth` is an open source Astro integration that provides
authentication for Astro applications. It wraps
auth (`@auth/core`) to bring OAuth, credentials, and
magic-link authentication to Astro with a native developer experience.

Through a direct integration as an Astro integration, you can access and
utilize user sessions within your Astro pages, API routes, and components
directly.

## Features

### Authentication providers

- OAuth (eg. GitHub, Google, Twitter, Azure...)
- Custom OAuth (Add your own!)
- Credentials (username / email + password)
- Email Magic URLs

### Application Side Session Management

- Session fetching from `Astro.locals.session` (set by the auth integration)
- Methods to `getSession`, `signIn`, `signInUrl`, `signOut`, `signOutUrl`
- Full TypeScript support for all methods and properties

### Application protection

- Page frontmatter gating: redirect from `.astro` files based on session
- API route protection via `getSession(request)`
- Server-rendered session access in any `.astro` page
