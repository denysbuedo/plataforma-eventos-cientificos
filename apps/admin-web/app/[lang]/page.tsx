import { cookies, headers } from 'next/headers';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import type { EventPage, EventTeam, PeopleDirectory, SessionView, SiteDraft } from '@sep/contracts';
import { webCopy, type Locale } from '@sep/i18n';
import { apiRequest, bindingFor, demoConfiguration, googleLoginEnabled, oidcEnabled, removeOidcValue, SESSION_COOKIE, tokenForCookie, ApiTransportError } from '@sep/web-server';
import Login from './login';
import Dashboard from './workspace';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'SEP · Workspace', robots: { index: false, follow: false } };
export default async function AdminPage({ params, searchParams }: { params: Promise<{ lang: string }>; searchParams: Promise<{ event?: string; tab?: string; authError?: string; logoutError?: string }> }) {
  const { lang } = await params;
  if (lang !== 'es' && lang !== 'en') notFound();
  const locale: Locale = lang; const text = webCopy[locale];
  const config = demoConfiguration(); const publicUrl = config?.publicUrl ?? process.env.SEP_PUBLIC_ORIGIN ?? '';
  const cookie = (await cookies()).get(SESSION_COOKIE)?.value;
  const token = await tokenForCookie(cookie);
  const query = await searchParams;
  const institutional = oidcEnabled(); const contextKey = query.event ?? (institutional ? 'org' : 'a1');
  const returnTo = `/${locale}?event=${encodeURIComponent(contextKey)}${query.tab ? `&tab=${encodeURIComponent(query.tab)}` : ''}`;
  const login = <Login locale={locale} publicUrl={publicUrl} enabled={!!config} institutional={institutional} googleEnabled={googleLoginEnabled()} returnTo={returnTo} authError={!!query.authError} logoutError={!!query.logoutError} />;
  if (!token) return login;
  let profile: { id: string; name: string } | null = null;
  let session: SessionView | null = null; let events: EventPage = { data: [], limit: 20, offset: 0 }; let site: SiteDraft | null = null; let denied = false;
  let binding;
  let team: EventTeam | null = null;
  let directory: PeopleDirectory | null = null;
  try {
    binding = bindingFor((await headers()).get('host') ?? '', query.event);
    if (institutional) profile = (await apiRequest<{ person: { id: string; name: string } }>(binding, 'me', { token, locale })).person;
    session = await apiRequest<SessionView>(binding, binding.eventId ? `events/${binding.eventId}/session` : 'session', { token, locale });
    if (!session.canRead) denied = true;
    else {
      events = await apiRequest<EventPage>(binding, 'events', { token, locale });
      if (session.eventId) site = await apiRequest<SiteDraft>(binding, `events/${session.eventId}/site`, { token, locale });
      if (session.eventId && session.organizationAdmin) team = await apiRequest<EventTeam>(binding, `events/${session.eventId}/organizers`, { token, locale });
      if (!session.eventId && session.organizationAdmin && query.tab === 'people') directory = await apiRequest<PeopleDirectory>(binding, 'people', { token, locale });
    }
  } catch (error) {
    if (error instanceof ApiTransportError && error.status === 401) { if (institutional) removeOidcValue(cookie); return login; }
    if (error instanceof ApiTransportError && [403, 404].includes(error.status)) denied = true;
    else return <main className="public-empty"><div className="empty-state"><h1>{text.serviceTitle}</h1><p>{text.serviceHelp}</p><a href={`/${locale}`} className="button button-primary">{text.retry}</a></div></main>;
  }
  return <Dashboard key={contextKey} locale={locale} contextKey={contextKey} tab={query.tab ?? 'overview'} session={session} profile={profile}
    events={events} site={site} team={team} directory={directory} denied={denied} publicUrl={publicUrl} demo={!!config} contextHosts={config?.hosts ?? {}} contextEvents={config?.events ?? {}} />;
}
