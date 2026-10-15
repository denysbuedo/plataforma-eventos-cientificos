'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { EventPage, EventTeam, EventView, PeopleDirectory, PublishedSite, SessionView, SiteContent, SiteDraft } from '@sep/contracts';
import { webCopy, type Locale } from '@sep/i18n';
import { Brand, Icon, StatusBadge, type IconName } from '@sep/ui';
import People from './people';

type Props = { locale: Locale; contextKey: string; tab: string; session: SessionView | null; events: EventPage; site: SiteDraft | null; team: EventTeam | null; directory: PeopleDirectory | null;
  profile: { id: string; name: string } | null;
  denied: boolean; publicUrl: string; demo: boolean; contextHosts: Record<string, string>; contextEvents: Record<string, string> };
type LocalizedField = 'kicker' | 'heroTitle' | 'summary' | 'about' | 'call' | 'venue';
function Field({ label, value, onChange, disabled = false, multiline = false, type = 'text' }: {
  label: string; value: string; onChange: (value: string) => void; disabled?: boolean; multiline?: boolean; type?: string;
}) { return <label className="field"><span>{label}</span>{multiline ? <textarea value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} rows={4} /> : <input type={type} value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} />}</label>; }

export default function Workspace(props: Props) {
  const { locale, contextKey, tab, session, events, denied, publicUrl, demo, contextHosts, contextEvents } = props;
  const text = webCopy[locale]; const router = useRouter();
  const person = session?.person ?? props.profile;
  const [site, setSite] = useState(props.site); const [content, setContent] = useState<SiteContent | null>(props.site?.content ?? null);
  const [editLanguage, setEditLanguage] = useState<Locale>(locale); const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ error: boolean; message: string } | null>(null); const [creating, setCreating] = useState(false);
  const [names, setNames] = useState({ nameEs: props.site?.event.nameEs ?? '', nameEn: props.site?.event.nameEn ?? '' });
  const [newEvent, setNewEvent] = useState({ nameEs: '', nameEn: '', timezone: 'America/Havana' });
  const [team, setTeam] = useState(props.team); const [selectedPerson, setSelectedPerson] = useState('');
  const canEdit = !!session?.canEdit; const dirty = !!content && JSON.stringify(content) !== JSON.stringify(site?.content);
  const currentTab = site ? tab : tab === 'people' && session?.organizationAdmin ? 'people' : 'overview';
  const siteKey = site ? Object.keys(contextEvents).find((key) => contextEvents[key] === site.event.id) ?? contextKey : demo && contextKey === 'orgA' ? 'a1' : contextKey;
  const siteUrl = `${publicUrl}/${locale}?event=${encodeURIComponent(siteKey)}`;
  const path = (value: string) => `/api/backend/${value}?event=${encodeURIComponent(contextKey)}&lang=${locale}`;
  async function request<T>(value: string, method: string, body?: unknown): Promise<T> {
    const response = await fetch(path(value), { method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message ?? text.serviceHelp);
    return data as T;
  }
  async function save() {
    if (!site || !content || !canEdit) return;
    setBusy('save'); setNotice(null);
    try {
      const clean = { ...content, topicsEs: content.topicsEs.map((s) => s.trim()).filter(Boolean), topicsEn: content.topicsEn.map((s) => s.trim()).filter(Boolean) };
      const next = await request<SiteDraft>(`events/${site.event.id}/site`, 'PUT', { revision: site.revision, content: clean });
      setSite(next); setContent(next.content); setNotice({ error: false, message: text.saved });
    } catch (error) { setNotice({ error: true, message: error instanceof Error ? error.message : text.serviceHelp }); }
    finally { setBusy(null); }
  }
  async function publish() {
    if (!site || !canEdit || dirty) return;
    setBusy('publish'); setNotice(null);
    try {
      const next = await request<PublishedSite>(`events/${site.event.id}/site/publish`, 'POST', { revision: site.revision });
      setSite({ ...site, event: { ...site.event, status: 'published' }, publishedAt: next.publishedAt, publishedRevision: next.revision });
      setNotice({ error: false, message: text.publishedNotice }); router.refresh();
    } catch (error) { setNotice({ error: true, message: error instanceof Error ? error.message : text.serviceHelp }); }
    finally { setBusy(null); }
  }
  async function saveNames() {
    if (!site) return;
    setBusy('data'); setNotice(null);
    try {
      const event = await request<EventView>(`events/${site.event.id}`, 'PATCH', names);
      setSite({ ...site, event }); setNotice({ error: false, message: text.dataSaved }); router.refresh();
    } catch (error) { setNotice({ error: true, message: error instanceof Error ? error.message : text.serviceHelp }); }
    finally { setBusy(null); }
  }
  async function createEvent() {
    setBusy('create'); setNotice(null);
    try { const created = await request<EventView>('events', 'POST', newEvent); window.location.assign(`/${locale}?event=${created.id}&tab=team`); }
    catch (error) { setNotice({ error: true, message: error instanceof Error ? error.message : text.serviceHelp }); }
    finally { setBusy(null); }
  }
  async function logout() { await fetch('/api/auth/logout', { method: 'POST' }); window.location.assign(`/${locale}`); }
  async function assignOrganizer(personId: string) {
    if (!site || !personId) return;
    setBusy('team'); setNotice(null);
    try {
      const next = await request<EventTeam>(`events/${site.event.id}/organizers`, 'POST', { personId });
      setTeam(next); setSelectedPerson('');
      if (personId === session?.person.id) window.location.assign(`/${locale}?event=${contextKey}&tab=content`);
      else { setNotice({ error: false, message: text.assignedOrganizer }); router.refresh(); }
    } catch (error) { setNotice({ error: true, message: error instanceof Error ? error.message : text.serviceHelp }); }
    finally { setBusy(null); }
  }
  async function removeOrganizer(personId: string) {
    if (!site) return;
    setBusy('team'); setNotice(null);
    try { setTeam(await request<EventTeam>(`events/${site.event.id}/organizers/${personId}`, 'DELETE')); setNotice({ error: false, message: text.removedOrganizer }); router.refresh(); }
    catch (error) { setNotice({ error: true, message: error instanceof Error ? error.message : text.serviceHelp }); }
    finally { setBusy(null); }
  }
  const navigation: { id: string; label: string; icon: IconName }[] = [
    { id: 'overview', label: text.overview, icon: 'grid' }, { id: 'content', label: text.content, icon: 'edit' },
    { id: 'appearance', label: text.appearance, icon: 'palette' }, { id: 'data', label: text.eventData, icon: 'settings' },
    ...(session?.organizationAdmin && site ? [{ id: 'team', label: text.team, icon: 'grid' as const }] : []),
    ...(session?.organizationAdmin ? [{ id: 'people', label: text.people, icon: 'book' as const }] : []),
  ];
  const contextNames: Record<string, string> = { a1: 'Biosfera 2026', a2: locale === 'es' ? 'Ciencia Abierta 2027' : 'Open Science 2027', b1: 'Horizontes 2026', orgA: locale === 'es' ? 'Organización A' : 'Organization A' };
  if (site && !Object.hasOwn(contextNames, contextKey)) contextNames[contextKey] = locale === 'es' ? site.event.nameEs : site.event.nameEn;
  function change(field: keyof SiteContent, value: string | string[]) { setContent((current) => current ? { ...current, [field]: value } : current); }
  const localizedKey = (field: LocalizedField) => `${field}${editLanguage === 'es' ? 'Es' : 'En'}` as keyof SiteContent;
  const heading = currentTab === 'people' ? [text.peopleTitle, text.peopleHelp] : currentTab === 'team' ? [text.teamTitle, text.teamHelp] : currentTab === 'content' ? [text.editorialTitle, text.editorialHelp] : currentTab === 'appearance' ? [text.paletteTitle, text.paletteHelp] : currentTab === 'data' ? [text.dataTitle, text.dataHelp] : [text.hello, text.overviewHelp];
  const field = (kind: LocalizedField, label: string, multiline = false) => content && <Field key={kind} label={label} value={content[localizedKey(kind)] as string} onChange={(value) => change(localizedKey(kind), value)} disabled={!canEdit} multiline={multiline} />;
  return <div className="admin-shell"><a href="#main" className="skip-link">{text.skip}</a><aside className="sidebar"><Brand compact /><p className="workspace-label">{text.workspace}</p>
    <nav aria-label={text.workspace}>{navigation.filter((item) => ['overview', 'people'].includes(item.id) || !!site).map((item) => <a key={item.id} href={`/${locale}?event=${item.id === 'people' ? demo ? 'orgA' : 'org' : contextKey}&tab=${item.id}`} className={currentTab === item.id ? 'active' : ''} aria-label={item.label}><Icon name={item.icon} size={18} /><span>{item.label}</span></a>)}</nav>
    <div className="sidebar-bottom"><a href={siteUrl}><Icon name="external" size={16} /><span>{text.publicPortal}</span></a><button onClick={logout} aria-label={text.logout}><Icon name="logout" size={16} /><span>{text.logout}</span></button>{demo && <small>{text.demo}</small>}</div>
  </aside><div className="admin-area"><header className="admin-topbar"><div className="breadcrumb">{text.workspace} <strong>/ {navigation.find((item) => item.id === currentTab)?.label ?? text.overview}</strong></div><div className="topbar-right"><div className="language-switch"><a href={`/es?event=${contextKey}&tab=${currentTab}`} className={locale === 'es' ? 'active' : ''}>ES</a><a href={`/en?event=${contextKey}&tab=${currentTab}`} className={locale === 'en' ? 'active' : ''}>EN</a></div><div className="user-chip"><span className="avatar">{person?.name.slice(0, 2).toUpperCase() ?? 'SE'}</span><span>{person?.name ?? 'SEP'}</span></div></div></header>
    <main id="main" className="admin-main"><div className="context-row">{demo && <label className="context-select"><span>{text.search}</span><select value={contextKey} onChange={(e) => router.push(`/${locale}?event=${e.target.value}`)}>{Object.entries(contextNames).map(([key, name]) => <option key={key} value={key}>{name}</option>)}</select></label>}{site && <StatusBadge status={site.event.status} label={text[site.event.status]} />}</div>
      {denied ? <div className="empty-state"><Icon name="lock" size={40} /><h1>{!session && person ? text.accountNotLinked : session && !session.roles.length ? text.awaitingAssignment : text.accessTitle}</h1><p>{!session && person ? text.accountNotLinkedHelp : session && !session.roles.length ? text.awaitingAssignmentHelp : text.accessHelp}</p><a href={siteUrl} className="button button-primary">{text.publicPortal}<Icon name="arrow" size={15} /></a></div> : <>
      <div className="admin-heading"><div><span className="eyebrow">{site?.event.nameEs ?? text.platform}</span><h1>{heading[0]}</h1><p>{heading[1]}</p></div>{currentTab === 'overview' && session?.organizationAdmin && !session.eventId && <button onClick={() => setCreating(!creating)} className="button button-primary"><Icon name="plus" size={16} />{text.createEvent}</button>}{currentTab !== 'overview' && site?.publishedAt && <a href={siteUrl} target="_blank" rel="noreferrer" className="button button-outline">{text.viewSite}<Icon name="external" size={14} /></a>}</div>
      {notice && <div className={`notice ${notice.error ? 'notice-error' : ''}`} role={notice.error ? 'alert' : 'status'}>{notice.message}</div>}
      {currentTab === 'people' && props.directory && <People initial={props.directory} locale={locale} contextKey={contextKey} />}
      {creating && <section className="panel create-form"><h2 className="form-section-title">{text.createTitle}</h2><p className="muted small">{text.createHelp}</p><div className="form-fields"><Field label={text.nameEs} value={newEvent.nameEs} onChange={(value) => setNewEvent({ ...newEvent, nameEs: value })} /><Field label={text.nameEn} value={newEvent.nameEn} onChange={(value) => setNewEvent({ ...newEvent, nameEn: value })} /><Field label={text.timezone} value={newEvent.timezone} onChange={(value) => setNewEvent({ ...newEvent, timezone: value })} /></div><div className="editor-actions"><button onClick={createEvent} disabled={!!busy} className="button button-primary">{busy === 'create' ? text.creating : text.create}</button><button onClick={() => setCreating(false)} className="button button-outline">{text.cancel}</button></div></section>}
      {currentTab === 'overview' && <><div className="metric-grid">{[
        { label: text.availableEvents, value: events.data.length, icon: 'calendar' as const, note: text.yourEvents },
        { label: text.publishedSites, value: events.data.filter((event) => event.status === 'published').length, icon: 'globe' as const, note: text.publicPortal },
        { label: text.languages, value: '02', icon: 'book' as const, note: text.bothLanguages },
        { label: text.lastPublication, value: site?.publishedAt ? new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short' }).format(new Date(site.publishedAt)) : '—', icon: 'check' as const, note: site?.publishedAt ? `${text.revision} ${site.publishedRevision}` : text.notPublished },
      ].map((metric) => <div className="metric" key={metric.label}><div className="metric-top"><span>{metric.label}</span><Icon name={metric.icon} size={17} /></div><strong>{metric.value}</strong><small>{metric.note}</small></div>)}</div>
      <section className="panel"><div className="panel-heading"><div><h2>{text.yourEvents}</h2><p>{text.eventsHelp}</p></div><Icon name="calendar" size={19} /></div><table className="event-table"><thead><tr><th>{text.event}</th><th className="domain-col">{text.domain}</th><th>{text.status}</th><th>{text.actions}</th></tr></thead><tbody>{events.data.map((event) => {
        const key = Object.keys(contextEvents).find((key) => contextEvents[key] === event.id);
        const editable = canEdit && session?.eventId === event.id;
        return <tr key={event.id}><td><div className="event-cell"><span className="event-tile"><Icon name={key === 'b1' ? 'globe' : 'leaf'} size={22} /></span><span><strong>{locale === 'es' ? event.nameEs : event.nameEn}</strong><small>{event.timezone}</small></span></div></td><td className="domain-col muted">{key ? contextHosts[key] : '—'}</td><td><StatusBadge status={event.status} label={text[event.status]} /></td><td><a className="table-action" href={`/${locale}?event=${key ?? event.id}&tab=content`}>{editable ? text.manage : text.viewEvent}<Icon name="arrow" size={14} /></a>{session?.organizationAdmin && <a className="table-action" href={`/${locale}?event=${key ?? event.id}&tab=team`}>{text.team}<Icon name="arrow" size={14} /></a>}</td></tr>;
      })}</tbody></table>{!events.data.length && <p className="form-panel muted small">{text.noEvents}</p>}</section>
      <section className="dashboard-banner"><div><h3>{text.connected}</h3><p>{text.editorialHelp}</p>{site && <a className="button button-text" href={`/${locale}?event=${contextKey}&tab=content`}>{text.content}<Icon name="arrow" size={15} /></a>}</div><div className="mini-art"><Icon name="globe" size={70} /><span>SEP.</span></div></section></>}
      {site && currentTab === 'team' && session?.organizationAdmin && team && <section className="panel form-panel">
        <h2>{text.currentOrganizers}</h2>{!team.organizers.length && <p className="muted">{text.noOrganizers}</p>}
        {team.organizers.map((person) => <div className="panel-heading" key={person.personId}><strong>{person.name}</strong><button className="button button-outline" disabled={!!busy || person.personId === session.person.id || team.organizers.length <= 1} onClick={() => removeOrganizer(person.personId)}>{text.removeOrganizer}</button></div>)}
        <p className="small muted">{text.teamRule}</p>
        <div className="form-fields"><label className="field"><span>{text.selectPerson}</span><select value={selectedPerson} onChange={(e) => setSelectedPerson(e.target.value)}><option value="">{text.selectPerson}</option>{team.candidates.filter((person) => !team.organizers.some((organizer) => organizer.personId === person.personId)).map((person) => <option key={person.personId} value={person.personId}>{person.name}</option>)}</select></label>
        <button className="button button-primary" disabled={!selectedPerson || !!busy} onClick={() => assignOrganizer(selectedPerson)}>{busy === 'team' ? text.saving : text.assignOrganizer}</button></div>
      </section>}
      {site && content && !['overview', 'team', 'people'].includes(currentTab) && <>
        {!canEdit && <div className="notice notice-muted"><p>{text.readOnly}</p>{session?.organizationAdmin && <><p>{text.assignSelfHelp}</p><button className="button button-primary" disabled={!!busy} onClick={() => assignOrganizer(session.person.id)}>{busy === 'team' ? text.saving : text.assignSelf}</button><a className="button button-outline" href={`/${locale}?event=${contextKey}&tab=team`}>{text.team}</a></>}</div>}
        {currentTab !== 'data' && <div className="editor-toolbar"><div className={`draft-state ${dirty ? 'dirty' : ''}`}><Icon name="check" size={14} />{dirty ? text.unsaved : text.upToDate}</div><div className="editor-actions"><button className="button button-outline" onClick={save} disabled={!canEdit || !!busy || !dirty}>{busy === 'save' ? text.saving : text.saveDraft}</button><button className="button button-primary" onClick={publish} disabled={!canEdit || !!busy || dirty || site.revision === 0} title={dirty ? text.saveFirst : undefined}><Icon name="globe" size={15} />{busy === 'publish' ? text.publishing : text.publish}</button></div></div>}
        <div className="editor-grid"><section className="panel form-panel">
          {currentTab === 'content' && <><div className="editor-toolbar"><h2 className="form-section-title">{text.content}</h2><div className="language-switch"><button className={editLanguage === 'es' ? 'active' : ''} onClick={() => setEditLanguage('es')}>ES</button><button className={editLanguage === 'en' ? 'active' : ''} onClick={() => setEditLanguage('en')}>EN</button></div></div><div className="form-fields"><Field label={text.acronym} value={content.acronym} onChange={(value) => change('acronym', value)} disabled={!canEdit} />{field('kicker', text.kicker)}{field('heroTitle', text.heroTitle, true)}{field('summary', text.summary, true)}{field('about', text.about, true)}{field('call', text.callText, true)}{field('venue', text.venueName)}<Field label={text.topicList} value={(editLanguage === 'es' ? content.topicsEs : content.topicsEn).join('\n')} onChange={(value) => change(editLanguage === 'es' ? 'topicsEs' : 'topicsEn', value.split('\n'))} multiline disabled={!canEdit} /><div className="field-row"><Field label={text.startDate} value={content.startDate} onChange={(value) => change('startDate', value)} type="date" disabled={!canEdit} /><Field label={text.endDate} value={content.endDate} onChange={(value) => change('endDate', value)} type="date" disabled={!canEdit} /></div><Field label={text.email} value={content.contactEmail} onChange={(value) => change('contactEmail', value)} type="email" disabled={!canEdit} /></div></>}
          {currentTab === 'appearance' && <div className="theme-grid">{(['forest', 'ocean'] as const).map((theme) => <button key={theme} className={`theme-option ${content.theme === theme ? 'selected' : ''}`} aria-pressed={content.theme === theme} disabled={!canEdit} onClick={() => change('theme', theme)}><div className={`mini-preview ${theme}`}><small>{content.acronym}</small><strong>{locale === 'es' ? content.heroTitleEs : content.heroTitleEn}</strong></div><strong>{text[theme]}</strong><p>{text[`${theme}Help`]}</p></button>)}</div>}
          {currentTab === 'data' && <div className="form-fields"><Field label={text.nameEs} value={names.nameEs} onChange={(value) => setNames({ ...names, nameEs: value })} disabled={!canEdit} /><Field label={text.nameEn} value={names.nameEn} onChange={(value) => setNames({ ...names, nameEn: value })} disabled={!canEdit} /><Field label={text.timezone} value={site.event.timezone} onChange={() => {}} disabled /><button onClick={saveNames} disabled={!canEdit || !!busy} className="button button-primary">{busy === 'data' ? text.saving : text.saveData}</button></div>}
        </section><aside className="panel editor-aside"><div className={`mini-preview ${content.theme}`}><small>{content.acronym}</small><strong>{locale === 'es' ? content.heroTitleEs : content.heroTitleEn}</strong></div><h3>{text.publicPortal}</h3><p>{text.editorialHelp}</p>{site.publishedAt && <a href={siteUrl} target="_blank" rel="noreferrer" className="button button-outline">{text.viewSite}<Icon name="external" size={13} /></a>}<div className="revision-info"><span>{text.revision}: {site.revision}</span><span>{text.lastPublication}: {site.publishedAt ? new Intl.DateTimeFormat(locale).format(new Date(site.publishedAt)) : text.notPublished}</span></div></aside></div>
      </>}
    </>}
    </main></div></div>;
}
