import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApplication } from './application.js';
import { loadConfig } from './config.js';
import { DatabaseService } from './database/database.service.js';

export async function startApi({ manageSignals = true } = {}) {
  const config = loadConfig();
  const { app } = await createApplication(config);
  try {
    await app.get(DatabaseService).verifyRuntime();
    if (manageSignals) app.enableShutdownHooks();
    await app.listen(config.port, '127.0.0.1');
    console.log(`SEP development API: http://127.0.0.1:${config.port}/api/docs`);
    return app;
  } catch (error) { await app.close(); throw error; }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  void startApi().catch(() => { console.error('API startup failed. Check local configuration, migrations and runtime privileges.'); process.exitCode = 1; });
}
