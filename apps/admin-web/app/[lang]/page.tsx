import MyAccessView from './my-access';
import type {MyAccess} from '@sep/contracts';
import PaymentsManager from './payments-workspace';
import MySessions from './my-sessions';
import PosterManager from './poster-workspace';
import MyPublicationsView from './my-publications';
import NotificationCenter from './notification-center';
import MyCertificates from './my-certificates';
import type {CertificatePage} from '@sep/contracts';
import AttendanceAdmin from './attendance-admin';
import MyAttendance from './my-attendance';
import type {AttendanceDetail} from '@sep/contracts';
import MyRegistrationView from './my-registration';
import type {MyRegistration} from '@sep/contracts';
import Participation from './my-participation';
import type {MyParticipation} from '@sep/contracts';
import MyReviews from './peer-review-mine';
import Authorship from './authorship';
import { authorshipCopy, authorshipUi } from './authorship-copy';
import ParticipantShell from './participant-shell';
import { cookies, headers } from 'next/headers';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import type { ReviewWorkspace, SubmissionPage, AuthorWorkspace, ScientificCallDraft, EventConfiguration, EventPage, EventTeam, OrganizationSettings, PeopleDirectory, SessionView, SiteDraft } from '@sep/contracts';
import { webCopy, type Locale } from '@sep/i18n';
import { apiRequest, bindingFor, demoConfiguration, googleLoginEnabled, redunivLoginEnabled, oidcEnabled, removeOidcValue, SESSION_COOKIE, tokenForCookie, ApiTransportError } from '@sep/web-server';
import Login from './login';
import Dashboard from './workspace';
import AuthorWorks from './author-works';
import Profile from './profile';
import type { AuthorAccount } from '@sep/contracts';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'SEP · Workspace', robots: { index: false, follow: false } };
export default async function AdminPage({ params, searchParams }: { params: Promise<{ lang: string }>; searchParams: Promise<{ event?: string; work?:string; tab?: string; mode?: string; authError?: string; authRef?: string; logoutError?: string; orcidError?: string }> }) {
  const { lang } = await params;
  if (lang !== 'es' && lang !== 'en') notFound();
  const locale: Locale = lang; const text = webCopy[locale];
  const config = demoConfiguration(); const publicUrl = config?.publicUrl ?? process.env.SEP_PUBLIC_ORIGIN ?? '';
  const cookie = (await cookies()).get(SESSION_COOKIE)?.value;
  const token = await tokenForCookie(cookie);
  const query = await searchParams;
  const institutional = oidcEnabled(); const contextKey = query.event ?? (institutional ? 'org' : 'orgA');
  const returnTo = `/${locale}?event=${encodeURIComponent(contextKey)}${query.tab ? `&tab=${encodeURIComponent(query.tab)}` : '&tab=access'}`;
  const accounts:{id:string;name:string}[]=[];
  if(config&&!token){const binding=bindingFor((await headers()).get('host')??'',query.event??'orgA');const loaded=await Promise.all(Object.keys(config.tokens).filter(id=>['mixed','operator','admin','outsider','reviewer','reviewer2'].includes(id)).map(async id=>{try{const v=await apiRequest<{person:{name:string}}>(binding,'me',{token:config.tokens[id],locale});return {id,name:v.person.name};}catch{return null;}}));accounts.push(...loaded.filter((v):v is {id:string;name:string}=>!!v));}
  const authReference = /^[0-9a-f-]{36}$/.test(query.authRef ?? '') ? query.authRef : undefined;
  const login = <Login locale={locale} publicUrl={publicUrl} enabled={!!config} preserveContext={!!query.event||!!query.tab} accounts={accounts} institutional={institutional} googleEnabled={googleLoginEnabled()} redunivEnabled={redunivLoginEnabled()} returnTo={returnTo} authError={!!query.authError} authReference={authReference} logoutError={!!query.logoutError} register={query.mode==='register'} />;
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
    if(!query.tab||query.tab==='access'){
      const value=await apiRequest<MyAccess>(binding,'me/access',{token,locale});
      return <ParticipantShell person={value.person} initialAccess={value} locale={locale} contextKey={contextKey} eventId={binding.eventId} tab="access" publicUrl={publicUrl?`${publicUrl}/${locale}?event=${encodeURIComponent(contextKey)}`:''}><MyAccessView value={value} locale={locale} contextKey={contextKey} contextEvents={config?.events??{}} demo={!!config}/></ParticipantShell>;
    }
    if (query.tab === 'profile') {
      const person=(await apiRequest<{person:AuthorAccount}>(binding,'me',{token,locale})).person;
      return <Profile person={person} locale={locale} contextKey={contextKey} eventId={binding.eventId} publicUrl={publicUrl?`${publicUrl}/${locale}?event=${encodeURIComponent(contextKey)}`:''} error={!!query.orcidError}/>;
    }
    if((query.tab==='sessions'||query.tab==='posters'||query.tab==='payments')&&binding.eventId){
      const person=(await apiRequest<{person:AuthorAccount}>(binding,'me',{token,locale})).person;
      return <ParticipantShell person={person} locale={locale} contextKey={contextKey} eventId={binding.eventId} tab={query.tab} publicUrl={publicUrl?`${publicUrl}/${locale}?event=${encodeURIComponent(contextKey)}`:''}>{query.tab==='payments'?<PaymentsManager eventId={binding.eventId} contextKey={contextKey} locale={locale}/>:query.tab==='sessions'?<MySessions eventId={binding.eventId} contextKey={contextKey} locale={locale}/>:<PosterManager eventId={binding.eventId} contextKey={contextKey} locale={locale} publicUrl={publicUrl?`${publicUrl}/${locale}?event=${encodeURIComponent(contextKey)}`:''}/>}</ParticipantShell>;
    }
    if(query.tab==='publications'&&binding.eventId){
      const person=(await apiRequest<{person:AuthorAccount}>(binding,'me',{token,locale})).person;
      return <ParticipantShell person={person} locale={locale} contextKey={contextKey} eventId={binding.eventId} tab="publications" publicUrl={publicUrl?`${publicUrl}/${locale}?event=${encodeURIComponent(contextKey)}`:''}><MyPublicationsView eventId={binding.eventId} contextKey={contextKey} locale={locale}/></ParticipantShell>;
    }
    if(query.tab==='notifications'&&binding.eventId){
      const person=(await apiRequest<{person:AuthorAccount}>(binding,'me',{token,locale})).person;
      return <ParticipantShell person={person} locale={locale} contextKey={contextKey} eventId={binding.eventId} tab="notifications" publicUrl={publicUrl?`${publicUrl}/${locale}?event=${encodeURIComponent(contextKey)}`:''}><NotificationCenter eventId={binding.eventId} contextKey={contextKey} locale={locale}/></ParticipantShell>;
    }
    if(query.tab==='certificates'&&binding.eventId){
      const person=(await apiRequest<{person:AuthorAccount}>(binding,'me',{token,locale})).person;
      const value=await apiRequest<CertificatePage>(binding,`events/${binding.eventId}/certificates/mine`,{token,locale});
      return <ParticipantShell person={person} locale={locale} contextKey={contextKey} eventId={binding.eventId} tab="certificates" publicUrl={publicUrl?`${publicUrl}/${locale}?event=${encodeURIComponent(contextKey)}`:''}><MyCertificates initial={value} eventId={binding.eventId} contextKey={contextKey} locale={locale}/></ParticipantShell>;
    }
    if(query.tab==='accreditation'&&binding.eventId){
      const person=(await apiRequest<{person:AuthorAccount}>(binding,'me',{token,locale})).person;
      const value=await apiRequest<AttendanceDetail>(binding,`events/${binding.eventId}/attendance/mine`,{token,locale});
      return <ParticipantShell person={person} locale={locale} contextKey={contextKey} eventId={binding.eventId} tab="accreditation" publicUrl={publicUrl?`${publicUrl}/${locale}?event=${encodeURIComponent(contextKey)}`:''}><MyAttendance initial={value} eventId={binding.eventId} contextKey={contextKey} locale={locale}/></ParticipantShell>;
    }
    if(query.tab==='registration'&&binding.eventId){
      const person=(await apiRequest<{person:AuthorAccount}>(binding,'me',{token,locale})).person;
      const value=await apiRequest<MyRegistration>(binding,`events/${binding.eventId}/registration/mine`,{token,locale});
      return <ParticipantShell person={person} locale={locale} contextKey={contextKey} eventId={binding.eventId} tab="registration" publicUrl={publicUrl?`${publicUrl}/${locale}?event=${encodeURIComponent(contextKey)}`:''}><MyRegistrationView initial={value} eventId={binding.eventId} contextKey={contextKey} locale={locale}/></ParticipantShell>;
    }
    if(query.tab==='participation'&&binding.eventId){
      const person=(await apiRequest<{person:AuthorAccount}>(binding,'me',{token,locale})).person;
      const value=await apiRequest<MyParticipation>(binding,`events/${binding.eventId}/program/mine`,{token,locale});
      const portal=publicUrl?`${publicUrl}/${locale}?event=${encodeURIComponent(contextKey)}`:'';
      return <ParticipantShell person={person} locale={locale} contextKey={contextKey} eventId={binding.eventId} tab="participation" publicUrl={portal}><Participation value={value} locale={locale} publicUrl={portal}/></ParticipantShell>;
    }
    if(query.tab==='reviews'&&binding.eventId){
      const person=(await apiRequest<{person:AuthorAccount}>(binding,'me',{token,locale})).person;
      const workspace=await apiRequest<ReviewWorkspace>(binding,`events/${binding.eventId}/peer-review/mine`,{token,locale});
      return <ParticipantShell person={person} locale={locale} contextKey={contextKey} eventId={binding.eventId} tab="reviews" publicUrl={publicUrl?`${publicUrl}/${locale}?event=${encodeURIComponent(contextKey)}`:''}><MyReviews key={contextKey} initial={workspace} eventId={binding.eventId} contextKey={contextKey} locale={locale}/></ParticipantShell>;
    }
    if (query.tab === 'authorship' && binding.eventId) {
      const person=(await apiRequest<{person:AuthorAccount}>(binding,'me',{token,locale})).person;
      return <ParticipantShell person={person} locale={locale} contextKey={contextKey} eventId={binding.eventId} tab="authorship" publicUrl={publicUrl?`${publicUrl}/${locale}?event=${encodeURIComponent(contextKey)}`:''}><div className="admin-heading"><div><h1>{authorshipCopy[locale].title}</h1><p>{authorshipUi[locale].help}</p></div></div><Authorship eventId={binding.eventId} contextKey={contextKey} locale={locale}/></ParticipantShell>;
    }
    if (query.tab === 'works' && binding.eventId) {
      const authorWorkspace = await apiRequest<AuthorWorkspace>(binding, `events/${binding.eventId}/my-works`, { token, locale });
      const author = (await apiRequest<{ person: AuthorAccount }>(binding, 'me', { token, locale })).person;
      return <AuthorWorks key={contextKey} initialWorkId={query.work} initial={authorWorkspace} locale={locale} contextKey={contextKey} person={author} publicUrl={publicUrl?`${publicUrl}/${locale}?event=${encodeURIComponent(contextKey)}`:''} />;
    }
    if((!query.tab||['attendance','overview'].includes(query.tab))&&binding.eventId){
      const access=await apiRequest<SessionView>(binding,`events/${binding.eventId}/session`,{token,locale});
      if(access.canAccredit&&!access.canRead){const person=(await apiRequest<{person:AuthorAccount}>(binding,'me',{token,locale})).person;return <ParticipantShell person={person} locale={locale} contextKey={contextKey} eventId={binding.eventId} tab="attendance" publicUrl={publicUrl?`${publicUrl}/${locale}?event=${encodeURIComponent(contextKey)}`:''}><div className="admin-heading"><div><h1>{locale==='es'?'Acreditación del evento':'Event accreditation'}</h1><p>{locale==='es'?'Consulta participantes y confirma entradas.':'Look up participants and confirm entries.'}</p></div></div><AttendanceAdmin eventId={binding.eventId} contextKey={contextKey} locale={locale}/></ParticipantShell>;}
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
  return <Dashboard key={contextKey} locale={locale} contextKey={contextKey} tab={query.tab ?? 'overview'} initialWorkId={query.work} session={session} profile={profile}
    events={events} site={site} team={team} directory={directory} organization={organization} configuration={configuration} scientificCall={scientificCall} inbox={inbox} denied={denied} publicUrl={publicUrl} demo={!!config} contextHosts={config?.hosts ?? {}} contextEvents={config?.events ?? {}} />;
}
