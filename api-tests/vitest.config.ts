import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    globalSetup: ['./global-setup.ts'],
    // Load .env.test before any test file or setup file runs
    setupFiles: ['./src/setup.ts'],
    // Run tests sequentially to avoid DB race conditions across files.
    sequence: { concurrent: false },
    fileParallelism: false,
  },
  resolve: {
    alias: {
      // Redirect the unresolvable Wasp SDK path to a local stub that provides
      // the identical HttpError class and a real PrismaClient instance.
      'wasp/server': path.resolve(__dirname, './src/wasp-server-stub.ts'),
      // Prisma generate writes to app/node_modules (it resolves from the schema
      // path). Point @prisma/client at that already-generated client so our stub
      // and test files get the correct types and query engine.
      '@prisma/client': path.resolve(__dirname, '../app/node_modules/@prisma/client'),
    },
  },
});
