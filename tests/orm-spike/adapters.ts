import { PrismaPg } from '@prisma/adapter-pg';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import { Pool } from 'pg';
import { PrismaClient } from './generated/client.ts';
import { privateRecords } from './schema-drizzle.ts';

export type Scope = { organizationId: string; eventId: string };
export type RecordInput = Scope & { id: string; title: string };
export type StoredRecord = RecordInput;
export interface Transaction {
  list(id?: string): Promise<StoredRecord[]>;
  create(record: RecordInput): Promise<void>;
  update(id: string, title: string): Promise<number>;
  remove(id: string): Promise<number>;
  state(): Promise<{ pid: number; organization: string | null; event: string | null }>;
  pause(): Promise<void>;
}
export interface Adapter {
  run<T>(scope: Scope | null, action: (tx: Transaction) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

export function createAdapter(kind: 'prisma' | 'drizzle', url: string, max = 1): Adapter {
  const pool = new Pool({ connectionString: url, max, connectionTimeoutMillis: 5000 });
  if (kind === 'prisma') {
    const client = new PrismaClient({ adapter: new PrismaPg(pool) });
    return {
      run: (scope, action) => client.$transaction(async (tx) => {
        if (scope) {
          await tx.$queryRaw`SELECT set_config('sep.organization_id', ${scope.organizationId}, true),
            set_config('sep.event_id', ${scope.eventId}, true)`;
        }
        return action({
          list: (id) => tx.privateRecord.findMany({ where: id ? { id } : undefined, orderBy: { id: 'asc' } }),
          create: async (record) => { await tx.privateRecord.create({ data: record }); },
          update: async (id, title) => (await tx.privateRecord.updateMany({ where: { id }, data: { title } })).count,
          remove: async (id) => (await tx.privateRecord.deleteMany({ where: { id } })).count,
          state: async () => (await tx.$queryRaw<Array<{ pid: number; organization: string | null; event: string | null }>>`
            SELECT pg_backend_pid() AS pid, current_setting('sep.organization_id', true) AS organization,
              current_setting('sep.event_id', true) AS event`)[0],
          pause: async () => { await tx.$queryRaw`SELECT pg_sleep(0.03)::text`; },
        });
      }, { maxWait: 10000, timeout: 10000 }),
      close: async () => { await client.$disconnect(); await pool.end(); },
    };
  }
  const db = drizzle(pool);
  return {
    run: (scope, action) => db.transaction(async (tx) => {
      if (scope) {
        await tx.execute(sql`SELECT set_config('sep.organization_id', ${scope.organizationId}, true),
          set_config('sep.event_id', ${scope.eventId}, true)`);
      }
      return action({
        list: (id) => tx.select().from(privateRecords)
          .where(id ? eq(privateRecords.id, id) : undefined).orderBy(privateRecords.id),
        create: async (record) => { await tx.insert(privateRecords).values(record); },
        update: async (id, title) => (await tx.update(privateRecords).set({ title })
          .where(eq(privateRecords.id, id)).returning({ id: privateRecords.id })).length,
        remove: async (id) => (await tx.delete(privateRecords)
          .where(eq(privateRecords.id, id)).returning({ id: privateRecords.id })).length,
        state: async () => (await tx.execute<{ pid: number; organization: string | null; event: string | null }>(sql`
          SELECT pg_backend_pid() AS pid, current_setting('sep.organization_id', true) AS organization,
            current_setting('sep.event_id', true) AS event`)).rows[0],
        pause: async () => { await tx.execute(sql`SELECT pg_sleep(0.03)`); },
      });
    }),
    close: () => pool.end(),
  };
}
