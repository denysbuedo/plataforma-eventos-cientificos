import { NextResponse } from 'next/server';
import { checkOrigin, createDemoCookie, errorResponse, SESSION_COOKIE } from '@sep/web-server';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const data: unknown = await request.json();
    const persona = data && typeof data === 'object' && 'persona' in data ? data.persona : undefined;
    if (typeof persona !== 'string') return NextResponse.json({ error: { code: 'VALIDATION_FAILED' } }, { status: 400 });
    const cookie = createDemoCookie(persona);
    const response = NextResponse.json({ ok: true }, { headers: { 'cache-control': 'no-store' } });
    response.cookies.set(SESSION_COOKIE, cookie, { httpOnly: true, sameSite: 'lax', secure: new URL(request.url).protocol === 'https:', path: '/', maxAge: 3600 });
    return response;
  } catch (error) { return errorResponse(error); }
}
