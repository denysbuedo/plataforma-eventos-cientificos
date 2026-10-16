'use client';
import { useState } from 'react';
import type { AuthorWork, AuthorWorkspace } from '@sep/contracts';
import { webCopy, type Locale } from '@sep/i18n';
import { Brand } from '@sep/ui';

export default function AuthorWorks({ initial, locale, contextKey, publicUrl, person }: {
  initial: AuthorWorkspace; locale: Locale; contextKey: string; publicUrl: string; person: { id: string; name: string };
}) {
  const text = webCopy[locale]; const [workspace, setWorkspace] = useState(initial);
  const [saved, setSaved] = useState<AuthorWork | null>(null); const [work, setWork] = useState<AuthorWork | null>(null);
  const [keywords, setKeywords] = useState(''); const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [newWork, setNewWork] = useState({ title: '', trackId: '', contributionTypeId: '', language: initial.languages.includes(locale) ? locale : initial.languages[0] });
  const [busy, setBusy] = useState(false); const [notice, setNotice] = useState<{ error: boolean; message: string } | null>(null);
  const dirty = editing && !!work && (JSON.stringify(work) !== JSON.stringify(saved) || keywords !== (saved?.keywords.join('\n') ?? ''));
  const type = work?.call.content.contributionTypes.find((t) => t.id === work.contributionTypeId);
  const words = work?.abstract.trim() ? work.abstract.trim().split(/\s+/u).length : 0;
  const callChanged = !!work && !!workspace.call && (workspace.call.revision !== work.call.revision || workspace.call.publishedAt !== work.call.publishedAt);
  async function request<T>(suffix: string, method: string, body?: unknown): Promise<T> {
    const response = await fetch(`/api/backend/events/${workspace.event.id}/my-works${suffix}?event=${encodeURIComponent(contextKey)}&lang=${locale}`, {
      method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await response.json();
    if (response.status === 401) window.location.assign(`/${locale}?event=${encodeURIComponent(contextKey)}&tab=works`);
    if (!response.ok) throw new Error(data.error?.message ?? text.serviceHelp); return data as T;
  }
  function select(next: AuthorWork) { setSaved(next); setWork(next); setKeywords(next.keywords.join('\n')); setEditing(false); }
  function cancelEditing() { if (saved) select(saved); }
  function returnToList() {
    if (busy || dirty && !window.confirm(text.discardWorkChanges)) return;
    setWork(null); setSaved(null); setEditing(false); setCreating(false); setKeywords(''); setNotice(null);
    document.getElementById('work-list')?.scrollIntoView({ block: 'start' });
  }
  function toggleCreate() {
    if (dirty && !window.confirm(text.discardWorkChanges)) return;
    setCreating(!creating); setEditing(false); setWork(null); setSaved(null);
  }
  async function action(run: () => Promise<void>, message?: string) {
    setBusy(true); setNotice(null);
    try { await run(); if (message) setNotice({ error: false, message }); }
    catch (error) { setNotice({ error: true, message: error instanceof Error ? error.message : text.serviceHelp }); }
    finally { setBusy(false); }
  }
  async function open(id: string, startEditing = false) {
    if (dirty && !window.confirm(text.discardWorkChanges)) return;
    await action(async () => { select(await request<AuthorWork>(`/${id}`, 'GET')); setEditing(startEditing && workspace.editable); setCreating(false); });
  }
  async function create() {
    if (dirty && !window.confirm(text.discardWorkChanges)) return;
    await action(async () => {
      const next = await request<AuthorWork>('', 'POST', newWork); select(next);
      setWorkspace({ ...workspace, works: [next, ...workspace.works] }); setCreating(false); setNewWork({ title: '', trackId: '', contributionTypeId: '', language: workspace.languages.includes(locale) ? locale : workspace.languages[0] });
    }, text.workCreated);
  }
  async function save() {
    if (!work || !editing) return;
    await action(async () => {
      const next = await request<AuthorWork>(`/${work.id}`, 'PUT', { title: work.title, abstract: work.abstract, language: work.language,
        trackId: work.trackId, contributionTypeId: work.contributionTypeId, keywords: keywords.split('\n').map((k) => k.trim()).filter(Boolean), revision: work.revision });
      select(next); setWorkspace({ ...workspace, works: workspace.works.map((row) => row.id === next.id ? next : row) });
    }, text.workSaved);
  }
  async function reload() {
    if (dirty && !window.confirm(text.discardWorkChanges)) return;
    await action(async () => { const next = await request<AuthorWorkspace>('', 'GET'); setWorkspace(next); if (work) select(await request<AuthorWork>(`/${work.id}`, 'GET')); }, text.worksReloaded);
  }
  async function logout() {
    if (dirty && !window.confirm(text.discardWorkChanges)) return;
    await action(async () => { const response = await fetch(`/api/auth/logout?lang=${locale}`, { method: 'POST' }); if (!response.ok) throw new Error(text.serviceHelp); const data = await response.json(); window.location.assign(data.redirectTo ?? `/${locale}`); });
  }
  function choices(kind: 'trackId' | 'contributionTypeId', value: string, set: (value: string) => void, current = false) {
    const call = current ? work?.call : workspace.call; const rows = kind === 'trackId' ? call?.content.tracks : call?.content.contributionTypes;
    return <label className="field"><span>{kind === 'trackId' ? text.scientificTracks : text.contributionTypes}</span><select required value={value} disabled={busy || !workspace.editable} onChange={(e) => set(e.target.value)}><option value="">{text.selectWorkOption}</option>{rows?.map((row) => <option key={row.id} value={row.id}>{locale === 'es' ? row.nameEs : row.nameEn}</option>)}</select></label>;
  }
  return <div className="admin-shell"><a className="skip-link" href="#main">{text.skip}</a><aside className="sidebar"><Brand compact /><nav><a className="active" href={`/${locale}?event=${encodeURIComponent(contextKey)}&tab=works`} onClick={(event) => { event.preventDefault(); returnToList(); }}>{text.myWorks}</a><a href={publicUrl}>{text.publicPortal}</a></nav><div className="sidebar-bottom"><button onClick={logout} disabled={busy}>{text.logout}</button></div></aside>
    <div className="admin-area"><header className="admin-topbar"><strong>{text.authorSpace}</strong><div className="topbar-right"><span>{person.name}</span><div className="language-switch"><a href={`/es?event=${encodeURIComponent(contextKey)}&tab=works`}>ES</a><a href={`/en?event=${encodeURIComponent(contextKey)}&tab=works`}>EN</a></div></div></header>
    <main id="main" className="admin-main"><div className="admin-heading"><div><span className="eyebrow">{locale === 'es' ? workspace.event.nameEs : workspace.event.nameEn}</span><h1>{text.myWorks}</h1><p>{text.worksHelp}</p></div><div className="editor-actions">{(work || creating) && <button className="button button-outline" disabled={busy} onClick={returnToList}>{text.backToWorks}</button>}<button className="button button-outline" disabled={busy} onClick={reload}>{text.reloadWorks}</button><button className="button button-primary" disabled={busy || !workspace.editable || workspace.works.length >= 50} onClick={toggleCreate}>{text.newWork}</button></div></div>
      {notice && <div className={`notice ${notice.error ? 'notice-error' : ''}`} role={notice.error ? 'alert' : 'status'}>{notice.message}</div>}
      {!workspace.editable && <div className="notice notice-muted">{workspace.reason === 'no_call' ? text.worksNoCall : workspace.reason === 'closed' ? text.worksClosed : text.worksInactive}</div>}
      {creating && workspace.call && <section className="panel form-panel"><h2>{text.newWork}</h2><form className="form-fields" onSubmit={(e) => { e.preventDefault(); void create(); }}>
        <label className="field"><span>{text.workTitle}</span><input required minLength={3} maxLength={300} value={newWork.title} disabled={busy} onChange={(e) => setNewWork({ ...newWork, title: e.target.value })} /></label>
        {choices('trackId', newWork.trackId, (value) => setNewWork({ ...newWork, trackId: value }))}{choices('contributionTypeId', newWork.contributionTypeId, (value) => setNewWork({ ...newWork, contributionTypeId: value }))}
        <label className="field"><span>{text.workLanguage}</span><select value={newWork.language} disabled={busy} onChange={(e) => setNewWork({ ...newWork, language: e.target.value as Locale })}>{workspace.languages.map((language) => <option key={language} value={language}>{language === 'es' ? text.languageSpanish : text.languageEnglish}</option>)}</select></label>
        <button className="button button-primary" disabled={busy || !workspace.editable} type="submit">{text.createWork}</button>
      </form></section>}
      <section id="work-list" className="panel form-panel"><h2>{text.workDrafts}</h2>{!workspace.works.length && <p className="muted">{text.noWorks}</p>}{workspace.works.map((row) => <div className="panel-heading" key={row.id}><div><strong>{row.title}</strong><p>{text.status}: {text.draft} · {text.revision} {row.revision}</p></div><div className="editor-actions"><button className="button button-outline" disabled={busy} onClick={() => open(row.id)}>{text.viewWork}</button>{workspace.editable && <button className="button button-outline" disabled={busy} onClick={() => open(row.id, true)}>{text.editWorkAction}</button>}</div></div>)}</section>
      {work && <section className="panel form-panel"><div className="panel-heading"><h2>{editing ? text.editWork : text.workDetails}</h2><button className="button button-outline" disabled={busy} onClick={returnToList}>{text.backToWorks}</button>{editing ? <span>{dirty ? text.unsaved : text.upToDate}</span> : <button className="button button-primary" disabled={busy || !workspace.editable} onClick={() => setEditing(true)}>{text.editWorkAction}</button>}</div>
        <p className="muted small">{text.workPinnedRules} {work.call.revision}</p>{callChanged && <p className="notice notice-muted">{text.workCallChanged}</p>}
        {!editing ? <div className="form-fields">
          <h3>{work.title}</h3><dl><dt>{text.scientificTracks}</dt><dd>{work.call.content.tracks.find((track) => track.id === work.trackId)?.[locale === 'es' ? 'nameEs' : 'nameEn']}</dd>
          <dt>{text.contributionTypes}</dt><dd>{type?.[locale === 'es' ? 'nameEs' : 'nameEn']}</dd><dt>{text.workLanguage}</dt><dd>{work.language === 'es' ? text.languageSpanish : text.languageEnglish}</dd></dl>
          <div><h3>{text.workAbstract}</h3><p style={{ whiteSpace: 'pre-wrap' }}>{work.abstract || text.workIncomplete}</p></div>
          <div><h3>{text.callKeywords}</h3>{work.keywords.length ? <ul>{work.keywords.map((keyword) => <li key={keyword}>{keyword}</li>)}</ul> : <p className="muted">{text.workIncomplete}</p>}</div>
          <p className="muted small">{text.draft} · {text.revision} {work.revision}</p>
        </div> : <form className="form-fields" onSubmit={(e) => { e.preventDefault(); void save(); }}>
          <label className="field"><span>{text.workTitle}</span><input required minLength={3} maxLength={300} value={work.title} disabled={busy || !workspace.editable} onChange={(e) => setWork({ ...work, title: e.target.value })} /></label>
          {choices('trackId', work.trackId, (value) => setWork({ ...work, trackId: value }), true)}{choices('contributionTypeId', work.contributionTypeId, (value) => setWork({ ...work, contributionTypeId: value }), true)}
          <label className="field"><span>{text.workLanguage}</span><select value={work.language} disabled={busy || !workspace.editable} onChange={(e) => setWork({ ...work, language: e.target.value as Locale })}>{!workspace.languages.includes(work.language) && <option value={work.language} disabled>{work.language}</option>}{workspace.languages.map((language) => <option key={language} value={language}>{language === 'es' ? text.languageSpanish : text.languageEnglish}</option>)}</select></label>
          <label className="field"><span>{text.workAbstract}</span><textarea rows={10} maxLength={50000} value={work.abstract} disabled={busy || !workspace.editable} onChange={(e) => setWork({ ...work, abstract: e.target.value })} /></label>
          {type && <p className="muted small">{text.workWordCount}: {words} · {text.workExpected}: {type.abstractMinWords}–{type.abstractMaxWords}</p>}
          <label className="field"><span>{text.workKeywords}</span><textarea rows={4} value={keywords} maxLength={1700} disabled={busy || !workspace.editable} onChange={(e) => setKeywords(e.target.value)} /></label>
          {type && <p className="muted small">{text.workExpected}: {type.keywordsMin}–{type.keywordsMax} {text.callKeywords.toLowerCase()}{type.manuscriptRequired ? ` · ${text.callManuscript} ${type.maxPages}` : ''}</p>}
          <p className="notice notice-muted">{text.workDraftOnly}</p><div className="editor-actions"><button className="button button-primary" type="submit" disabled={busy || !workspace.editable || !dirty}>{busy ? text.saving : text.saveDraft}</button><button className="button button-outline" type="button" disabled={busy} onClick={cancelEditing}>{text.cancel}</button><button className="button button-outline" type="button" disabled={busy} onClick={returnToList}>{text.backToWorks}</button></div>
        </form>}
      </section>}
    </main></div></div>;
}
