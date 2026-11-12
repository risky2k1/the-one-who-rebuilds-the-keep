import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

export default defineConfig({
  plugins: [
    swc.vite({
      module: { type: 'es6' },
    }),
  ],
  resolve: {
    alias: {
      '@keep/core': fileURLToPath(new URL('./core/src/index.ts', import.meta.url)),
    },
  },
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          include: ['**/*.test.ts'],
          exclude: [
            '**/*.int.test.ts',
            '**/node_modules/**',
            '**/dist/**',
            '.tmp/**',
            'test/fixtures/**',
          ],
          setupFiles: [fileURLToPath(new URL('./test/setup.ts', import.meta.url))],
        },
      },
      {
        test: {
          name: 'int',
          include: ['**/*.int.test.ts'],
          exclude: [
            '**/node_modules/**',
            '**/dist/**',
            '.tmp/**',
            'test/fixtures/**',
          ],
          testTimeout: 30000,
          hookTimeout: 30000,
          setupFiles: [fileURLToPath(new URL('./test/setup.ts', import.meta.url))],
        },
      },
    ],
  },
});
