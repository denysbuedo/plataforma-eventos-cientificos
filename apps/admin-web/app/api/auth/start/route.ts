import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { beginOidc, checkOrigin, errorResponse, oidcCookieSecure, OIDC_FLOW_COOKIE, removeOidcValue } from '@sep/web-server';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const data = await request.formData(); const returnTo = data.get('returnTo');
    const flow = await beginOidc(typeof returnTo === 'string' ? returnTo : '/es');
    removeOidcValue((await cookies()).get(OIDC_FLOW_COOKIE)?.value, 'flow');
    const response = NextResponse.redirect(flow.destination, 303);
    response.headers.set('cache-control', 'no-store');
    response.cookies.set(OIDC_FLOW_COOKIE, flow.cookie, { httpOnly: true, secure: oidcCookieSecure(), sameSite: 'lax', path: '/api/auth', maxAge: 600 });
    return response;
  } catch (error) { return errorResponse(error); }
}
