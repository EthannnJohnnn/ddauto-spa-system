import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      reporter: ['text', 'html'],
    },
    projects: [
      {
        test: {
          name: 'server',
          environment: 'node',
          include: ['apps/server/**/*.test.js'],
        },
      },
      {
        test: {
          name: 'web',
          environment: 'jsdom',
          setupFiles: ['./apps/web/src/test/setup.js'],
          include: ['apps/web/**/*.test.jsx'],
        },
      },
    ],
  },
});
