import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import http from 'node:http';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { Pool } from 'pg';
import { createApplication } from '../../apps/api/dist/application.js';
import { loadConfig } from '../../apps/api/dist/config.js';
import { DatabaseService } from '../../apps/api/dist/database/database.service.js';
import { fixture } from '../../scripts/demo-fixtures.mjs';
import { siteContents } from '../../scripts/site-fixtures.mjs';

test('SEP API over real PostgreSQL and HTTP', async (t) => {
  const tokens = JSON.parse(process.env.SEP_TEST_TOKENS ?? '{}');
  const admin = new Pool({ connectionString: process.env.SEP_TEST_ADMIN_URL });
  const runtime = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  const { app, document } = await createApplication(loadConfig());
  t.after(async () => { await app.close(); await admin.end(); await runtime.end(); });
  await app.get(DatabaseService).verifyRuntime();
  await app.listen(0, '127.0.0.1');
  const port = app.getHttpServer().address().port;
  async function call(path, { host = fixture.hosts.a1, user = 'mixed', method = 'GET', body, headers = {} } = {}) {
    return new Promise((resolve, reject) => {
      const data = body === undefined ? undefined : JSON.stringify(body);
      const request = http.request({ hostname: '127.0.0.1', port, path, method, headers: {
        host, ...(user ? { authorization: `Bearer ${tokens[user]}` } : {}),
        ...(data ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(data) } : {}), ...headers,
      } }, (response) => {
        let text = ''; response.setEncoding('utf8'); response.on('data', (chunk) => { text += chunk; });
        response.on('end', () => { try { resolve({ status: response.statusCode, headers: response.headers, body: JSON.parse(text) }); } catch { reject(new Error(`Non-JSON response: ${response.statusCode}`)); } });
      });
      request.on('error', reject); request.end(data);
    });
  }

  await t.test('health checks PostgreSQL without exposing version or credentials', async () => {
    const result = await call('/api/v1/health', { user: null, host: '127.0.0.1' });
    assert.equal(result.status, 200); assert.deepEqual(result.body, { status: 'ok' });
  });
  await t.test('runtime role and RLS are attested; no context means no rows', async () => {
    const role = (await runtime.query('SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user')).rows[0];
    assert.deepEqual(role, { rolsuper: false, rolbypassrls: false });
    assert.deepEqual((await runtime.query('SELECT * FROM events')).rows, []);
    for (const statement of ['SELECT * FROM domains', 'SELECT * FROM identities', 'TRUNCATE events',
      'ALTER TABLE events DISABLE ROW LEVEL SECURITY', "UPDATE role_assignments SET role = 'organizer'", 'DELETE FROM audit_entries']) {
      await assert.rejects(runtime.query(statement), { code: '42501' });
    }
  });
  await t.test('missing, invalid and forged identity tokens are rejected', async () => {
    assert.equal((await call('/api/v1/events', { user: null })).status, 401);
    assert.equal((await call('/api/v1/events', { headers: { authorization: 'Bearer invalid' } })).status, 401);
    assert.equal((await call('/api/v1/events', { headers: { authorization: `Bearer ${fixture.people.mixed}` } })).status, 401);
  });
  await t.test('event domain returns only its authorized event', async () => {
    const result = await call('/api/v1/events');
    assert.equal(result.status, 200);
    assert.deepEqual(result.body.data.map((event) => event.id), [fixture.events.a1]);
    assert.equal(result.body.data[0].organizationId, fixture.organizations.a);
  });
  await t.test('unknown, unverified and malformed hosts are rejected', async () => {
    for (const host of ['unknown.sep.test', fixture.hosts.pending, 'a1.sep.test@evil.test', 'a1.sep.test:99999']) {
      const result = await call('/api/v1/events', { host });
      assert.equal(result.status, 400); assert.equal(result.body.error.code, 'INVALID_HOST');
    }
  });
  await t.test('forwarded headers do not override the validated Host', async () => {
    const result = await call('/api/v1/events', { headers: { 'x-forwarded-host': fixture.hosts.b1, forwarded: 'host=b1.sep.test', 'x-forwarded-for': '127.0.0.1' } });
    assert.equal(result.status, 200); assert.equal(result.body.data[0].id, fixture.events.a1);
    assert.equal((await call('/api/v1/events', { host: 'unknown.sep.test', headers: { 'x-forwarded-host': fixture.hosts.a1 } })).status, 400);
  });
  await t.test('client context and role headers cannot establish authority', async () => {
    for (const header of ['x-tenant-id', 'x-organization-id', 'x-event-id', 'x-role', 'x-person-id']) {
      const result = await call('/api/v1/events', { headers: { [header]: fixture.organizations.b } });
      assert.equal(result.status, 400); assert.equal(result.body.error.code, 'UNTRUSTED_CONTEXT');
    }
  });
  await t.test('UUID changes cannot cross events in the same organization or another tenant', async () => {
    for (const id of [fixture.events.a2, fixture.events.b1, randomUUID()]) {
      assert.equal((await call(`/api/v1/events/${id}`, { user: 'operator' })).status, 404);
      assert.equal((await call(`/api/v1/events/${id}`, { user: 'operator', method: 'PATCH', body: { nameEs: 'Forbidden' } })).status, 404);
    }
  });
  await t.test('switching to another real domain still requires its membership', async () => {
    for (const host of [fixture.hosts.a2, fixture.hosts.b1, fixture.hosts.orgB]) {
      assert.equal((await call('/api/v1/events', { user: 'operator', host })).status, 404);
    }
    assert.equal((await call('/api/v1/events', { user: 'outsider' })).status, 404);
  });
  await t.test('the same person has organizer access in A1 and participant restrictions in B1', async () => {
    assert.equal((await call(`/api/v1/events/${fixture.events.a1}`)).status, 200);
    assert.equal((await call(`/api/v1/events/${fixture.events.b1}`, { host: fixture.hosts.b1 })).status, 403);
    assert.equal((await call(`/api/v1/events/${fixture.events.b1}`, { host: fixture.hosts.b1, method: 'PATCH', body: { nameEs: 'Forbidden' } })).status, 403);
  });
  await t.test('organization admin sees own metadata but cannot edit without event role', async () => {
    const result = await call('/api/v1/events', { user: 'admin', host: fixture.hosts.orgA });
    assert.equal(result.status, 200); assert.deepEqual(result.body.data.map((event) => event.id), [fixture.events.a1, fixture.events.a2]);
    assert.equal((await call(`/api/v1/events/${fixture.events.a1}`, { user: 'admin', host: fixture.hosts.orgA, method: 'PATCH', body: { nameEs: 'Forbidden' } })).status, 403);
    assert.equal((await call(`/api/v1/events/${fixture.events.b1}`, { user: 'admin', host: fixture.hosts.orgA })).status, 404);
  });
  await t.test('query IDs and pagination cannot widen scope; unknown fields are rejected', async () => {
    for (const query of [`event_id=${fixture.events.b1}`, `organizationId=${fixture.organizations.b}`, 'role=organizer', 'limit=101', 'limit=-1']) {
      assert.equal((await call(`/api/v1/events?${query}`)).status, 400);
    }
    const page = await call('/api/v1/events?limit=1&offset=1', { host: fixture.hosts.orgA, user: 'admin' });
    assert.equal(page.status, 200); assert.equal(page.body.data[0].id, fixture.events.a2);
  });
  await t.test('body cannot move context, grant roles or publish; null and empty updates fail', async () => {
    for (const body of [{ organizationId: fixture.organizations.b }, { eventId: fixture.events.b1 }, { role: 'organizer' },
      { status: 'published' }, { nameEs: null }, { nameEs: 'x' }, { nameEs: '   ' }, {}]) {
      assert.equal((await call(`/api/v1/events/${fixture.events.a1}`, { method: 'PATCH', body })).status, 400, JSON.stringify(body));
    }
  });
  await t.test('an organizer update commits together with its audit entry', async () => {
    const result = await call(`/api/v1/events/${fixture.events.a1}`, { method: 'PATCH', body: { nameEs: 'Evento actualizado' } });
    assert.equal(result.status, 200); assert.equal(result.body.nameEs, 'Evento actualizado');
    const audit = (await admin.query('SELECT action, person_id, event_id, request_id FROM audit_entries WHERE request_id = $1', [result.headers['x-request-id']])).rows[0];
    assert.equal(audit.action, 'event.updated'); assert.equal(audit.person_id, fixture.people.mixed); assert.equal(audit.event_id, fixture.events.a1);
  });
  await t.test('audit failure rolls back the event update and sanitizes the HTTP error', async () => {
    await admin.query("CREATE FUNCTION sep_test_audit_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'private database detail'; END $$");
    await admin.query('CREATE TRIGGER sep_test_audit_failure BEFORE INSERT ON audit_entries FOR EACH ROW EXECUTE FUNCTION sep_test_audit_failure()');
    try {
      const result = await call(`/api/v1/events/${fixture.events.a1}`, { method: 'PATCH', body: { nameEs: 'Must roll back' } });
      assert.equal(result.status, 500); assert.equal(result.body.error.code, 'INTERNAL_ERROR');
      assert.ok(!JSON.stringify(result.body).includes('private database detail'));
      assert.equal((await call(`/api/v1/events/${fixture.events.a1}`)).body.nameEs, 'Evento actualizado');
    } finally { await admin.query('DROP TRIGGER sep_test_audit_failure ON audit_entries'); await admin.query('DROP FUNCTION sep_test_audit_failure()'); }
  });
  await t.test('creation requires organization admin, derives tenant and records a draft', async () => {
    const body = { nameEs: 'Nuevo congreso', nameEn: 'New congress', timezone: 'America/Havana' };
    assert.equal((await call('/api/v1/events', { method: 'POST', body })).status, 403);
    assert.equal((await call('/api/v1/events', { host: fixture.hosts.orgB, user: 'admin', method: 'POST', body })).status, 404);
    assert.equal((await call('/api/v1/events', { host: fixture.hosts.orgA, user: 'admin', method: 'POST', body: { ...body, organizationId: fixture.organizations.b } })).status, 400);
    assert.equal((await call('/api/v1/events', { host: fixture.hosts.orgA, user: 'admin', method: 'POST', body: { ...body, timezone: 'invalid-zone' } })).status, 400);
    const result = await call('/api/v1/events', { host: fixture.hosts.orgA, user: 'admin', method: 'POST', body });
    assert.equal(result.status, 201); assert.equal(result.body.organizationId, fixture.organizations.a); assert.equal(result.body.status, 'draft');
    assert.equal((await admin.query("SELECT count(*)::int AS count FROM audit_entries WHERE action = 'event.created' AND resource_id = $1", [result.body.id])).rows[0].count, 1);
  });
  await t.test('public projection exposes published content without tenant or identity fields', async () => {
    assert.equal((await call('/api/v1/public/event', { user: null })).status, 404);
    const result = await call('/api/v1/public/event', { user: null, host: fixture.hosts.b1 });
    assert.equal(result.status, 200); assert.deepEqual(Object.keys(result.body).sort(), ['id', 'nameEn', 'nameEs', 'timezone']);
    assert.equal(result.body.id, fixture.events.b1);
  });
  await t.test('archived state blocks updates and public projection', async () => {
    await admin.query("UPDATE events SET status = 'archived' WHERE id = $1", [fixture.events.a1]);
    try {
      assert.equal((await call(`/api/v1/events/${fixture.events.a1}`, { method: 'PATCH', body: { nameEs: 'Forbidden' } })).status, 409);
      assert.equal((await call('/api/v1/public/event', { user: null })).status, 404);
    } finally { await admin.query("UPDATE events SET status = 'draft' WHERE id = $1", [fixture.events.a1]); }
  });
  await t.test('host normalization accepts case, trailing dot and a valid port', async () => {
    assert.equal((await call('/api/v1/events', { host: 'A1.SEP.TEST.:3000' })).status, 200);
    assert.equal((await call('/api/v1/events/not-a-uuid')).status, 400);
  });
  await t.test('role, membership, person revocation and expiration affect the next request', async () => {
    const actions = [
      ['UPDATE role_assignments SET active = false WHERE id = $1', 'UPDATE role_assignments SET active = true WHERE id = $1', fixture.roles.mixedA1, 404],
      ['UPDATE memberships SET active = false WHERE id = $1', 'UPDATE memberships SET active = true WHERE id = $1', fixture.memberships.mixedA1, 404],
      ['UPDATE people SET active = false WHERE id = $1', 'UPDATE people SET active = true WHERE id = $1', fixture.people.mixed, 401],
      ["UPDATE role_assignments SET valid_until = now() - interval '1 second' WHERE id = $1", 'UPDATE role_assignments SET valid_until = NULL WHERE id = $1', fixture.roles.mixedA1, 404],
    ];
    for (const [change, restore, id, status] of actions) {
      await admin.query(change, [id]);
      try { assert.equal((await call('/api/v1/events')).status, status); }
      finally { await admin.query(restore, [id]); }
      assert.equal((await call('/api/v1/events')).status, 200);
    }
  });
  await t.test('suspended organization and disabled domain cannot resolve context', async () => {
    await admin.query('UPDATE organizations SET active = false WHERE id = $1', [fixture.organizations.a]);
    try { assert.equal((await call('/api/v1/events')).status, 400); }
    finally { await admin.query('UPDATE organizations SET active = true WHERE id = $1', [fixture.organizations.a]); }
    await admin.query('UPDATE domains SET active = false WHERE hostname = $1', [fixture.hosts.a1]);
    try { assert.equal((await call('/api/v1/events')).status, 400); }
    finally { await admin.query('UPDATE domains SET active = true WHERE hostname = $1', [fixture.hosts.a1]); }
  });
  await t.test('concurrent HTTP requests do not mix event roles or context', async () => {
    await Promise.all(Array.from({ length: 24 }, async (_, index) => {
      if (index % 3 === 0) { const result = await call('/api/v1/events'); assert.equal(result.status, 200); assert.equal(result.body.data[0].id, fixture.events.a1); }
      else if (index % 3 === 1) assert.equal((await call('/api/v1/events', { host: fixture.hosts.b1 })).status, 403);
      else assert.equal((await call('/api/v1/events', { host: fixture.hosts.a2 })).status, 404);
    }));
  });
  await t.test('errors are localized, stable and correlated without exposing input', async () => {
    const spanish = await call('/api/v1/events', { user: null });
    const english = await call('/api/v1/events', { user: null, headers: { 'accept-language': 'en-US,en;q=0.9' } });
    assert.equal(spanish.body.error.code, english.body.error.code); assert.notEqual(spanish.body.error.message, english.body.error.message);
    assert.equal(english.headers['content-language'], 'en'); assert.equal(english.body.error.requestId, english.headers['x-request-id']);
    const invalid = await call('/api/v1/events?organizationId=private-value', { headers: { 'accept-language': 'en' } });
    assert.equal(invalid.body.error.code, 'VALIDATION_FAILED'); assert.ok(!JSON.stringify(invalid.body).includes('private-value'));
  });
  await t.test('OpenAPI is served and matches the versioned contract', async () => {
    const result = await call('/api/v1/openapi.json', { user: null });
    assert.equal(result.status, 200); assert.ok(result.body.openapi.startsWith('3.'));
    assert.deepEqual(result.body, document);
    assert.deepEqual(document, JSON.parse(readFileSync('docs/api/openapi.json', 'utf8')));
    assert.ok(document.paths['/api/v1/events'].post.security);
    assert.ok(!document.paths['/api/v1/public/event'].get.security?.length);
    assert.ok(document.components.schemas.EventDto);
  });
  await t.test('composite references and role scope constraints reject invalid assignments', async () => {
    await assert.rejects(admin.query('INSERT INTO memberships (id,person_id,organization_id,event_id) VALUES ($1,$2,$3,$4)',
      [randomUUID(), fixture.people.outsider, fixture.organizations.a, fixture.events.b1]), { code: '23503' });
    await assert.rejects(admin.query("INSERT INTO role_assignments (id,membership_id,role) VALUES ($1,$2,'organization_admin')",
      [randomUUID(), fixture.memberships.operatorA1]), { code: '23514' });
    await assert.rejects(admin.query('UPDATE memberships SET event_id = $1 WHERE id = $2', [fixture.events.a2, fixture.memberships.operatorA1]), { code: '23514' });
  });
  await t.test('session capabilities are independent for the same person in two events', async () => {
    const organizer = await call('/api/v1/session');
    const participant = await call('/api/v1/session', { host: fixture.hosts.b1 });
    assert.equal(organizer.status, 200); assert.equal(organizer.body.canEdit, true);
    assert.equal(participant.status, 200); assert.equal(participant.body.canRead, false);
    assert.equal(participant.body.canEdit, false);
    assert.equal(organizer.body.person.id, participant.body.person.id);
  });
  await t.test('CMS rejects cross-event IDs and unauthorized writes', async () => {
    for (const id of [fixture.events.a2, fixture.events.b1]) {
      assert.equal((await call(`/api/v1/events/${id}/site`)).status, 404);
    }
    const path = `/api/v1/events/${fixture.events.a1}/site`;
    assert.equal((await call(path, { user: 'admin', host: fixture.hosts.orgA })).status, 200);
    assert.equal((await call(path, { user: 'admin', host: fixture.hosts.orgA, method: 'PUT', body: { revision: 1, content: siteContents.a1 } })).status, 403);
    assert.equal((await call(`/api/v1/events/${fixture.events.b1}/site`, { host: fixture.hosts.b1 })).status, 403);
    assert.deepEqual((await runtime.query('SELECT * FROM site_drafts')).rows, []);
    assert.deepEqual((await runtime.query('SELECT * FROM site_publications')).rows, []);
  });
  await t.test('CMS validates nested fields and dates', async () => {
    for (const content of [{ ...siteContents.a1, role: 'organizer' }, { ...siteContents.a1, theme: 'invalid' },
      { ...siteContents.a1, startDate: '2026-02-30' }, { ...siteContents.a1, endDate: '2020-01-01' }]) {
      assert.equal((await call(`/api/v1/events/${fixture.events.a1}/site`, { method: 'PUT', body: { revision: 1, content } })).status, 400);
    }
  });
  await t.test('CMS saves privately, prevents stale updates and publishes an audited snapshot', async () => {
    const path = `/api/v1/events/${fixture.events.a1}/site`;
    const content = { ...siteContents.a1, heroTitleEs: 'Un título nuevo para publicar' };
    assert.equal((await call('/api/v1/public/site', { user: null })).status, 404);
    const saved = await call(path, { method: 'PUT', body: { revision: 1, content } });
    assert.equal(saved.status, 200); assert.equal(saved.body.revision, 2);
    assert.equal((await call('/api/v1/public/site', { user: null })).status, 404);
    assert.equal((await call(path, { method: 'PUT', body: { revision: 1, content } })).status, 409);
    assert.equal((await call(`${path}/publish`, { method: 'POST', body: { revision: 1 } })).status, 409);
    const published = await call(`${path}/publish`, { method: 'POST', body: { revision: 2 } });
    assert.equal(published.status, 201);
    const publicSite = await call('/api/v1/public/site', { user: null });
    assert.deepEqual(publicSite.body, published.body);
    assert.deepEqual(Object.keys(publicSite.body.event).sort(), ['id', 'nameEn', 'nameEs', 'timezone']);
    const nextDraft = await call(path, { method: 'PUT', body: { revision: 2, content: { ...content, heroTitleEs: 'Cambios aún privados' } } });
    assert.equal(nextDraft.body.revision, 3);
    assert.deepEqual((await call('/api/v1/public/site', { user: null })).body, published.body);
    const audit = (await admin.query('SELECT action FROM audit_entries WHERE request_id = $1', [published.headers['x-request-id']])).rows[0];
    assert.equal(audit.action, 'site.published');
    assert.equal((await call('/api/v1/public/site', { user: null, host: fixture.hosts.b1 })).body.revision, 1);
  });
  await t.test('development auth fails closed in production and without explicit configuration', () => {
    assert.throws(() => loadConfig({ ...process.env, NODE_ENV: 'production' }));
    assert.throws(() => loadConfig({ ...process.env, AUTH_MODE: undefined }));
    assert.throws(() => loadConfig({ ...process.env, DEV_AUTH_TOKENS_JSON: '{}' }));
  });
});
