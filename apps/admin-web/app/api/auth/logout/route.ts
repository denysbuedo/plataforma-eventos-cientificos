import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { checkOrigin, errorResponse, oidcEnabled, oidcLogoutDestination, SESSION_COOKIE } from '@sep/web-server';
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const locale = new URL(request.url).searchParams.get('lang') === 'en' ? 'en' : 'es';
    const redirectTo = oidcEnabled() ? await oidcLogoutDestination((await cookies()).get(SESSION_COOKIE)?.value, locale) : `/${locale}`;
    const response = NextResponse.json({ ok: true, redirectTo }, { headers: { 'cache-control': 'no-store' } });
    response.cookies.set(SESSION_COOKIE, '', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0 });
    return response;
  } catch (error) { return errorResponse(error); }
}
