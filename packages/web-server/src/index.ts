import 'server-only';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import { MAX_WORK_BODY_BYTES, type ApiError, type PublicRegistration, type PublicProgram, type PublishedScientificCall, type PublishedSite } from '@sep/contracts';
import { errorMessage, type ErrorCode, type Locale } from '@sep/i18n';
export {fileTransport as publicFileTransport,fileTransport as publicationFileTransport} from './files.js';
import { fileTransport } from './files.js';
import { oidcAccessToken, oidcEnabled, removeOidcValue } from './oidc.js';
export { ACCOUNT_LINK_COOKIE,saveAccountLink,readAccountLink,type AccountLinkState,adminOrigin, beginOidc, beginGoogle, finishOidc, finishGoogle, createOidcSession, createGoogleSession, createLocalSession, localLoginEnabled, googleLoginEnabled, redunivLoginEnabled, localReturnTo, oidcCookieSecure, oidcEnabled, oidcLogoutDestination, GOOGLE_FLOW_COOKIE, OIDC_FLOW_COOKIE, removeOidcValue } from './oidc.js';

export const SESSION_COOKIE = oidcEnabled() ? 'sep_session' : 'sep_demo_session';
export interface DemoConfiguration {
  baseUrl: string; publicUrl: string; adminUrl: string; webSessionSecret: string;
  hosts: Record<string, string>; events: Record<string, string>; tokens: Record<string, string>;
}
export interface Binding { host: string; key: string; eventId: string | null; config: DemoConfiguration | null }
export function demoConfiguration(): DemoConfiguration | null {
  if (process.env.SEP_DEMO_MODE !== '1' || !process.env.SEP_DEMO_CONFIG) return null;
  return JSON.parse(readFileSync(process.env.SEP_DEMO_CONFIG, 'utf8')) as DemoConfiguration;
}
export function bindingFor(host: string, key: string | undefined): Binding {
  const config = demoConfiguration();
  const normalized = host.toLowerCase().split(':')[0];
  if (oidcEnabled()) {
    const localHost = process.env.SEP_LOCAL_CONTEXT_HOST;
    const resolvedHost = localHost && ['127.0.0.1', 'localhost'].includes(normalized) ? localHost : host;
    return { host: resolvedHost, key: key ?? 'org', eventId: key && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key) ? key : null, config: null };
  }
  if (config && ['127.0.0.1', 'localhost'].includes(normalized)) {
    const selected = key ?? 'a1';
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(selected)) {
      const known=Object.entries(config.events).find(([,id])=>id===selected)?.[0];
      return { host: known?config.hosts[known]:config.hosts.orgA, key: selected, eventId: selected, config };
    }
    if (!Object.hasOwn(config.hosts, selected) || selected === 'pending') throw new ApiTransportError(404, failure('NOT_FOUND'));
    return { host: config.hosts[selected], key: selected, eventId: config.events[selected] ?? null, config };
  }
  return { host, key: '', eventId: null, config: null };
}
function failure(code: ErrorCode, locale: Locale = 'es'): ApiError {
  return { error: { code, message: errorMessage(code, locale), requestId: randomUUID() } };
}
export class ApiTransportError extends Error {
  constructor(public readonly status: number, public readonly body: ApiError) { super(body.error.message); }
}
export async function apiRequest<T>(binding: Binding, path: string, options: { token?: string; method?: string; body?: unknown; locale?: Locale } = {}): Promise<T> {
  const base = process.env.SEP_API_URL ?? binding.config?.baseUrl;
  if (!base) throw new ApiTransportError(503, failure('DATABASE_UNAVAILABLE', options.locale));
  const target = new URL(`/api/v1/${path}`, base);
  return new Promise((done, reject) => {
    const data = options.body === undefined ? undefined : JSON.stringify(options.body);
    const request = (target.protocol === 'https:' ? https : http).request(target, {
      method: options.method ?? 'GET', timeout: /editorial|publications/.test(path)?45000:10000,
      headers: { host: binding.host, accept: 'application/json', 'accept-language': options.locale ?? 'es',
        ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
        ...(data ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(data) } : {}) },
    }, (response) => {
      let text = '';
      response.setEncoding('utf8');
      response.on('data', (chunk: string) => { text += chunk; if (text.length > (/gallery/.test(path) ? 24 * 1024 * 1024 : /program|editorial|publications|operations|payments|reports|sponsorship|attendance\/report/.test(path) ? 16 * 1024 * 1024 : 1_000_000)) request.destroy(); });
      response.on('end', () => {
        try {
          const body = JSON.parse(text);
          if ((response.statusCode ?? 500) >= 400) reject(new ApiTransportError(response.statusCode!, body)); else done(body as T);
        } catch { reject(new ApiTransportError(502, failure('INTERNAL_ERROR', options.locale))); }
      });
    });
    request.on('timeout', () => request.destroy());
    request.on('error', () => reject(new ApiTransportError(503, failure('DATABASE_UNAVAILABLE', options.locale))));
    request.end(data);
  });
}
export async function tokenForCookie(cookie: string | undefined, config = demoConfiguration()): Promise<string | undefined> {
  if (oidcEnabled()) return oidcAccessToken(cookie);
  if (!cookie || !config?.webSessionSecret) return undefined;
  try {
    const [payload, signature, extra] = cookie.split('.');
    if (!payload || !signature || extra) return undefined;
    const expected = createHmac('sha256', config.webSessionSecret).update(payload).digest();
    const actual = Buffer.from(signature, 'base64url');
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return undefined;
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { persona: string; expires: number };
    if (typeof session.expires !== 'number' || session.expires < Date.now() || !Object.hasOwn(config.tokens, session.persona)) return undefined;
    return config.tokens[session.persona];
  } catch { return undefined; }
}
export function createDemoCookie(persona: string): string {
  const config = demoConfiguration();
  if (!config || !Object.hasOwn(config.tokens, persona)) throw new ApiTransportError(404, failure('NOT_FOUND'));
  const payload = Buffer.from(JSON.stringify({ persona, expires: Date.now() + 3_600_000, nonce: randomUUID() })).toString('base64url');
  return `${payload}.${createHmac('sha256', config.webSessionSecret).update(payload).digest('base64url')}`;
}
export function checkOrigin(request: Request): void {
  // Next may reconstruct request.url using localhost behind the local server.
  // Compare against the server's configured browser origin, never a client header.
  const origin = new URL(process.env.SEP_ADMIN_ORIGIN ?? request.url).origin;
  if (request.headers.get('origin') !== origin) throw new ApiTransportError(403, failure('FORBIDDEN'));
}
export function errorResponse(error: unknown): Response {
  const known = error instanceof ApiTransportError ? error : new ApiTransportError(500, failure('INTERNAL_ERROR'));
  return Response.json(known.body, { status: known.status, headers: { 'cache-control': 'no-store' } });
}
export async function backendProxy(request: Request, parts: string[], cookie: string | undefined): Promise<Response> {
  try {
    if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) throw new ApiTransportError(405, failure('FORBIDDEN'));
    const path = parts.join('/');
    if (!/^(?:me(?:\/access|\/sign-in-methods(?:\/email)?|\/researcher-profile|\/orcid(?:\/(?:start|finish))?)?|session|researchers|people|organization(?:\/access(?:\/admins\/[0-9a-f-]{36}|\/registered\/(?:search|add))?|\/domains(?:\/[0-9a-f-]{36}(?:\/(?:verify|activate|deactivate))?)?)?|invitations(?:\/accept|\/[0-9a-f-]{36}\/revoke)?|events(?:\/[0-9a-f-]{36}(?:\/site(?:\/publish)?|\/session|\/my-works\/notices|\/(?:my-works|submissions)(?:\/[0-9a-f-]{36}(?:\/(?:submit|withdraw|synchronize-call|decision|notices\/read|manuscript|collaborations(?:\/[0-9a-f-]{36}\/revoke)?|versions\/[0-9a-f-]{36}|files\/[0-9a-f-]{36}))?)?|\/authorship(?:-review)?(?:\/read|\/claims\/[0-9a-f-]{36}|\/works\/[0-9a-f-]{36}\/responsibility)?|\/peer-review\/(?:tracking|response-checks(?:\/[0-9a-f-]{36}\/assess)?|committee(?:\/[0-9a-f-]{36}\/revoke)?|mine(?:\/(?:membership|status)|\/[0-9a-f-]{36}(?:\/(?:respond|submit|files\/[0-9a-f-]{36}))?)?|works\/[0-9a-f-]{36}(?:\/rounds(?:\/[0-9a-f-]{36}\/(?:close|assign|extend))?|\/assignments\/[0-9a-f-]{36}\/revoke)?)|\/work-collaborations\/accept|\/editorial\/(?:mine|history|permissions\/[0-9a-f-]{36}|releases\/[0-9a-f-]{36}\/(?:pdf|withdraw)|(?:abstracts|proceedings)(?:\/(?:candidates|preview|publish|items\/[0-9a-f-]{36}))?)|\/notifications(?:\/(?:preferences|[0-9a-f-]{36}\/read))?|\/communications\/(?:deliveries(?:\/[0-9a-f-]{36}\/(?:attempts|retry))?|announcements|templates)|\/certificates(?:\/(?:templates(?:\/[0-9a-f-]{36}(?:\/preview)?)?|candidates|issue|mine(?:\/[0-9a-f-]{36}(?:\/pdf)?)?|[0-9a-f-]{36}(?:\/(?:pdf|revoke))?))?|\/payments(?:\/(?:settings|charges(?:\/[0-9a-f-]{36}\/decision)?|mine(?:\/[0-9a-f-]{36}\/report)?))?|\/gallery(?:\/(?:mine(?:\/[0-9a-f-]{36})?|[0-9a-f-]{36}\/(?:approval|publish)|releases\/[0-9a-f-]{36}\/withdraw))?|\/operations(?:\/(?:resources|assignments|policies\/[0-9a-f-]{36}|channels\/[0-9a-f-]{36}|mine(?:\/[0-9a-f-]{36}\/(?:book|cancel|join|recording))?))?|\/reports(?:\/(?:export))?|\/sponsorship(?:\/(?:settings|preview|publish|history|institutions\/[0-9a-f-]{36}|commitments\/[0-9a-f-]{36}|releases\/[0-9a-f-]{36}(?:\/withdraw)?))?|\/attendance(?:\/(?:team(?:\/[0-9a-f-]{36})?|report|mine|credential(?:\/revoke)?|lookup|registrations\/[0-9a-f-]{36}(?:\/check-in)?|records\/[0-9a-f-]{36}\/correction))?|\/registration\/(?:settings(?:\/(?:publish|withdraw))?|mine(?:\/cancel)?|entries(?:\/[0-9a-f-]{36}(?:\/decision)?)?)|\/program(?:\/(?:mine|candidates|publish|withdraw|spaces(?:\/[0-9a-f-]{36})?))?|\/remove|\/configuration|\/call(?:\/(?:publish|withdraw))?|\/lifecycle|\/organizers(?:\/[0-9a-f-]{36})?)?)?)$/.test(path)) throw new ApiTransportError(404, failure('NOT_FOUND'));
    if (request.method !== 'GET') checkOrigin(request);
    const url = new URL(request.url);
    const binding = bindingFor(request.headers.get('host') ?? '', url.searchParams.get('event') ?? undefined);
    const token = await tokenForCookie(cookie);
    if (!token) throw new ApiTransportError(401, failure('UNAUTHORIZED'));
    const query = new URLSearchParams();
    for (const name of ['limit', 'offset', 'status', 'q', 'timing','proof','filter','workId','presence','sessionId','resourceId','dataset']) if (url.searchParams.has(name)) query.set(name, url.searchParams.get(name)!);
    const locale: Locale = url.searchParams.get('lang') === 'en' ? 'en' : 'es';
    if ((request.method === 'POST' && path.endsWith('/manuscript')) || (request.method === 'GET' && (/\/files\/[0-9a-f-]{36}$/.test(path)||(path.includes('/certificates/')||path.includes('/editorial/'))&&/\/(?:pdf|preview)$/.test(path)))) return await fileTransport(request,binding,path+(query.size?'?'+query:''),token,locale);
    let body: unknown;
    if (request.method !== 'GET') {
      const text = await request.text();
      if ((path.includes('/my-works')||path.endsWith('/program')||path.includes('/certificates/templates/')||path.includes('/sponsorship/')||path.includes('/gallery/')||path.includes('/payments/')) ? Buffer.byteLength(text, 'utf8') > MAX_WORK_BODY_BYTES : text.length > 64000) throw new ApiTransportError(400, failure('VALIDATION_FAILED', locale));
      body = text ? JSON.parse(text) : {};
    }
    const data = await apiRequest(binding, path + (query.size ? `?${query}` : ''), { token, method: request.method, body, locale });
    return Response.json(data, { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    const response = errorResponse(error);
    if (oidcEnabled() && error instanceof ApiTransportError && error.status === 401) {
      removeOidcValue(cookie);
      const secure = process.env.SEP_ADMIN_ORIGIN?.startsWith('https:') ? '; Secure' : '';
      response.headers.append('set-cookie', `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${secure}`);
    }
    return response;
  }
}
export async function loadPublicSite(host: string, key: string | undefined, locale: Locale): Promise<{ binding: Binding; site: PublishedSite; scientificCall: PublishedScientificCall | null; program:PublicProgram|null; registration:PublicRegistration|null }> {
  const binding = bindingFor(host, key);
  const site = await apiRequest<PublishedSite>(binding, 'public/site', { locale });
  let scientificCall: PublishedScientificCall | null = null;
  try { scientificCall = await apiRequest<PublishedScientificCall>(binding, 'public/call', { locale }); }
  catch (error) { if (!(error instanceof ApiTransportError && error.status === 404)) throw error; }
  let program:PublicProgram|null=null;
  try{program=await apiRequest<PublicProgram>(binding,'public/program',{locale});}catch(error){if(!(error instanceof ApiTransportError&&error.status===404))throw error;}
  let registration:PublicRegistration|null=null;try{registration=await apiRequest<PublicRegistration>(binding,'public/registration',{locale});}catch(error){if(!(error instanceof ApiTransportError&&error.status===404))throw error;}
  return { binding, site, scientificCall,program,registration };
}
