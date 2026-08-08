import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

// AURA lives in a subfolder of a monorepo that contains other, unrelated
// vite configs. Pinning root + config here keeps vitest from climbing up
// and loading a sibling project's config. The `@` alias mirrors the
// tsconfig path mapping used across the app.
export default defineConfig({
  root: projectRoot,
  resolve: {
    alias: { '@': projectRoot },
  },
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts', 'app/**/*.test.ts'],
  },
});
