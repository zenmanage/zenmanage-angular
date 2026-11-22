import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    // Component tests run in jsdom. Server rendering and server helpers run in Node: a file
    // opts in with `// @vitest-environment node`, because @zenmanage/sdk takes a window to mean
    // "browser" and rejects server keys there.
    environment: 'jsdom',
    setupFiles: ['tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'node_modules/**',
        'dist/**',
        'tests/**',
        'examples/**',
        '**/*.d.ts',
        '**/*.config.ts',
        'src/public-api.ts',
      ],
      thresholds: {
        lines: 92,
        functions: 92,
        branches: 88,
        statements: 92,
      },
    },
  },
});
