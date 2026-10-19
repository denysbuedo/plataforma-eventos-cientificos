import {completeAccountLink,failedAccountLink} from '../link/shared';
import { cookies } from 'next/headers';
import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { adminOrigin, apiRequest, ApiTransportError, bindingFor, createOidcSession, finishOidc, oidcCookieSecure, OIDC_FLOW_COOKIE, removeOidcValue, SESSION_COOKIE } from '@sep/web-server';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  const jar = await cookies();
  let response: NextResponse;
  let stage = 'token-exchange';
  try {
    const flow = await finishOidc(new URL(request.url), jar.get(OIDC_FLOW_COOKIE)?.value);
    const linkResponse=await completeAccountLink(jar,flow.accessToken,'reduniv');
    if(linkResponse)response=linkResponse;else {
    stage = 'api-profile';
    await apiRequest(bindingFor(new URL(adminOrigin()).host, undefined), 'me', { token: flow.accessToken });
    stage = 'session';
    const session = createOidcSession(flow);
    removeOidcValue(jar.get(SESSION_COOKIE)?.value);
    response = NextResponse.redirect(new URL(flow.returnTo, adminOrigin()), 303);
    response.cookies.set(SESSION_COOKIE, session, { httpOnly: true, secure: oidcCookieSecure(), sameSite: 'lax', path: '/', maxAge: flow.maxAge });
    }
  } catch (error) {
    const linkFailure=failedAccountLink(jar,OIDC_FLOW_COOKIE);if(linkFailure)return linkFailure;
    const reference = randomUUID();
    const code = error instanceof ApiTransportError ? error.body.error.code
      : error && typeof error === 'object' && 'code' in error && typeof error.code === 'string' && /^[A-Z_]{1,80}$/.test(error.code) ? error.code : 'OIDC_CALLBACK_FAILED';
    // Never log callback URLs, authorization codes, tokens, claims or raw exceptions.
    console.error(JSON.stringify({ event: 'auth.reduniv.callback.failed', reference, stage, code,
      ...(error instanceof ApiTransportError ? { status: error.status, backendRequestId: error.body.error.requestId } : {}) }));
    const origin = process.env.SEP_ADMIN_ORIGIN;
    if (!origin) return NextResponse.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401, headers: { 'cache-control': 'no-store' } });
    response = NextResponse.redirect(new URL(`/es?authError=1&authRef=${reference}`, origin), 303);
  }
  response.cookies.set(OIDC_FLOW_COOKIE, '', { httpOnly: true, sameSite: 'lax', secure: new URL(process.env.SEP_ADMIN_ORIGIN!).protocol === 'https:', path: '/api/auth', maxAge: 0 });
  response.headers.set('cache-control', 'no-store'); response.headers.set('referrer-policy', 'no-referrer');
  return response;
}
