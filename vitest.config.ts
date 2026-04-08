import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    globalSetup: ['./tests/api/container-setup.ts'],
    setupFiles: ['./tests/api/setup.ts'],
    sequence: { concurrent: false },
    fileParallelism: true,
    include: ['./tests/api/**/*.spec.ts'],
    coverage: {
      reportsDirectory: './out/coverage',
    },
  },
  resolve: {
    alias: {
      'wasp/server': resolve('./tests/api/wasp-server-stub.ts'),
      '@prisma/client': resolve('./node_modules/@prisma/client'),
    },
  },
});
