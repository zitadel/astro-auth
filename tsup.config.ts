import { defineConfig } from 'tsup';
import { promises as fs } from 'node:fs';
import type { Dirent } from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'esbuild';

async function copyAstroOnly(src: string, dest: string): Promise<void> {
  await fs.mkdir(dest, { recursive: true });
  const entries: Dirent[] = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyAstroOnly(srcPath, destPath);
    } else if (entry.name.endsWith('.astro')) {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

const astroExternal: Plugin = {
  name: 'astro-external',
  setup(build) {
    build.onResolve({ filter: /\.astro$/ }, (args) => ({
      path: args.path,
      external: true,
    }));
  },
};

// noinspection JSUnusedGlobalSymbols
export default defineConfig({
  entry: {
    index: 'src/index.ts',
    client: 'src/client.ts',
    server: 'src/server.ts',
    'components/index': 'src/components/index.ts',
  },
  external: ['auth:config'],
  format: ['esm'],
  splitting: false,
  sourcemap: true,
  clean: true,
  esbuildPlugins: [astroExternal],
  dts: {
    entry: {
      index: 'src/index.ts',
      client: 'src/client.ts',
      server: 'src/server.ts',
      'components/index': 'src/components/index.ts',
    },
    resolve: false,
  },
  async onSuccess() {
    await copyAstroOnly('src/components', 'dist/components');
  },
});
