import { defineConfig } from 'vitest/config';

// tsc also compiles the specs into dist/; run each test once, from source.
export default defineConfig({
  test: { include: ['src/**/*.spec.ts'] },
});
