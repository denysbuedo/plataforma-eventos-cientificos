import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { adminOrigin, apiRequest, bindingFor, createGoogleSession, finishGoogle, GOOGLE_FLOW_COOKIE, oidcCookieSecure, removeOidcValue, SESSION_COOKIE, tokenForCookie } from '@sep/web-server';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  const jar = await cookies(); let response: NextResponse; let created: string | undefined;
  try {
    const grant = await finishGoogle(new URL(request.url), jar.get(GOOGLE_FLOW_COOKIE)?.value);
    created = createGoogleSession(grant);
    const token = await tokenForCookie(created);
    if (!token) throw new Error('Google session unavailable');
    await apiRequest(bindingFor(new URL(adminOrigin()).host, undefined), 'me', { token });
    removeOidcValue(jar.get(SESSION_COOKIE)?.value);
    response = NextResponse.redirect(new URL(grant.returnTo, adminOrigin()), 303);
    response.cookies.set(SESSION_COOKIE, created, { httpOnly: true, secure: oidcCookieSecure(), sameSite: 'lax', path: '/', maxAge: grant.maxAge });
  } catch {
    removeOidcValue(created);
    const origin = process.env.SEP_ADMIN_ORIGIN;
    if (!origin) return NextResponse.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 });
    response = NextResponse.redirect(new URL('/es?authError=1', origin), 303);
  }
  response.cookies.set(GOOGLE_FLOW_COOKIE, '', { httpOnly: true, sameSite: 'lax', secure: new URL(process.env.SEP_ADMIN_ORIGIN!).protocol === 'https:', path: '/api/auth', maxAge: 0 });
  response.headers.set('cache-control', 'no-store'); response.headers.set('referrer-policy', 'no-referrer');
  return response;
}
