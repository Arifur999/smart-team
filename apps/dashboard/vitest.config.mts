import { defineConfig } from 'vitest/config';

// Unit tests for the pure modules (layout, time codes); components are checked in the browser.
export default defineConfig({
  test: { include: ['src/**/*.spec.ts'] },
});
