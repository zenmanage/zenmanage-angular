import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    // Tests that need a browser opt into jsdom with `// @vitest-environment jsdom`. The server
    // rendering test runs in Node: @zenmanage/sdk takes a window to mean "browser" and rejects
    // server keys there.
    environment: 'node',
    setupFiles: ['tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
  },
});
