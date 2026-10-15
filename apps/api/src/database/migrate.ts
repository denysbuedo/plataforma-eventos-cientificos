import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

export async function migrateDatabase(connectionString: string): Promise<void> {
  const pool = new Pool({ connectionString });
  try { await migrate(drizzle(pool), { migrationsFolder: resolve(dirname(fileURLToPath(import.meta.url)), '../../drizzle') }); }
  finally { await pool.end(); }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!process.env.MIGRATION_DATABASE_URL) throw new Error('MIGRATION_DATABASE_URL is required; runtime credentials must not migrate');
  void migrateDatabase(process.env.MIGRATION_DATABASE_URL).catch(() => { console.error('Migration failed; inspect PostgreSQL locally.'); process.exitCode = 1; });
}
