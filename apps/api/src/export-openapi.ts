import { randomBytes, randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApplication } from './application.js';

async function main() {
  // No listener or database connection is opened when exporting the contract.
  const { app, document } = await createApplication({
    databaseUrl: 'postgresql://unused@127.0.0.1:1/unused', authMode: 'development-token',
    tokens: new Map([[randomBytes(32).toString('hex'), randomUUID()]]), port: 3000,
  });
  try { writeFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../../../docs/api/openapi.json'), `${JSON.stringify(document, null, 2)}\n`); }
  finally { await app.close(); }
}
void main().catch(() => { console.error('OpenAPI export failed.'); process.exitCode = 1; });
