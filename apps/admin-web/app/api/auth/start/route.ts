import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { beginOidc, beginGoogle, checkOrigin, errorResponse, oidcCookieSecure, GOOGLE_FLOW_COOKIE, OIDC_FLOW_COOKIE, removeOidcValue } from '@sep/web-server';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const data = await request.formData(); const returnTo = data.get('returnTo');
    const provider = data.get('provider') ?? 'reduniv';
    if (provider !== 'reduniv' && provider !== 'google') return NextResponse.json({ error: { code: 'VALIDATION_FAILED' } }, { status: 400 });
    const flow = await (provider === 'google' ? beginGoogle : beginOidc)(typeof returnTo === 'string' ? returnTo : '/es');
    const cookieName = provider === 'google' ? GOOGLE_FLOW_COOKIE : OIDC_FLOW_COOKIE;
    removeOidcValue((await cookies()).get(cookieName)?.value, 'flow');
    const response = NextResponse.redirect(flow.destination, 303);
    response.headers.set('cache-control', 'no-store');
    response.cookies.set(cookieName, flow.cookie, { httpOnly: true, secure: oidcCookieSecure(), sameSite: 'lax', path: '/api/auth', maxAge: 600 });
    return response;
  } catch (error) { return errorResponse(error); }
}
