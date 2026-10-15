export const APP_CONFIG = Symbol('APP_CONFIG');
export interface AppConfig {
  databaseUrl: string;
  authMode: 'development-token' | 'oidc';
  oidc?: { issuer: string; audience: string; jwksUrl: string; authorizedParty?: string };
  tokens: ReadonlyMap<string, string>;
  port: number;
}
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  if (!['development-token', 'oidc'].includes(env.AUTH_MODE ?? '')) throw new Error('AUTH_MODE must explicitly enable development-token or oidc');
  if (env.AUTH_MODE === 'development-token' && env.NODE_ENV !== 'development' && env.NODE_ENV !== 'test') throw new Error('Development authentication is disabled outside development/test');
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
  if (env.AUTH_MODE === 'development-token' && tokens.size === 0) throw new Error('At least one explicit development token is required');
  if (env.AUTH_MODE === 'oidc' && tokens.size > 0) throw new Error('Development tokens cannot be configured with OIDC');
  let oidc: AppConfig['oidc'];
  if (env.AUTH_MODE === 'oidc') {
    if (!env.OIDC_ISSUER || !env.OIDC_AUDIENCE || !env.OIDC_JWKS_URL) throw new Error('OIDC issuer, audience and JWKS URL are required');
    for (const value of [env.OIDC_ISSUER, env.OIDC_JWKS_URL]) {
      const url = new URL(value);
      const loopback = env.OIDC_ALLOW_LOOPBACK_HTTP === '1' && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname);
      if ((url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback)) || url.username || url.password || url.hash || url.search) throw new Error('Invalid OIDC URL');
    }
    oidc = { issuer: env.OIDC_ISSUER, audience: env.OIDC_AUDIENCE, jwksUrl: env.OIDC_JWKS_URL, authorizedParty: env.OIDC_AUTHORIZED_PARTY || undefined };
  }
  const port = Number(env.PORT ?? '3000');
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
  return { databaseUrl: env.DATABASE_URL, authMode: env.AUTH_MODE as AppConfig['authMode'], oidc, tokens, port };
}
