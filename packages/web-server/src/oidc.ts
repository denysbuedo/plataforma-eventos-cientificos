import 'server-only';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import * as client from 'openid-client';

export const OIDC_FLOW_COOKIE = 'sep_oidc_flow';
export function oidcEnabled(): boolean { return process.env.SEP_AUTH_MODE === 'oidc'; }
function transport(value: string): URL {
  const url = new URL(value);
  const loopback = process.env.OIDC_ALLOW_LOOPBACK_HTTP === '1' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if ((url.protocol !== 'https:' && !(loopback && url.protocol === 'http:')) || url.username || url.password || url.hash || url.search) throw new Error('Invalid OIDC endpoint');
  return url;
}
function settings() {
  if (!oidcEnabled() || process.env.SEP_DEMO_MODE === '1') throw new Error('OIDC and demo are exclusive');
  const { OIDC_ISSUER, OIDC_CLIENT_ID, OIDC_CLIENT_SECRET, SEP_ADMIN_ORIGIN, SEP_SESSION_ENCRYPTION_KEY, SEP_SESSION_DIRECTORY } = process.env;
  if (!OIDC_ISSUER || !OIDC_CLIENT_ID || !OIDC_CLIENT_SECRET || !SEP_ADMIN_ORIGIN || !SEP_SESSION_DIRECTORY || !isAbsolute(SEP_SESSION_DIRECTORY)
    || !SEP_SESSION_ENCRYPTION_KEY || !/^[0-9a-f]{64}$/i.test(SEP_SESSION_ENCRYPTION_KEY)) throw new Error('Incomplete OIDC configuration');
  const issuer = transport(OIDC_ISSUER); const origin = transport(SEP_ADMIN_ORIGIN);
  if (origin.pathname !== '/') throw new Error('Admin origin must not include a path');
  return { issuer, origin: origin.origin, clientId: OIDC_CLIENT_ID, clientSecret: OIDC_CLIENT_SECRET,
    key: Buffer.from(SEP_SESSION_ENCRYPTION_KEY, 'hex'), directory: SEP_SESSION_DIRECTORY };
}
let discovered: Promise<client.Configuration> | undefined;
async function configuration() {
  if (!discovered) {
    const config = settings();
    const algorithm = process.env.OIDC_ID_TOKEN_ALGORITHM ?? 'RS256';
    if (!['RS256', 'ES256'].includes(algorithm)) throw new Error('Unsupported ID token algorithm');
    discovered = client.discovery(config.issuer, config.clientId, { client_secret: config.clientSecret, id_token_signed_response_alg: algorithm }, undefined,
      { execute: process.env.OIDC_ALLOW_LOOPBACK_HTTP === '1' ? [client.allowInsecureRequests, client.enableNonRepudiationChecks] : [client.enableNonRepudiationChecks], timeout: 10 })
      .then((value) => {
        const metadata = value.serverMetadata();
        for (const endpoint of [metadata.authorization_endpoint, metadata.token_endpoint, metadata.jwks_uri, metadata.end_session_endpoint]) {
          if (!endpoint) throw new Error('Missing OIDC endpoint'); transport(endpoint);
        }
        return value;
      }).catch((error) => { discovered = undefined; throw error; });
  }
  return discovered;
}
type Stored = { expires: number };
interface Flow extends Stored { verifier: string; nonce: string; state: string; returnTo: string }
interface Session extends Stored { accessToken: string; refreshToken?: string; idToken: string; subject: string; accessExpires: number }
type GrantedSession = Omit<Session, 'expires'> & { maxAge: number; returnTo: string };
function file(id: string, kind: 'flow' | 'session') {
  if (!/^[A-Za-z0-9_-]{43}$/.test(id)) throw new Error('Invalid session identifier');
  return join(settings().directory, `${kind}-${createHash('sha256').update(id).digest('hex')}.bin`);
}
function save<T extends Stored>(kind: 'flow' | 'session', value: T): string {
  const config = settings(); mkdirSync(config.directory, { recursive: true, mode: 0o700 });
  const id = randomBytes(32).toString('base64url');
  writeFileSync(file(id, kind), encrypted(kind, value), { flag: 'wx', mode: 0o600 });
  return id;
}
function encrypted<T extends Stored>(kind: 'flow' | 'session', value: T): Buffer {
  const iv = randomBytes(12); const cipher = createCipheriv('aes-256-gcm', settings().key, iv);
  cipher.setAAD(Buffer.from(kind));
  const encoded = JSON.stringify(value);
  if (Buffer.byteLength(encoded) > 60000) throw new Error('Session is too large');
  const payload = Buffer.concat([cipher.update(encoded, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), payload]);
}
function read<T extends Stored>(id: string | undefined, kind: 'flow' | 'session'): T | undefined {
  if (!id) return undefined;
  try {
    if (kind === 'session' && existsSync(file(id, kind) + '.revoked')) return undefined;
    const bytes = readFileSync(file(id, kind));
    if (bytes.length < 29 || bytes.length > 65536) return undefined;
    const decipher = createDecipheriv('aes-256-gcm', settings().key, bytes.subarray(0, 12));
    decipher.setAAD(Buffer.from(kind)); decipher.setAuthTag(bytes.subarray(12, 28));
    const value = JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString('utf8')) as T;
    if (typeof value.expires !== 'number' || value.expires <= Date.now()) { removeOidcValue(id, kind); return undefined; }
    return value;
  } catch { return undefined; }
}
export function removeOidcValue(id: string | undefined, kind: 'flow' | 'session' = 'session'): void {
  if (!id) return;
  if (kind === 'session') {
    try { writeFileSync(file(id, kind) + '.revoked', '', { mode: 0o600 }); } catch { /* Missing storage already prevents use. */ }
  }
  try { unlinkSync(file(id, kind)); } catch { /* Absent and expired sessions are already closed. */ }
}
export async function oidcAccessToken(cookie: string | undefined): Promise<string | undefined> {
  if (!cookie) return undefined;
  const initial = read<Session>(cookie, 'session');
  if (!initial) return undefined;
  if (initial.accessExpires > Date.now() + 30000) return initial.accessToken;
  if (!initial.refreshToken) { removeOidcValue(cookie); return undefined; }
  const lockPath = file(cookie, 'session') + '.lock';
  let descriptor: number | undefined;
  for (let attempt = 0; attempt < 240; attempt++) {
    try { descriptor = openSync(lockPath, 'wx', 0o600); break; }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') { removeOidcValue(cookie); return undefined; }
      await new Promise((done) => setTimeout(done, 50));
      const current = read<Session>(cookie, 'session');
      if (!current) return undefined;
      if (current.accessExpires > Date.now() + 30000) return current.accessToken;
    }
  }
  if (descriptor === undefined) { removeOidcValue(cookie); return undefined; }
  let temporary: string | undefined;
  try {
    const current = read<Session>(cookie, 'session');
    if (!current) return undefined;
    if (current.accessExpires > Date.now() + 30000) return current.accessToken;
    if (!current.refreshToken) throw new Error('Missing refresh token');
    const tokens = await client.refreshTokenGrant(await configuration(), current.refreshToken);
    if (tokens.token_type.toLowerCase() !== 'bearer' || typeof tokens.expires_in !== 'number' || tokens.expires_in <= 0) throw new Error('Invalid refresh response');
    const claims = tokens.claims();
    if (claims && claims.sub !== current.subject) throw new Error('Identity changed during refresh');
    const next: Session = { ...current, accessToken: tokens.access_token, accessExpires: Date.now() + tokens.expires_in * 1000,
      refreshToken: tokens.refresh_token ?? current.refreshToken, idToken: tokens.id_token ?? current.idToken };
    temporary = file(cookie, 'session') + `.${randomBytes(8).toString('hex')}.tmp`;
    writeFileSync(temporary, encrypted('session', next), { flag: 'wx', mode: 0o600 });
    if (existsSync(file(cookie, 'session') + '.revoked')) return undefined;
    renameSync(temporary, file(cookie, 'session')); temporary = undefined;
    return next.accessToken;
  } catch { removeOidcValue(cookie); return undefined; }
  finally {
    if (temporary) { try { unlinkSync(temporary); } catch {} }
    closeSync(descriptor); try { unlinkSync(lockPath); } catch {}
  }
}
export function oidcCookieSecure(): boolean { return new URL(settings().origin).protocol === 'https:'; }
export function localReturnTo(value: string): string {
  const origin = settings().origin;
  if (!/^\/(?:es|en)(?:[/?]|$)/.test(value) || value.includes('\\')) return '/es';
  const target = new URL(value, origin);
  return target.origin === origin ? target.pathname + target.search : '/es';
}
export async function beginOidc(returnTo: string) {
  const config = await configuration();
  const flow: Flow = { expires: Date.now() + 600000, verifier: client.randomPKCECodeVerifier(), nonce: client.randomNonce(), state: client.randomState(), returnTo: localReturnTo(returnTo) };
  const destination = client.buildAuthorizationUrl(config, { redirect_uri: `${settings().origin}/api/auth/callback`, scope: 'openid profile email',
    code_challenge: await client.calculatePKCECodeChallenge(flow.verifier), code_challenge_method: 'S256', state: flow.state, nonce: flow.nonce });
  return { destination, cookie: save('flow', flow) };
}
export async function finishOidc(callback: URL, cookie: string | undefined): Promise<GrantedSession> {
  const flow = read<Flow>(cookie, 'flow'); removeOidcValue(cookie, 'flow');
  if (!flow) throw new Error('Expired OIDC flow');
  const canonical = new URL('/api/auth/callback', settings().origin); canonical.search = callback.search;
  const tokens = await client.authorizationCodeGrant(await configuration(), canonical, {
    pkceCodeVerifier: flow.verifier, expectedState: flow.state, expectedNonce: flow.nonce, idTokenExpected: true,
  });
  if (tokens.token_type.toLowerCase() !== 'bearer' || typeof tokens.expires_in !== 'number' || tokens.expires_in <= 0) throw new Error('Invalid access token response');
  const claims = tokens.claims();
  if (!tokens.id_token || !claims?.sub) throw new Error('Missing identity token');
  const maxAge = tokens.refresh_token ? 28800 : Math.min(Math.floor(tokens.expires_in), 28800);
  return { accessToken: tokens.access_token, refreshToken: tokens.refresh_token, idToken: tokens.id_token, subject: claims.sub,
    accessExpires: Date.now() + tokens.expires_in * 1000, maxAge, returnTo: flow.returnTo };
}
export function createOidcSession(session: GrantedSession): string {
  return save('session', { accessToken: session.accessToken, refreshToken: session.refreshToken, idToken: session.idToken,
    subject: session.subject, accessExpires: session.accessExpires, expires: Date.now() + session.maxAge * 1000 });
}
export async function oidcLogoutDestination(cookie: string | undefined, locale: 'es' | 'en'): Promise<string> {
  const session = read<Session>(cookie, 'session');
  removeOidcValue(cookie);
  try {
    return client.buildEndSessionUrl(await configuration(), { post_logout_redirect_uri: `${settings().origin}/${locale}`,
      ...(session?.idToken ? { id_token_hint: session.idToken } : {}) }).href;
  } catch { return `${settings().origin}/${locale}?logoutError=1`; }
}
export function adminOrigin(): string { return settings().origin; }
