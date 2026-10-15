import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';
import { migrateDatabase } from '../apps/api/dist/database/migrate.js';
import { demoAuthentication, fixture, seedDemo } from './demo-fixtures.mjs';

const mode = process.argv[2];
if (mode !== 'test' && mode !== 'demo') throw new Error('Use npm test or npm run dev:demo');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const runDirectory = join(root, '.local', `api-${randomUUID()}`);
const data = join(runDirectory, 'data');
mkdirSync(runDirectory, { recursive: true });
const bin = process.env.SEP_PG_BIN ?? (process.platform === 'win32' ? 'C:/Program Files/PostgreSQL/18/bin' : '');
const pgCommand = (name) => bin ? join(bin, process.platform === 'win32' ? `${name}.exe` : name) : name;
function pgRun(name, args) {
  const fd = openSync(join(runDirectory, `${name}.log`), 'a');
  try {
    // Give PostgreSQL its own hidden process group on Windows so terminal Ctrl+C
    // reaches the launcher, not the database workers being shut down in finally.
    const result = spawnSync(pgCommand(name), args, { windowsHide: true, detached: process.platform === 'win32', stdio: ['ignore', fd, fd], timeout: 60000 });
    if (result.error || result.status !== 0) {
      for (const log of [join(runDirectory, `${name}.log`), join(runDirectory, 'postgres.log')]) {
        if (existsSync(log)) console.error(readFileSync(log, 'utf8').split('\n').slice(-20).join('\n'));
      }
      throw new Error(`${name} failed; inspect local logs in ${runDirectory}`);
    }
  } finally { closeSync(fd); }
}
async function freePort() {
  return new Promise((resolvePort, reject) => {
    const server = createServer(); server.on('error', reject);
    server.listen(0, '127.0.0.1', () => { const address = server.address(); server.close(() => resolvePort(address.port)); });
  });
}
const port = await freePort();
const url = (user, database = 'sep_demo') => `postgresql://${user}@127.0.0.1:${port}/${database}`;
let started = false;
let app;
try {
  pgRun('initdb', ['-D', data, '-U', 'sep_local_admin', '-A', 'trust', '--encoding=UTF8', '--no-locale']);
  started = true;
  // All clients use TCP. Disable Unix sockets so distribution defaults such as
  // /var/run/postgresql do not require privileges outside this temporary cluster.
  pgRun('pg_ctl', ['-D', data, '-l', join(runDirectory, 'postgres.log'), '-o', `-h 127.0.0.1 -p ${port} -c unix_socket_directories=`, '-w', 'start']);
  const bootstrap = new Pool({ connectionString: url('sep_local_admin', 'postgres') });
  try {
    await bootstrap.query('CREATE ROLE sep_migrator LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS');
    await bootstrap.query('CREATE ROLE sep_runtime LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS');
    await bootstrap.query('CREATE DATABASE sep_demo OWNER sep_migrator');
  } finally { await bootstrap.end(); }
  await migrateDatabase(url('sep_migrator'));
  await migrateDatabase(url('sep_migrator'));
  const admin = new Pool({ connectionString: url('sep_local_admin') });
  try { await seedDemo(admin); } finally { await admin.end(); }
  const auth = demoAuthentication();
  const environment = { ...process.env, NODE_ENV: mode === 'test' ? 'test' : 'development', AUTH_MODE: 'development-token',
    DATABASE_URL: url('sep_runtime'), DEV_AUTH_TOKENS_JSON: JSON.stringify(auth.mapping),
    SEP_TEST_ADMIN_URL: url('sep_local_admin'), SEP_TEST_TOKENS: JSON.stringify(auth.tokens) };
  if (mode === 'test') {
    const result = spawnSync(process.execPath, ['--test', '--test-reporter=spec', 'tests/api/api.test.mjs'],
      { cwd: root, env: environment, windowsHide: true, stdio: 'inherit', timeout: 60000 });
    if (result.error || result.status !== 0) process.exitCode = 1;
  } else {
    environment.PORT = process.env.PORT ?? String(await freePort());
    Object.assign(process.env, environment);
    const { startApi } = await import('../apps/api/dist/main.js');
    app = await startApi({ manageSignals: false });
    const credentials = join(runDirectory, 'demo.json');
    writeFileSync(credentials, JSON.stringify({ baseUrl: `http://127.0.0.1:${environment.PORT}`, hosts: fixture.hosts, events: fixture.events, tokens: auth.tokens }, null, 2));
    console.log(`Demo configuration and ephemeral tokens: ${credentials}`);
    console.log('Use a registered Host header. Ctrl+C stops API and its temporary PostgreSQL.');
    await new Promise((done) => { process.once('SIGINT', done); process.once('SIGTERM', done); });
  }
} finally {
  if (app) await app.close();
  if (started && existsSync(join(data, 'postmaster.pid'))) pgRun('pg_ctl', ['-D', data, '-m', 'fast', '-w', 'stop']);
  console.log('Temporary API PostgreSQL stopped; installed PostgreSQL service was not modified.');
}
