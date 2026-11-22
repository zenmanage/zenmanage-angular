import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/lib/**/*.ts'],
      exclude: [
        'node_modules/**',
        'dist/**',
        'tests/**',
        'examples/**',
        '**/*.d.ts',
        '**/*.config.ts',
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
