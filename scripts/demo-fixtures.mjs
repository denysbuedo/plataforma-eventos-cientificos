import { randomBytes, randomUUID } from 'node:crypto';

export const fixture = {
  organizations: { a: '10000000-0000-4000-8000-000000000001', b: '10000000-0000-4000-8000-000000000002' },
  events: { a1: '20000000-0000-4000-8000-000000000001', a2: '20000000-0000-4000-8000-000000000002', b1: '20000000-0000-4000-8000-000000000003' },
  people: { mixed: '30000000-0000-4000-8000-000000000001', operator: '30000000-0000-4000-8000-000000000002', admin: '30000000-0000-4000-8000-000000000003', outsider: '30000000-0000-4000-8000-000000000004', reviewer:'30000000-0000-4000-8000-000000000005', reviewer2:'30000000-0000-4000-8000-000000000006' },
  memberships: { mixedA1: '40000000-0000-4000-8000-000000000001', mixedB1: '40000000-0000-4000-8000-000000000002', operatorA1: '40000000-0000-4000-8000-000000000003', adminA: '40000000-0000-4000-8000-000000000004' },
  roles: { mixedA1: '50000000-0000-4000-8000-000000000001', mixedB1: '50000000-0000-4000-8000-000000000002', operatorA1: '50000000-0000-4000-8000-000000000003', adminA: '50000000-0000-4000-8000-000000000004' },
  hosts: { a1: 'a1.sep.test', a2: 'a2.sep.test', b1: 'b1.sep.test', orgA: 'org-a.sep.test', orgB: 'org-b.sep.test', pending: 'pending.sep.test' },
};

export function demoAuthentication() {
  const tokens = Object.fromEntries(Object.keys(fixture.people).map((name) => [name, randomBytes(32).toString('hex')]));
  return { tokens, mapping: Object.fromEntries(Object.entries(tokens).map(([name, token]) => [token, fixture.people[name]])) };
}

export async function seedDemo(pool) {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    for (const [name, id] of Object.entries(fixture.organizations)) {
      await c.query('INSERT INTO organizations (id, name) VALUES ($1,$2)', [id, `Demo organization ${name}`]);
    }
    const series = randomUUID(); const edition = randomUUID();
    await c.query('INSERT INTO event_series (id, organization_id, name) VALUES ($1,$2,$3)', [series, fixture.organizations.a, 'Serie de demostración']);
    await c.query('INSERT INTO event_editions (id, organization_id, series_id, label) VALUES ($1,$2,$3,$4)', [edition, fixture.organizations.a, series, '2026']);
    for (const [name, id] of Object.entries(fixture.events)) {
      const organization = name.startsWith('a') ? fixture.organizations.a : fixture.organizations.b;
      await c.query('INSERT INTO events (id, organization_id, edition_id, name_es, name_en, timezone, status) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [id, organization, name.startsWith('a') ? edition : null, `Evento ficticio ${name}`, `Fictional event ${name}`, 'America/Havana', name === 'b1' ? 'published' : 'draft']);
    }
    for (const [name, id] of Object.entries(fixture.people)) {
      await c.query('INSERT INTO people (id, name) VALUES ($1,$2)', [id, name==='reviewer'?'Revisor de prueba 1':name==='reviewer2'?'Revisor de prueba 2':`Demo ${name}`]);
      await c.query('INSERT INTO identities (id, person_id, issuer, subject) VALUES ($1,$2,$3,$4)', [randomUUID(), id, 'sep-development', name]);
      await c.query('INSERT INTO affiliations (id, person_id, institution) VALUES ($1,$2,$3)', [randomUUID(), id, 'Institución ficticia']);
      if(['reviewer','reviewer2'].includes(name))await c.query('INSERT INTO researcher_profiles (person_id,affiliations,discoverable) VALUES ($1,$2::jsonb,true)',[id,JSON.stringify([{institution:'Institución ficticia de revisión',countryCode:'CU'}])]);
    }
    const members = [
      ['mixedA1', 'mixed', 'a', 'a1', 'organizer'], ['mixedB1', 'mixed', 'b', 'b1', 'participant'],
      ['operatorA1', 'operator', 'a', 'a1', 'organizer'], ['adminA', 'admin', 'a', null, 'organization_admin'],
    ];
    for (const [key, person, org, event, role] of members) {
      await c.query('INSERT INTO memberships (id, person_id, organization_id, event_id) VALUES ($1,$2,$3,$4)',
        [fixture.memberships[key], fixture.people[person], fixture.organizations[org], event ? fixture.events[event] : null]);
      await c.query("INSERT INTO role_assignments (id, membership_id, role, valid_from) VALUES ($1,$2,$3,'2020-01-01T00:00:00Z')", [fixture.roles[key], fixture.memberships[key], role]);
    }
    for (const [key, hostname] of Object.entries(fixture.hosts)) {
      const org = key === 'b1' || key === 'orgB' ? fixture.organizations.b : fixture.organizations.a;
      const event = fixture.events[key] ?? null;
      await c.query('INSERT INTO domains (id, organization_id, event_id, hostname, active, verified) VALUES ($1,$2,$3,$4,$5,$5)',
        [randomUUID(), org, event, hostname, key !== 'pending']);
    }
    await c.query('COMMIT');
  } catch (error) { await c.query('ROLLBACK'); throw error; }
  finally { c.release(); }
}
