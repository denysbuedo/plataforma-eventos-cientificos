import { NextRequest, NextResponse } from 'next/server';

export function proxy(request: NextRequest) {
  // Cookies and CSRF origins must use the same loopback hostname as the callback.
  // Never relax origin checks or derive a redirect destination from client input.
  const configured = process.env.SEP_ADMIN_ORIGIN;
  if (!configured || !['GET', 'HEAD'].includes(request.method)) return NextResponse.next();
  const origin = new URL(configured);
  const incoming = request.headers.get('host');
  if (origin.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(origin.hostname)
    || !incoming || incoming.toLowerCase() === origin.host) return NextResponse.next();
  const alternate = origin.hostname === '127.0.0.1' ? 'localhost' : '127.0.0.1';
  if (incoming.toLowerCase() !== `${alternate}${origin.port ? `:${origin.port}` : ''}`) return NextResponse.next();
  // Next normalizes loopback hosts in proxy redirects. An internal route emits
  // the final absolute Location header without that normalization.
  const destination = new URL('/api/auth/canonical', request.url);
  // Keep nested query delimiters intact through Next's internal rewrite parser.
  destination.searchParams.set('returnTo', Buffer.from(request.nextUrl.pathname + request.nextUrl.search).toString('base64url'));
  return NextResponse.rewrite(destination);
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|api/auth/canonical).*)'] };
