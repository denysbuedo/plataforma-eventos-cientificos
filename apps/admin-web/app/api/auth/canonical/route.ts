export const runtime = 'nodejs';

export function GET(request: Request) {
  const configured = process.env.SEP_ADMIN_ORIGIN;
  if (!configured) return new Response(null, { status: 404 });
  const origin = new URL(configured);
  if (origin.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(origin.hostname)) return new Response(null, { status: 404 });
  const encoded = new URL(request.url).searchParams.get('returnTo') ?? '';
  const returnTo = encoded.length <= 16384 && /^[A-Za-z0-9_-]+$/.test(encoded)
    ? Buffer.from(encoded, 'base64url').toString('utf8') : '/es';
  const destination = new URL(origin.origin);
  if (returnTo.startsWith('/') && !returnTo.startsWith('//') && !returnTo.includes('\\')) {
    const proposed = new URL(returnTo, origin);
    if (proposed.origin === origin.origin && proposed.pathname !== '/api/auth/canonical') {
      destination.pathname = proposed.pathname;
      destination.search = proposed.search;
    } else destination.pathname = '/es';
  } else destination.pathname = '/es';
  return new Response(null, { status: 307, headers: {
    location: destination.href, 'cache-control': 'no-store', 'referrer-policy': 'no-referrer',
  } });
}
