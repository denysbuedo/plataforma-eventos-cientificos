import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.MIGRATION_DATABASE_URL });
try {
  if (!process.env.MIGRATION_DATABASE_URL) throw new Error('MIGRATION_DATABASE_URL required');
  await migrate(drizzle(pool), { migrationsFolder: './drizzle' });
} finally {
  await pool.end();
}
