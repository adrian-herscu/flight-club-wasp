import { defineProject, defineWorkspace } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sharedTestConfig = {
  environment: 'node' as const,
  globals: false,
  setupFiles: ['./src/setup.ts'],
  sequence: { concurrent: false },
  fileParallelism: false,
};

const sharedResolveConfig = {
  alias: {
    'wasp/server': path.resolve(__dirname, './src/wasp-server-stub.ts'),
    '@prisma/client': path.resolve(__dirname, '../app/node_modules/@prisma/client'),
  },
};

export default defineWorkspace([
  defineProject({
    resolve: sharedResolveConfig,
    test: {
      ...sharedTestConfig,
      name: 'traceability',
      include: ['tests/00-std-traceability.spec.ts'],
    },
  }),
  defineProject({
    resolve: sharedResolveConfig,
    test: {
      ...sharedTestConfig,
      name: 'api',
      include: ['tests/**/*.spec.ts'],
      exclude: ['tests/00-std-traceability.spec.ts'],
      globalSetup: ['./global-setup.ts'],
    },
  }),
]);