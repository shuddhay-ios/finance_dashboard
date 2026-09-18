import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Vitest compiles with esbuild, which can't emit decorator metadata. Nest's dependency
  // injection reads that metadata to know what to inject, so tests compile with SWC instead.
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: {
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    // Each integration test file starts its own in-memory MongoDB. GitHub's runners have two
    // cores, so running the files in parallel there can exceed the start-up timeout; locally
    // parallel is much faster.
    fileParallelism: !process.env.CI,
    hookTimeout: 120_000,
    testTimeout: 60_000,
  },
});
