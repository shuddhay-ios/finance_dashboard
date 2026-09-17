import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

// The repo-root .env, reached from both src/config (tsx) and dist/config (built).
const ROOT_ENV_FILE = resolve(__dirname, '../../../../.env');

/**
 * Local development keeps variables in the repo-root .env. In Docker and on Render the
 * platform injects them and there is no file, so a missing file is normal, not an error.
 */
export function loadEnvFileIfPresent(): void {
  if (existsSync(ROOT_ENV_FILE)) {
    process.loadEnvFile(ROOT_ENV_FILE);
  }
}
