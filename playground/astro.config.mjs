import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import node from '@astrojs/node';
import auth from '@zitadel/astro-auth';

// Load .env into process.env so server-side code using process.env works in dev
try { process.loadEnvFile?.('.env'); } catch { /* .env may not exist */ }

export default defineConfig({
  integrations: [auth()],
  output: 'server',
  adapter: node({
    mode: 'standalone',
  }),
  server: {
    port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
  },
  vite: {
    plugins: [tailwindcss()],
    server: {
      headers: {
        'X-Frame-Options': 'DENY',
        'Content-Security-Policy':
          "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline';",
        'Referrer-Policy': 'strict-origin-when-cross-origin',
      },
    },
  },
});
