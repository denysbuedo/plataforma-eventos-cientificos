import type { Metadata } from 'next';
import { cookies, headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { apiRequest, bindingFor, demoConfiguration, googleLoginEnabled, redunivLoginEnabled, oidcEnabled, SESSION_COOKIE, tokenForCookie } from '@sep/web-server';
import Acceptance from './acceptance';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'SEP · Invitation', robots: { index: false, follow: false }, referrer: 'no-referrer' };
export default async function InvitationPage({ params, searchParams }: {
  params: Promise<{ lang: string; token: string }>; searchParams: Promise<{ event?: string }>;
}) {
  const { lang, token } = await params; const query = await searchParams;
  if (!['es', 'en'].includes(lang) || !/^[A-Za-z0-9_-]{43}$/.test(token)) notFound();
  const apiToken = await tokenForCookie((await cookies()).get(SESSION_COOKIE)?.value);
  const config = demoConfiguration();
  const persona = config && apiToken ? Object.entries(config.tokens).find(([, value]) => value === apiToken)?.[0] : null;
  const institutional = oidcEnabled(); const contextKey = query.event ?? (institutional ? 'org' : 'orgA');
  let accountName = persona ? `Demo ${persona}` : null; let authenticated = !!apiToken;
  if (institutional && apiToken) {
    try { accountName = (await apiRequest<{ person: { name: string } }>(bindingFor((await headers()).get('host') ?? '', contextKey), 'me', { token: apiToken })).person.name; }
    catch { authenticated = false; }
  }
  return <Acceptance locale={lang as 'es' | 'en'} token={token} contextKey={contextKey} authenticated={authenticated} accountName={accountName} institutional={institutional} googleEnabled={googleLoginEnabled()} redunivEnabled={redunivLoginEnabled()} demo={!!config} />;
}
