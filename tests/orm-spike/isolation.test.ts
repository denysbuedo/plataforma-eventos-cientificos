import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { Pool } from 'pg';
import { createAdapter } from './adapters.ts';
import { organizationA, organizationB, records, scopes } from './fixtures.ts';

for (const kind of ['prisma', 'drizzle'] as const) {
  test(kind, async (t) => {
    const prefix = kind.toUpperCase();
    const runtimeUrl = process.env[`${prefix}_DATABASE_URL`];
    const adminUrl = process.env[`${prefix}_ADMIN_URL`];
    const ownerUrl = process.env[`${prefix}_OWNER_URL`];
    assert.ok(runtimeUrl && adminUrl && ownerUrl, 'Use npm test to provision an isolated cluster');
    const adapter = createAdapter(kind, runtimeUrl);
    const admin = new Pool({ connectionString: adminUrl });
    const runtime = new Pool({ connectionString: runtimeUrl, max: 1 });
    const owner = new Pool({ connectionString: ownerUrl, max: 1 });
    t.after(async () => { await adapter.close(); await admin.end(); await runtime.end(); await owner.end(); });

    // Fixtures are inserted only by the administrator of the disposable cluster.
    await admin.query('INSERT INTO organizations (id) VALUES ($1), ($2)', [organizationA, organizationB]);
    for (const scope of scopes) {
      await admin.query('INSERT INTO events (organization_id, id) VALUES ($1, $2)', [scope.organizationId, scope.eventId]);
    }
    for (const record of records) {
      await admin.query('INSERT INTO private_records (id, organization_id, event_id, title) VALUES ($1, $2, $3, $4)',
        [record.id, record.organizationId, record.eventId, record.title]);
    }

    await t.test('migration: RLS, FORCE, policy, evolution and least-privilege runtime', async () => {
      const table = (await admin.query(`SELECT relrowsecurity, relforcerowsecurity,
        pg_get_userbyid(relowner) AS owner FROM pg_class WHERE oid = 'private_records'::regclass`)).rows[0];
      assert.equal(table.relrowsecurity, true);
      assert.equal(table.relforcerowsecurity, true);
      assert.equal(table.owner, 'sep_spike_migrator');
      const role = (await runtime.query('SELECT current_user, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user')).rows[0];
      assert.equal(role.current_user, 'sep_spike_runtime');
      assert.equal(role.rolsuper, false);
      assert.equal(role.rolbypassrls, false);
      assert.equal((await admin.query("SELECT count(*)::int AS count FROM pg_policies WHERE tablename = 'private_records'")).rows[0].count, 1);
      assert.equal((await admin.query("SELECT count(*)::int AS count FROM information_schema.columns WHERE table_name = 'private_records' AND column_name = 'description'")).rows[0].count, 1);
    });

    await t.test('missing context denies reads and writes through ORM', async () => {
      assert.deepEqual(await adapter.run(null, (tx) => tx.list()), []);
      await assert.rejects(adapter.run(null, (tx) => tx.create({ ...records[0], id: randomUUID() })));
    });

    await t.test('unfiltered lists isolate A1, A2 and B1', async () => {
      for (let i = 0; i < scopes.length; i++) {
        assert.deepEqual((await adapter.run(scopes[i], (tx) => tx.list())).map((row) => row.id), [records[i].id]);
      }
    });

    await t.test('substituting IDs cannot read another event or organization', async () => {
      for (const foreign of records.slice(1)) {
        assert.deepEqual(await adapter.run(scopes[0], (tx) => tx.list(foreign.id)), []);
      }
    });

    await t.test('inconsistent organization/event context and partial context fail closed', async () => {
      assert.deepEqual(await adapter.run({ organizationId: organizationB, eventId: scopes[0].eventId }, (tx) => tx.list()), []);
      assert.deepEqual(await adapter.run({ ...scopes[0], eventId: '' }, (tx) => tx.list()), []);
      assert.deepEqual(await adapter.run({ ...scopes[0], organizationId: '' }, (tx) => tx.list()), []);
    });

    await t.test('cross-context updates and deletes affect zero records', async () => {
      for (const foreign of records.slice(1)) {
        assert.equal(await adapter.run(scopes[0], (tx) => tx.update(foreign.id, 'forbidden')), 0);
        assert.equal(await adapter.run(scopes[0], (tx) => tx.remove(foreign.id)), 0);
      }
    });

    await t.test('WITH CHECK blocks cross-context inserts', async () => {
      for (const foreign of records.slice(1)) {
        await assert.rejects(adapter.run(scopes[0], (tx) => tx.create({ ...foreign, id: randomUUID() })));
      }
    });

    await t.test('permitted create/update/delete commit inside the selected scope', async () => {
      const record = { ...records[0], id: randomUUID(), title: 'created' };
      await adapter.run(scopes[0], (tx) => tx.create(record));
      assert.equal((await adapter.run(scopes[0], (tx) => tx.list(record.id)))[0].title, 'created');
      assert.equal(await adapter.run(scopes[0], (tx) => tx.update(record.id, 'updated')), 1);
      assert.equal((await adapter.run(scopes[0], (tx) => tx.list(record.id)))[0].title, 'updated');
      assert.equal(await adapter.run(scopes[0], (tx) => tx.remove(record.id)), 1);
    });

    await t.test('rollback removes writes and context on the same pooled connection', async () => {
      const id = randomUUID();
      let pid: number | undefined;
      await assert.rejects(adapter.run(scopes[0], async (tx) => {
        pid = (await tx.state()).pid;
        await tx.create({ ...records[0], id });
        throw new Error('expected rollback');
      }), /expected rollback/);
      await adapter.run(null, async (tx) => {
        const state = await tx.state();
        assert.equal(state.pid, pid);
        assert.ok(!state.organization && !state.event);
        assert.deepEqual(await tx.list(), []);
      });
      assert.deepEqual(await adapter.run(scopes[0], (tx) => tx.list(id)), []);
    });

    await t.test('commit does not leak context on a reused pooled connection', async () => {
      const before = await adapter.run(scopes[0], (tx) => tx.state());
      const after = await adapter.run(null, (tx) => tx.state());
      assert.equal(before.pid, after.pid);
      assert.ok(!after.organization && !after.event);
    });

    await t.test('concurrent transactions keep independent context across four connections', async () => {
      const concurrent = createAdapter(kind, runtimeUrl, 4);
      try {
        const pids = await Promise.all(Array.from({ length: 12 }, async (_, i) => {
          const index = i % scopes.length;
          return concurrent.run(scopes[index], async (tx) => {
            const before = await tx.state();
            await tx.pause();
            assert.deepEqual((await tx.list()).map((row) => row.id), [records[index].id]);
            assert.deepEqual(await tx.state(), before);
            return before.pid;
          });
        }));
        assert.ok(new Set(pids).size > 1, 'Must exercise more than one connection');
        await Promise.all(Array.from({ length: 4 }, () => concurrent.run(null, async (tx) => {
          await tx.pause();
          const state = await tx.state();
          assert.ok(!state.organization && !state.event);
          assert.deepEqual(await tx.list(), []);
        })));
      } finally { await concurrent.close(); }
    });

    await t.test('composite FK prevents organization/event mismatch independently of RLS', async () => {
      await assert.rejects(admin.query('INSERT INTO private_records (id, organization_id, event_id, title) VALUES ($1, $2, $3, $4)',
        [randomUUID(), organizationA, scopes[2].eventId, 'invalid relation']), { code: '23503' });
    });

    await t.test('FORCE RLS also denies the table owner without a policy', async () => {
      assert.equal((await owner.query('SELECT count(*)::int AS count FROM private_records')).rows[0].count, 0);
    });

    await t.test('invalid UUID context aborts and leaves the next transaction clean', async () => {
      await assert.rejects(adapter.run({ ...scopes[0], organizationId: 'invalid' }, (tx) => tx.list()));
      assert.deepEqual(await adapter.run(null, (tx) => tx.list()), []);
    });

    await t.test('direct SQL cannot disable RLS, truncate or move rows to another scope', async () => {
      await assert.rejects(runtime.query('ALTER TABLE private_records DISABLE ROW LEVEL SECURITY'), { code: '42501' });
      await assert.rejects(runtime.query('TRUNCATE private_records'), { code: '42501' });
      const connection = await runtime.connect();
      try {
        await connection.query('BEGIN');
        await connection.query("SELECT set_config('sep.organization_id', $1, true), set_config('sep.event_id', $2, true)",
          [scopes[0].organizationId, scopes[0].eventId]);
        await assert.rejects(connection.query('UPDATE private_records SET event_id = $1 WHERE id = $2',
          [scopes[1].eventId, records[0].id]), { code: '42501' });
      } finally { await connection.query('ROLLBACK'); connection.release(); }
    });

    await t.test('direct SQL without context returns no private rows', async () => {
      assert.deepEqual((await runtime.query('SELECT * FROM private_records')).rows, []);
      assert.equal((await admin.query('SELECT count(*)::int AS count FROM private_records')).rows[0].count, 3);
    });
  });
}
