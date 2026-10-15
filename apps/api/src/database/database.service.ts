import { Inject, Injectable, type OnModuleDestroy } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import { Pool } from 'pg';
import { APP_CONFIG, type AppConfig } from '../config.js';

const createDb = (pool: Pool) => drizzle(pool);
export type DbTransaction = Parameters<Parameters<ReturnType<typeof createDb>['transaction']>[0]>[0];
export interface DataScope {
  organizationId: string;
  eventId: string | null;
  personId: string | null;
  organizationAdmin?: boolean;
}
@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly pool: Pool;
  private readonly db: ReturnType<typeof createDb>;
  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    this.pool = new Pool({ connectionString: config.databaseUrl, max: 10, connectionTimeoutMillis: 5000, statement_timeout: 10000 });
    this.db = createDb(this.pool);
    this.pool.on('error', () => { /* Requests return a sanitized database error; never log connection strings. */ });
  }
  async verifyRuntime(): Promise<void> {
    const result = await this.pool.query(`SELECT r.rolsuper, r.rolbypassrls,
      pg_get_userbyid(c.relowner) = current_user AS owns_table, c.relrowsecurity, c.relforcerowsecurity
      FROM pg_roles r CROSS JOIN pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE r.rolname = current_user AND n.nspname = 'public'
      AND c.relname IN ('events','event_series','event_editions','people','identities','affiliations','memberships','role_assignments','audit_entries')`);
    if (result.rows.length !== 9 || result.rows.some((role) => role.rolsuper || role.rolbypassrls || role.owns_table || !role.relrowsecurity || !role.relforcerowsecurity)) {
      throw new Error('Runtime database role or RLS configuration is unsafe');
    }
  }
  async health(): Promise<void> { await this.pool.query('SELECT 1'); }
  async resolveDomain(hostname: string): Promise<{ organizationId: string; eventId: string | null } | undefined> {
    const result = await this.db.execute<{ organizationId: string; eventId: string | null }>(sql`
      SELECT organization_id AS "organizationId", event_id AS "eventId" FROM sep_resolve_domain(${hostname})`);
    return result.rows[0];
  }
  scoped<T>(scope: DataScope, action: (tx: DbTransaction) => Promise<T>): Promise<T> {
    return this.db.transaction(async (tx) => {
      await tx.execute(sql`SELECT set_config('sep.organization_id', ${scope.organizationId}, true),
        set_config('sep.event_id', ${scope.eventId ?? ''}, true),
        set_config('sep.person_id', ${scope.personId ?? ''}, true),
        set_config('sep.organization_admin', ${scope.organizationAdmin ? 'true' : 'false'}, true)`);
      return action(tx);
    });
  }
  async onModuleDestroy(): Promise<void> { await this.pool.end(); }
}
