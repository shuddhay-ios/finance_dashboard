import { defineConfig } from 'vitest/config';
import { sharedSourceAlias } from './vite.config';

// Kept separate from vite.config.ts: Vitest compiles JSX itself (from tsconfig's
// "jsx": "react-jsx"), so tests don't need the React plugin.
export default defineConfig({
  resolve: { alias: sharedSourceAlias },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Component tests render full MUI dialogs; with every file running in parallel on a
    // slower machine, the default 5 s is too tight.
    testTimeout: 15_000,
  },
});
