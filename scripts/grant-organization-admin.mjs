import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
const [personId, organizationId] = process.argv.slice(2);
const pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
if (!pattern.test(personId ?? '') || !pattern.test(organizationId ?? '') || !process.env.SEP_BOOTSTRAP_DATABASE_URL || !process.env.OIDC_ISSUER) {
  throw new Error('Set SEP_BOOTSTRAP_DATABASE_URL and OIDC_ISSUER; pass person UUID and organization UUID');
}
const pool = new Pool({ connectionString: process.env.SEP_BOOTSTRAP_DATABASE_URL });
const connection = await pool.connect();
try {
  await connection.query('BEGIN');
  const privilege = (await connection.query('SELECT rolsuper OR rolbypassrls AS allowed FROM pg_roles WHERE rolname = current_user')).rows[0];
  if (!privilege?.allowed) throw new Error('This one-time operation requires an explicitly configured provisioning role');
  const person = await connection.query('SELECT p.id FROM people p JOIN identities i ON i.person_id = p.id WHERE p.id = $1 AND p.active AND i.active AND i.issuer = $2', [personId, process.env.OIDC_ISSUER]);
  const organization = await connection.query('SELECT id FROM organizations WHERE id = $1 AND active', [organizationId]);
  if (!person.rowCount || !organization.rowCount) throw new Error('Active organization and OIDC person are required');
  await connection.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [`bootstrap:${organizationId}:${personId}`]);
  const membership = await connection.query('INSERT INTO memberships (id,person_id,organization_id) VALUES ($1,$2,$3) ON CONFLICT (person_id,organization_id) WHERE event_id IS NULL AND origin_account_id IS NULL DO UPDATE SET active = true RETURNING id', [randomUUID(), personId, organizationId]);
  await connection.query("INSERT INTO role_assignments (id,membership_id,role) VALUES ($1,$2,'organization_admin') ON CONFLICT (membership_id,role) DO UPDATE SET active = true, valid_from = now(), valid_until = NULL", [randomUUID(), membership.rows[0].id]);
  await connection.query("INSERT INTO audit_entries (id,organization_id,person_id,action,resource_id,request_id) VALUES ($1,$2,$3,'organization.admin.bootstrapped',$3,$4)", [randomUUID(), organizationId, personId, randomUUID()]);
  await connection.query('COMMIT'); console.log('Organization administrator provisioned. No event roles were granted.');
} catch (error) {
  await connection.query('ROLLBACK'); console.error(error instanceof Error && !('code' in error) ? error.message : 'Provisioning failed; inspect the local database configuration.'); process.exitCode = 1;
} finally { connection.release(); await pool.end(); }
