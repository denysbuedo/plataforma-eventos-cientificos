import Authorship from './authorship';
import { authorshipCopy } from './authorship-copy';
import { Brand } from '@sep/ui';
import { cookies, headers } from 'next/headers';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import type { SubmissionPage, AuthorWorkspace, ScientificCallDraft, EventConfiguration, EventPage, EventTeam, OrganizationSettings, PeopleDirectory, SessionView, SiteDraft } from '@sep/contracts';
import { webCopy, type Locale } from '@sep/i18n';
import { apiRequest, bindingFor, demoConfiguration, googleLoginEnabled, redunivLoginEnabled, oidcEnabled, removeOidcValue, SESSION_COOKIE, tokenForCookie, ApiTransportError } from '@sep/web-server';
import Login from './login';
import Dashboard from './workspace';
import AuthorWorks from './author-works';
import Profile from './profile';
import type { AuthorAccount } from '@sep/contracts';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'SEP · Workspace', robots: { index: false, follow: false } };
export default async function AdminPage({ params, searchParams }: { params: Promise<{ lang: string }>; searchParams: Promise<{ event?: string; tab?: string; authError?: string; logoutError?: string; orcidError?: string }> }) {
  const { lang } = await params;
  if (lang !== 'es' && lang !== 'en') notFound();
  const locale: Locale = lang; const text = webCopy[locale];
  const config = demoConfiguration(); const publicUrl = config?.publicUrl ?? process.env.SEP_PUBLIC_ORIGIN ?? '';
  const cookie = (await cookies()).get(SESSION_COOKIE)?.value;
  const token = await tokenForCookie(cookie);
  const query = await searchParams;
  const institutional = oidcEnabled(); const contextKey = query.event ?? (institutional ? 'org' : 'a1');
  const returnTo = `/${locale}?event=${encodeURIComponent(contextKey)}${query.tab ? `&tab=${encodeURIComponent(query.tab)}` : ''}`;
  const login = <Login locale={locale} publicUrl={publicUrl} enabled={!!config} institutional={institutional} googleEnabled={googleLoginEnabled()} redunivEnabled={redunivLoginEnabled()} returnTo={returnTo} authError={!!query.authError} logoutError={!!query.logoutError} />;
  if (!token) return login;
  let profile: { id: string; name: string } | null = null;
  let session: SessionView | null = null; let events: EventPage = { data: [], limit: 20, offset: 0 }; let site: SiteDraft | null = null; let denied = false;
  let binding;
  let team: EventTeam | null = null;
  let directory: PeopleDirectory | null = null;
  let organization: OrganizationSettings | null = null;
  let configuration: EventConfiguration | null = null; let scientificCall: ScientificCallDraft | null = null; let inbox: SubmissionPage | null = null;
  try {
    binding = bindingFor((await headers()).get('host') ?? '', query.event);
    if (query.tab === 'profile') {
      const person=(await apiRequest<{person:AuthorAccount}>(binding,'me',{token,locale})).person;
      return <Profile person={person} locale={locale} contextKey={contextKey} eventId={binding.eventId} error={!!query.orcidError}/>;
    }
    if (query.tab === 'authorship' && binding.eventId) {
      const person=(await apiRequest<{person:AuthorAccount}>(binding,'me',{token,locale})).person;
      const prefix=`/${locale}?event=${encodeURIComponent(contextKey)}&tab=`;
      return <div className="admin-shell"><aside className="sidebar"><Brand compact/><nav><a href={prefix+'works'}>{text.myWorks}</a><a className="active" href={prefix+'authorship'}>{authorshipCopy[locale].title}</a><a href={prefix+'profile'}>{text.myProfile}</a></nav></aside><div className="admin-area"><header className="admin-topbar"><strong>{authorshipCopy[locale].title}</strong><span>{person.name}</span><div className="language-switch"><a href={`/es?event=${encodeURIComponent(contextKey)}&tab=authorship`}>ES</a><a href={`/en?event=${encodeURIComponent(contextKey)}&tab=authorship`}>EN</a></div></header><main className="admin-main"><Authorship eventId={binding.eventId} contextKey={contextKey} locale={locale}/></main></div></div>;
    }
    if (query.tab === 'works' && binding.eventId) {
      const authorWorkspace = await apiRequest<AuthorWorkspace>(binding, `events/${binding.eventId}/my-works`, { token, locale });
      const author = (await apiRequest<{ person: AuthorAccount }>(binding, 'me', { token, locale })).person;
      return <AuthorWorks key={contextKey} initial={authorWorkspace} locale={locale} contextKey={contextKey} person={author} publicUrl={`${publicUrl}/${locale}?event=${encodeURIComponent(contextKey)}`} />;
    }
    if (institutional) profile = (await apiRequest<{ person: { id: string; name: string } }>(binding, 'me', { token, locale })).person;
    session = await apiRequest<SessionView>(binding, binding.eventId ? `events/${binding.eventId}/session` : 'session', { token, locale });
    if (!session.canRead) denied = true;
    else {
      events = await apiRequest<EventPage>(binding, query.tab === 'organization' ? 'events?limit=100' : 'events', { token, locale });
      if (session.eventId) site = await apiRequest<SiteDraft>(binding, `events/${session.eventId}/site`, { token, locale });
      if (session.eventId && ['data', 'call'].includes(query.tab ?? '')) configuration = await apiRequest<EventConfiguration>(binding, `events/${session.eventId}/configuration`, { token, locale });
      if (session.eventId && query.tab === 'call') scientificCall = await apiRequest<ScientificCallDraft>(binding, `events/${session.eventId}/call`, { token, locale });
      if (session.eventId && query.tab === 'submissions') inbox = await apiRequest<SubmissionPage>(binding, `events/${session.eventId}/submissions`, { token, locale });
      if (session.eventId && session.organizationAdmin) team = await apiRequest<EventTeam>(binding, `events/${session.eventId}/organizers`, { token, locale });
      if (!session.eventId && session.organizationAdmin && query.tab === 'people') directory = await apiRequest<PeopleDirectory>(binding, 'people', { token, locale });
      if (!session.eventId && session.organizationAdmin && query.tab === 'organization') organization = await apiRequest<OrganizationSettings>(binding, 'organization', { token, locale });
    }
  } catch (error) {
    if (error instanceof ApiTransportError && error.status === 401) { if (institutional) removeOidcValue(cookie); return login; }
    if (error instanceof ApiTransportError && [403, 404].includes(error.status)) denied = true;
    else return <main className="public-empty"><div className="empty-state"><h1>{text.serviceTitle}</h1><p>{text.serviceHelp}</p><a href={`/${locale}`} className="button button-primary">{text.retry}</a></div></main>;
  }
  return <Dashboard key={contextKey} locale={locale} contextKey={contextKey} tab={query.tab ?? 'overview'} session={session} profile={profile}
    events={events} site={site} team={team} directory={directory} organization={organization} configuration={configuration} scientificCall={scientificCall} inbox={inbox} denied={denied} publicUrl={publicUrl} demo={!!config} contextHosts={config?.hosts ?? {}} contextEvents={config?.events ?? {}} />;
}
