import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

export const sharedSourceAlias = {
  // Use the shared package's TypeScript source directly, so a change there shows up
  // instantly without rebuilding it.
  '@finance/shared': fileURLToPath(new URL('../../packages/shared/src/index.ts', import.meta.url)),
};

export default defineConfig({
  plugins: [react()],
  resolve: { alias: sharedSourceAlias },
  server: {
    // In development the API runs on :3000. Proxying makes the browser see one origin,
    // exactly like production (where Vercel forwards /api), so the SameSite=Strict
    // refresh cookie works the same in both.
    proxy: { '/api': 'http://localhost:3000' },
  },
});
