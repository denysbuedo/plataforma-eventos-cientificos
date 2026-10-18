export const APP_CONFIG = Symbol('APP_CONFIG');
export interface AppConfig {
  databaseUrl: string;
  authMode: 'development-token' | 'oidc';
  oidc?: { issuer: string; audience: string; jwksUrl: string; authorizedParty?: string; roleClientId: string; allowedClientRoles: string[] };
  google?: { clientId: string; signingKey: string; audience: string };
  orcid?: { clientId:string; clientSecret:string; redirectUri:string; environment:'production'|'sandbox' };
  mail?:{host:string;port:number;secure:boolean;localPlaintext:boolean;user?:string;password?:string;from:string;adminOrigin:string;messageDomain:string};
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
    const roleClientId = env.OIDC_ROLE_CLIENT_ID;
    const allowedClientRoles = (env.OIDC_ALLOWED_CLIENT_ROLES ?? '').split(',').map((role) => role.trim()).filter(Boolean);
    if (!roleClientId || !allowedClientRoles.length || allowedClientRoles.some((role) => !/^[A-Za-z0-9_.:-]{1,100}$/.test(role))) throw new Error('Explicit OIDC client access roles are required');
    oidc = { issuer: env.OIDC_ISSUER, audience: env.OIDC_AUDIENCE, jwksUrl: env.OIDC_JWKS_URL,
      authorizedParty: env.OIDC_AUTHORIZED_PARTY || undefined, roleClientId, allowedClientRoles };
  }
  const port = Number(env.PORT ?? '3000');
  let google: AppConfig['google'];
  if (env.AUTH_MODE === 'oidc' && env.SEP_GOOGLE_LOGIN_ENABLED === '1') {
    if (!env.GOOGLE_CLIENT_ID || !/^[0-9a-f]{64}$/i.test(env.GOOGLE_SESSION_SIGNING_KEY ?? '')) throw new Error('Google client ID and a separate 32-byte session signing key are required');
    if (env.GOOGLE_SESSION_SIGNING_KEY === env.SEP_SESSION_ENCRYPTION_KEY) throw new Error('Google signing and session encryption keys must be different');
    google = { clientId: env.GOOGLE_CLIENT_ID, signingKey: env.GOOGLE_SESSION_SIGNING_KEY!, audience: env.GOOGLE_API_AUDIENCE ?? 'sep-api' };
  }
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
  let orcid:AppConfig['orcid'];
  if(env.SEP_ORCID_ENABLED==='1') {
    const environment=env.ORCID_ENVIRONMENT??'production';
    if(!['production','sandbox'].includes(environment)||!/^APP-[A-Za-z0-9]+$/.test(env.ORCID_CLIENT_ID??'')||!env.ORCID_CLIENT_SECRET||!env.ORCID_REDIRECT_URI||!env.SEP_ADMIN_ORIGIN)throw new Error('Incomplete ORCID configuration');
    const redirect=new URL(env.ORCID_REDIRECT_URI);
    const loopback=environment==='sandbox'&&env.OIDC_ALLOW_LOOPBACK_HTTP==='1'&&['localhost','127.0.0.1','[::1]'].includes(redirect.hostname);
    if(redirect.href!==new URL('/api/auth/orcid/callback',env.SEP_ADMIN_ORIGIN).href||redirect.username||redirect.password||redirect.protocol!=='https:'&&!(loopback&&redirect.protocol==='http:'))throw new Error('Invalid ORCID callback');
    orcid={clientId:env.ORCID_CLIENT_ID!,clientSecret:env.ORCID_CLIENT_SECRET,redirectUri:redirect.href,environment:environment as 'production'|'sandbox'};
  }
  let mail:AppConfig['mail'];
  if(env.SEP_MAIL_ENABLED==='1'){
    const host=env.SMTP_HOST??'',port=Number(env.SMTP_PORT??'587'),from=env.SMTP_FROM??'';
    const localPlaintext=env.NODE_ENV!=='production'&&env.SEP_SMTP_ALLOW_LOCAL_PLAINTEXT==='1'&&['127.0.0.1','localhost'].includes(host);
    if(!/^[a-z0-9.-]+$/i.test(host)||!Number.isInteger(port)||port<1||port>65535||! /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(from)||from.length>254||!!env.SMTP_USER!==!!env.SMTP_PASSWORD||!env.SEP_ADMIN_ORIGIN)throw new Error('Incomplete SMTP configuration');
    const origin=new URL(env.SEP_ADMIN_ORIGIN);
    if(origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash||origin.protocol!=='https:'&&!(env.NODE_ENV!=='production'&&origin.protocol==='http:'&&['127.0.0.1','localhost'].includes(origin.hostname)))throw new Error('Invalid mail application origin');
    const secure=env.SMTP_SECURE==='1';
    if(!localPlaintext&&port===465&&!secure)throw new Error('SMTP port 465 requires SMTP_SECURE=1');
    mail={host,port,secure,localPlaintext,user:env.SMTP_USER,password:env.SMTP_PASSWORD,from,adminOrigin:origin.origin,messageDomain:from.split('@')[1]};
  }
  return { mail, databaseUrl: env.DATABASE_URL, authMode: env.AUTH_MODE as AppConfig['authMode'], oidc, google, orcid, tokens, port };
}
