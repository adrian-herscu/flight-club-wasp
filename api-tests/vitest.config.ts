import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    setupFiles: ['./src/setup.ts'],
    sequence: { concurrent: false },
    fileParallelism: false,
  },
  resolve: {
    alias: {
      'wasp/server': path.resolve(__dirname, './src/wasp-server-stub.ts'),
      '@prisma/client': path.resolve(__dirname, '../app/node_modules/@prisma/client'),
    },
  },
});
