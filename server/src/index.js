import { createApp } from './app.js';
import { env, assertProdSecrets } from './config/env.js';
import { getPool, closePool } from './config/db.js';

assertProdSecrets();

const app = createApp();

const server = app.listen(env.port, () => {
   
  console.log(`LabScan API listening on http://localhost:${env.port} (${env.nodeEnv})`);
  // Warm the pool so the first request doesn't pay connection cost.
  getPool();
});

async function shutdown(signal) {
   
  console.log(`\n${signal} received, shutting down...`);
  server.close(async () => {
    await closePool();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
