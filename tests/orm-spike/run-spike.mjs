import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { closeSync, existsSync, mkdirSync, openSync } from 'node:fs';
import { createServer } from 'node:net';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';

const root = dirname(fileURLToPath(import.meta.url));
process.chdir(root);
const local = resolve(root, '.local');
const runDirectory = join(local, `run-${randomUUID()}`);
const data = join(runDirectory, 'data');
mkdirSync(runDirectory, { recursive: true });
// Never use the installed PostgreSQL service or an existing data directory.
const bin = process.env.SEP_PG_BIN ?? (process.platform === 'win32' ? 'C:/Program Files/PostgreSQL/18/bin' : '');
const pgCommand = (name) => bin ? join(bin, process.platform === 'win32' ? `${name}.exe` : name) : name;
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error('Run this harness with npm test');

function run(command, args, env = process.env, capture = false, detachedServer = false) {
  // A background PostgreSQL process on Windows may inherit pipe handles from
  // pg_ctl. Real file descriptors let spawnSync observe pg_ctl's exit promptly.
  const logFd = detachedServer ? openSync(join(runDirectory, 'pgctl.log'), 'a') : undefined;
  let result;
  try {
    result = spawnSync(command, args, {
    cwd: root, env, windowsHide: true, encoding: 'utf8',
    stdio: logFd !== undefined ? ['ignore', logFd, logFd] : capture ? 'pipe' : 'inherit', timeout: 60000,
    });
  } finally { if (logFd !== undefined) closeSync(logFd); }
  if (result.error || result.status !== 0) {
    if (capture) process.stderr.write((result.stdout ?? '') + (result.stderr ?? ''));
    throw result.error ?? new Error(`${command} failed with exit ${result.status}`);
  }
  return result.stdout;
}

const port = await new Promise((done, reject) => {
  const server = createServer();
  server.on('error', reject);
  server.listen(0, '127.0.0.1', () => {
    const address = server.address();
    server.close(() => done(address.port));
  });
});
const url = (user, database) => `postgresql://${user}@127.0.0.1:${port}/${database}`;
let started = false;
try {
  run(pgCommand('initdb'), ['-D', data, '-U', 'sep_spike_admin', '-A', 'trust', '--encoding=UTF8', '--no-locale'], process.env, true);
  started = true;
  run(pgCommand('pg_ctl'), ['-D', data, '-l', join(runDirectory, 'postgres.log'), '-o', `-h 127.0.0.1 -p ${port}`, '-w', 'start'], process.env, false, true);
  const admin = new Pool({ connectionString: url('sep_spike_admin', 'postgres') });
  try {
    console.log(`Isolated PostgreSQL: ${(await admin.query('SHOW server_version')).rows[0].server_version}`);
    await admin.query('CREATE ROLE sep_spike_migrator LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS');
    await admin.query('CREATE ROLE sep_spike_runtime LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS');
    for (const kind of ['prisma', 'drizzle']) {
      // Names are constants, not request input.
      await admin.query(`CREATE DATABASE sep_spike_${kind} OWNER sep_spike_migrator`);
    }
  } finally { await admin.end(); }

  const testEnvironment = { ...process.env };
  for (const kind of ['prisma', 'drizzle']) {
    const database = `sep_spike_${kind}`;
    const migrationUrl = url('sep_spike_migrator', database);
    const env = { ...process.env, MIGRATION_DATABASE_URL: migrationUrl };
    run(process.execPath, [npmCli, 'run', `migrate:${kind}`], env);
    // Running again must not reapply migrations or change security objects.
    run(process.execPath, [npmCli, 'run', `migrate:${kind}`], env);
    const prefix = kind.toUpperCase();
    testEnvironment[`${prefix}_DATABASE_URL`] = url('sep_spike_runtime', database);
    testEnvironment[`${prefix}_ADMIN_URL`] = url('sep_spike_admin', database);
    testEnvironment[`${prefix}_OWNER_URL`] = migrationUrl;
  }
  run(process.execPath, ['--import', 'tsx', '--test', '--test-reporter=spec', 'isolation.test.ts'], testEnvironment);
} finally {
  if (started && existsSync(join(data, 'postmaster.pid'))) {
    run(pgCommand('pg_ctl'), ['-D', data, '-m', 'fast', '-w', 'stop'], process.env, true);
    console.log('Temporary PostgreSQL stopped. Ignored local data retained for inspection.');
  }
}
