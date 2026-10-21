import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Set the proxy option without relying on platform-specific shell syntax.
const result = spawnSync(process.execPath, [fileURLToPath(new URL('../server.js', import.meta.url))], {
  stdio: 'inherit',
  env: { ...process.env, NODE_USE_ENV_PROXY: process.env.NODE_USE_ENV_PROXY ?? '1' },
});
if (result.error) console.error(result.error.message);
process.exitCode = result.status ?? 1;
