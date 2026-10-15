import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { checkOrigin, errorResponse, oidcEnabled, removeOidcValue, SESSION_COOKIE } from '@sep/web-server';
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    if (oidcEnabled()) removeOidcValue((await cookies()).get(SESSION_COOKIE)?.value);
    const response = NextResponse.json({ ok: true }, { headers: { 'cache-control': 'no-store' } });
    response.cookies.set(SESSION_COOKIE, '', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0 });
    return response;
  } catch (error) { return errorResponse(error); }
}
