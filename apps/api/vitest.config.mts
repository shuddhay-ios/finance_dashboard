import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Vitest compiles with esbuild, which can't emit decorator metadata. Nest's dependency
  // injection reads that metadata to know what to inject, so tests compile with SWC instead.
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: {
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    // Starting an in-memory MongoDB takes a few seconds, longer on a cold CI runner.
    hookTimeout: 60_000,
    testTimeout: 30_000,
  },
});
