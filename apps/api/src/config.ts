export const APP_CONFIG = Symbol('APP_CONFIG');
export interface AppConfig {
  databaseUrl: string;
  authMode: 'development-token';
  tokens: ReadonlyMap<string, string>;
  port: number;
}
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  if (env.NODE_ENV !== 'development' && env.NODE_ENV !== 'test') throw new Error('Development authentication is disabled outside development/test');
  if (env.AUTH_MODE !== 'development-token') throw new Error('AUTH_MODE must explicitly enable development-token');
  if (!env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  const database = new URL(env.DATABASE_URL);
  if (!['postgres:', 'postgresql:'].includes(database.protocol)) throw new Error('DATABASE_URL must use PostgreSQL');
  const entries: unknown = JSON.parse(env.DEV_AUTH_TOKENS_JSON ?? '{}');
  if (!entries || typeof entries !== 'object' || Array.isArray(entries)) throw new Error('Invalid development token map');
  const tokens = new Map<string, string>();
  for (const [token, person] of Object.entries(entries)) {
    if (!/^[A-Za-z0-9_-]{32,256}$/.test(token) || typeof person !== 'string'
      || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(person)) throw new Error('Invalid development token entry');
    tokens.set(token, person);
  }
  if (tokens.size === 0) throw new Error('At least one explicit development token is required');
  const port = Number(env.PORT ?? '3000');
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
  return { databaseUrl: env.DATABASE_URL, authMode: 'development-token', tokens, port };
}
