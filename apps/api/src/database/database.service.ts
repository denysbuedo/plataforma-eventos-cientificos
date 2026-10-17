import { Inject, Injectable, type OnModuleDestroy } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/node-postgres';
import { and, eq, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { identities, people } from './schema.js';
import { ApiException } from '../common/http.js';
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
      AND c.relname IN ('events','event_series','event_editions','people','identities','affiliations','memberships','role_assignments','audit_entries','site_drafts','site_publications','organization_invitations','event_configurations','scientific_call_drafts','scientific_call_publications','author_works','work_files','work_versions','work_history','orcid_connections','work_collaborations','researcher_profiles','authorship_claims','review_members','review_rounds','review_assignments','review_conflicts')`);
    if (result.rows.length !== 27 || result.rows.some((role) => role.rolsuper || role.rolbypassrls || role.owns_table || !role.relrowsecurity || !role.relforcerowsecurity)) {
      throw new Error('Runtime database role or RLS configuration is unsafe');
    }
  }
  async health(): Promise<void> { await this.pool.query('SELECT 1'); }
  oidcPerson(issuer: string, subject: string, name: string): Promise<string> {
    return this.db.transaction(async (tx) => {
      await tx.execute(sql`SELECT set_config('sep.organization_id', '', true), set_config('sep.event_id', '', true),
        set_config('sep.review_rpc','',true),set_config('sep.review_target','',true),set_config('sep.review_email','',true),set_config('sep.submissions_staff', 'false', true), set_config('sep.organization_admin', 'false', true), set_config('sep.person_id', '', true), set_config('sep.authorship_rpc', '', true), set_config('sep.authorship_email', '', true), set_config('sep.directory_read', '', true), set_config('sep.work_invitation_hash', '', true), set_config('sep.invitation_hash', '', true),
        set_config('sep.auth_provision', 'true', true), set_config('sep.auth_issuer', ${issuer}, true), set_config('sep.auth_subject', ${subject}, true)`);
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${'identity:' + issuer + ':' + subject}, 0))`);
      const [identity] = await tx.select({ personId: identities.personId, active: identities.active }).from(identities).where(and(eq(identities.issuer, issuer), eq(identities.subject, subject)));
      if (identity && !identity.active) throw new ApiException(401, 'UNAUTHORIZED');
      const personId = identity?.personId ?? randomUUID();
      await tx.execute(sql`SELECT set_config('sep.person_id', ${personId}, true)`);
      if (!identity) {
        await tx.insert(people).values({ id: personId, name });
        await tx.insert(identities).values({ id: randomUUID(), personId, issuer, subject });
      }
      const [person] = await tx.select({ active: people.active }).from(people).where(eq(people.id, personId));
      if (!person?.active) throw new ApiException(401, 'UNAUTHORIZED');
      return personId;
    });
  }
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
        set_config('sep.review_rpc','',true),set_config('sep.review_target','',true),set_config('sep.review_email','',true),set_config('sep.submissions_staff', 'false', true), set_config('sep.organization_admin', ${scope.organizationAdmin ? 'true' : 'false'}, true), set_config('sep.authorship_rpc', '', true), set_config('sep.authorship_email', '', true), set_config('sep.directory_read', '', true), set_config('sep.work_invitation_hash', '', true), set_config('sep.invitation_hash', '', true),
        set_config('sep.auth_provision', 'false', true), set_config('sep.auth_issuer', '', true), set_config('sep.auth_subject', '', true)`);
      return action(tx);
    });
  }
  async onModuleDestroy(): Promise<void> { await this.pool.end(); }
}
