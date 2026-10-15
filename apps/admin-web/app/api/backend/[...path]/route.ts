import { cookies } from 'next/headers';
import { backendProxy, SESSION_COOKIE } from '@sep/web-server';
export const runtime = 'nodejs';
async function handler(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return backendProxy(request, path, (await cookies()).get(SESSION_COOKIE)?.value);
}
export { handler as GET, handler as POST, handler as PUT, handler as PATCH, handler as DELETE };
