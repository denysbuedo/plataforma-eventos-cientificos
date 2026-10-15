import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { adminOrigin, apiRequest, bindingFor, createOidcSession, finishOidc, oidcCookieSecure, OIDC_FLOW_COOKIE, removeOidcValue, SESSION_COOKIE } from '@sep/web-server';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  const jar = await cookies();
  let response: NextResponse;
  try {
    const flow = await finishOidc(new URL(request.url), jar.get(OIDC_FLOW_COOKIE)?.value);
    await apiRequest(bindingFor(new URL(adminOrigin()).host, undefined), 'me', { token: flow.accessToken });
    const session = createOidcSession(flow);
    removeOidcValue(jar.get(SESSION_COOKIE)?.value);
    response = NextResponse.redirect(new URL(flow.returnTo, adminOrigin()), 303);
    response.cookies.set(SESSION_COOKIE, session, { httpOnly: true, secure: oidcCookieSecure(), sameSite: 'lax', path: '/', maxAge: flow.maxAge });
  } catch {
    const origin = process.env.SEP_ADMIN_ORIGIN;
    if (!origin) return NextResponse.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401, headers: { 'cache-control': 'no-store' } });
    response = NextResponse.redirect(new URL('/es?authError=1', origin), 303);
  }
  response.cookies.set(OIDC_FLOW_COOKIE, '', { httpOnly: true, sameSite: 'lax', secure: new URL(process.env.SEP_ADMIN_ORIGIN!).protocol === 'https:', path: '/api/auth', maxAge: 0 });
  response.headers.set('cache-control', 'no-store'); response.headers.set('referrer-policy', 'no-referrer');
  return response;
}
