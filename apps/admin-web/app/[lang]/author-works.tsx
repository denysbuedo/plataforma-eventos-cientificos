'use client';
import AuthorshipNav from './authorship-nav';
import { useEffect, useRef, useState } from 'react';
import { MAX_MANUSCRIPT_BYTES, type AuthorWork, type AuthorWorkspace } from '@sep/contracts';
import { webCopy, type Locale } from '@sep/i18n';
import { Brand } from '@sep/ui';
import WorkAuthors, { accountAuthor, type AuthorAccount } from './work-authors';
import WorkFlow, { WorkContentView } from './work-flow';
import WorkSharing from './work-sharing';

export default function AuthorWorks({ initial, locale, contextKey, publicUrl, person }: {
  initial: AuthorWorkspace; locale: Locale; contextKey: string; publicUrl: string; person: AuthorAccount;
}) {
  const text = webCopy[locale]; const [workspace, setWorkspace] = useState(initial);
  const [saved, setSaved] = useState<AuthorWork | null>(null); const [work, setWork] = useState<AuthorWork | null>(null);
  const [keywords, setKeywords] = useState(''); const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [removeFile, setRemoveFile] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [closingPanel, setClosingPanel] = useState(false);
  const closeDialog = useRef<HTMLDialogElement>(null);
  const warnOnUnload = useRef(false);
  const [newWork, setNewWork] = useState({ title: '', trackId: '', contributionTypeId: '', language: initial.languages.includes(locale) ? locale : initial.languages[0] });
  const [busy, setBusy] = useState(false); const [notice, setNotice] = useState<{ error: boolean; message: string } | null>(null);
  const dirty = editing && !!work && (JSON.stringify(work) !== JSON.stringify(saved) || keywords !== (saved?.keywords.join('\n') ?? '') || !!pendingFile || removeFile);
  useEffect(() => { if (pendingAction) closeDialog.current?.showModal(); else closeDialog.current?.close(); }, [pendingAction]);
  useEffect(() => {
    warnOnUnload.current = dirty;
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { if (warnOnUnload.current) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  function guard(next: () => void, closing = false) { if (busy) return; if (dirty) { setClosingPanel(closing); setPendingAction(() => next); } else next(); }
  const type = work?.call.content.contributionTypes.find((t) => t.id === work.contributionTypeId);
  const words = work?.abstract.trim() ? work.abstract.trim().split(/\s+/u).length : 0;
  const callChanged = !!work && !!workspace.call && (workspace.call.revision !== work.call.revision || workspace.call.publishedAt !== work.call.publishedAt);
  const finalRound=work?.status==='final_requested'||work?.status==='changes_requested'&&work.versions[0]?.kind==='final';
  async function request<T>(suffix: string, method: string, body?: unknown): Promise<T> {
    const response = await fetch(`/api/backend/events/${workspace.event.id}/my-works${suffix}?event=${encodeURIComponent(contextKey)}&lang=${locale}`, {
      method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await response.json();
    if (response.status === 401) window.location.assign(`/${locale}?event=${encodeURIComponent(contextKey)}&tab=works`);
    if (!response.ok) throw new Error(data.error?.message ?? text.serviceHelp); return data as T;
  }
  function select(next: AuthorWork) { warnOnUnload.current = false; setSaved(next); setWork(next); setKeywords(next.keywords.join('\n')); setEditing(false); setPendingFile(null); setRemoveFile(false); }
  function startEdit(current = work) {
    if (!current?.editable) return;
    if (!current.authors.length && current.canManage!==false) setWork({ ...current, authors: [accountAuthor(person)] });
    setEditing(true);
  }
  function closePanel() {
    warnOnUnload.current = false;
    setWork(null); setSaved(null); setEditing(false); setCreating(false); setKeywords(''); setNotice(null); setPendingFile(null); setRemoveFile(false);
    document.getElementById('work-list')?.scrollIntoView({ block: 'start' });
    document.getElementById('work-list')?.focus({ preventScroll: true });
  }
  function returnToList() {
    guard(closePanel, true);
  }
  function toggleCreate() {
    guard(() => { closePanel(); setCreating(!creating); });
  }
  async function action(run: () => Promise<void>, message?: string) {
    setBusy(true); setNotice(null);
    try { await run(); if (message) setNotice({ error: false, message }); }
    catch (error) { setNotice({ error: true, message: error instanceof Error ? error.message : text.serviceHelp }); }
    finally { setBusy(false); }
  }
  async function open(id: string, startEditing = false) {
    guard(() => { void action(async () => { const savedWork = await request<AuthorWork>(`/${id}`, 'GET'); select(savedWork); if (startEditing && savedWork.editable) startEdit(savedWork); setCreating(false); }); });
  }
  async function create() {
    if (dirty && !window.confirm(text.discardWorkChanges)) return;
    await action(async () => {
      const next = await request<AuthorWork>('', 'POST', newWork); select(next);
      setWorkspace({ ...workspace, works: [next, ...workspace.works] }); setCreating(false); setNewWork({ title: '', trackId: '', contributionTypeId: '', language: workspace.languages.includes(locale) ? locale : workspace.languages[0] });
    }, text.workCreated);
  }
  async function save(afterSave?: () => void) {
    if (!work || !editing || busy) return;
    const formElement = document.getElementById('work-edit-form') as HTMLFormElement | null;
    if (formElement && !formElement.checkValidity()) { setPendingAction(null); requestAnimationFrame(() => formElement.reportValidity()); return; }
    setBusy(true); setNotice(null);
    let fieldsSaved = false;
    try {
      let next = await request<AuthorWork>(`/${work.id}`, 'PUT', { title: work.title, abstract: work.abstract, language: work.language, ...(work.canManage===false?{}:{authors:work.authors}),
        trackId: work.trackId, contributionTypeId: work.contributionTypeId, keywords: keywords.split('\n').map((k) => k.trim()).filter(Boolean), revision: work.revision });
      // Preserve the committed revision if the subsequent file operation fails.
      setSaved(next); setWork(next); setKeywords(next.keywords.join('\n'));
      fieldsSaved = true;
      setWorkspace(current => ({ ...current, works: current.works.map(row => row.id === next.id ? next : row) }));
      if (pendingFile) {
        const form = new FormData(); form.set('revision', String(next.revision)); form.set('file', pendingFile);
        const response = await fetch(`/api/backend/events/${workspace.event.id}/my-works/${work.id}/manuscript?event=${encodeURIComponent(contextKey)}&lang=${locale}`, { method: 'POST', body: form });
        const data = await response.json(); if (!response.ok) throw new Error(data.error?.message ?? text.serviceHelp); next = data as AuthorWork;
      } else if (removeFile) next = await request<AuthorWork>(`/${work.id}/manuscript`, 'DELETE', { revision: next.revision });
      select(next); setWorkspace(current => ({ ...current, works: current.works.map(row => row.id === next.id ? next : row) }));
      setNotice({ error: false, message: text.workSaved }); setPendingAction(null); afterSave?.();
    } catch (error) { setPendingAction(null); setNotice({ error: true, message: `${fieldsSaved ? `${text.manuscriptSaveFailed} ` : ''}${error instanceof Error ? error.message : text.serviceHelp}` }); }
    finally { setBusy(false); }
  }
  async function reload() {
    guard(() => { void action(async () => { const next = await request<AuthorWorkspace>('', 'GET'); setWorkspace(next); if (work) select(await request<AuthorWork>(`/${work.id}`, 'GET')); }, text.worksReloaded); });
  }
  async function removeDraft(id:string) {
    guard(() => {
      if(!window.confirm(text.removeDraftConfirm))return;
      // Reload the revision after any save performed by the unsaved-changes dialog.
      void action(async()=>{
        const current = await request<AuthorWork>(`/${id}`, 'GET');
        await request(`/${id}`,'DELETE',{revision:current.revision});setWorkspace(current => ({...current,works:current.works.filter(row=>row.id!==id)}));
        if(work?.id===id) closePanel();
      },text.draftRemoved);
    });
  }
  async function logout() {
    guard(() => { void action(async () => { const response = await fetch(`/api/auth/logout?lang=${locale}`, { method: 'POST' }); if (!response.ok) throw new Error(text.serviceHelp); const data = await response.json(); window.location.assign(data.redirectTo ?? `/${locale}`); }); });
  }
  function choices(kind: 'trackId' | 'contributionTypeId', value: string, set: (value: string) => void, current = false) {
    const call = current ? work?.call : workspace.call; const rows = kind === 'trackId' ? call?.content.tracks : call?.content.contributionTypes;
    return <label className="field"><span>{kind === 'trackId' ? text.scientificTracks : text.contributionTypes}</span><select required value={value} disabled={busy || !(current ? work?.editable : workspace.editable) || current && finalRound} onChange={(e) => set(e.target.value)}><option value="">{text.selectWorkOption}</option>{rows?.map((row) => <option key={row.id} value={row.id}>{locale === 'es' ? row.nameEs : row.nameEn}</option>)}</select></label>;
  }
  return <div className="admin-shell"><a className="skip-link" href="#main">{text.skip}</a><aside className="sidebar"><Brand compact /><nav><a className="active" href={`/${locale}?event=${encodeURIComponent(contextKey)}&tab=works`} onClick={(event) => { event.preventDefault(); returnToList(); }}>{text.myWorks}</a><a href={`/${locale}?event=${encodeURIComponent(contextKey)}&tab=authorship`} onClick={event=>{event.preventDefault();guard(()=>window.location.assign(`/${locale}?event=${encodeURIComponent(contextKey)}&tab=authorship`));}}><AuthorshipNav eventId={workspace.event.id} contextKey={contextKey} locale={locale}/></a><a href={`/${locale}?event=${encodeURIComponent(contextKey)}&tab=profile`} onClick={event=>{event.preventDefault();guard(()=>window.location.assign(`/${locale}?event=${encodeURIComponent(contextKey)}&tab=profile`));}}>{text.myProfile}</a><a href={publicUrl} onClick={(event) => { event.preventDefault(); guard(() => window.location.assign(publicUrl)); }}>{text.publicPortal}</a></nav><div className="sidebar-bottom"><button onClick={logout} disabled={busy}>{text.logout}</button></div></aside>
    <div className="admin-area"><header className="admin-topbar"><strong>{text.authorSpace}</strong><div className="topbar-right"><span>{person.name}</span><div className="language-switch"><a href={`/es?event=${encodeURIComponent(contextKey)}&tab=works`} onClick={(event) => { event.preventDefault(); guard(() => window.location.assign(`/es?event=${encodeURIComponent(contextKey)}&tab=works`)); }}>ES</a><a href={`/en?event=${encodeURIComponent(contextKey)}&tab=works`} onClick={(event) => { event.preventDefault(); guard(() => window.location.assign(`/en?event=${encodeURIComponent(contextKey)}&tab=works`)); }}>EN</a></div></div></header>
    <main id="main" className="admin-main"><div className="admin-heading"><div><span className="eyebrow">{locale === 'es' ? workspace.event.nameEs : workspace.event.nameEn}</span><h1>{text.myWorks}</h1><p>{text.worksHelp}</p></div><div className="editor-actions">{creating && <button className="button button-outline" disabled={busy} onClick={returnToList}>{text.backToWorks}</button>}<button className="button button-outline" disabled={busy} onClick={reload}>{text.reloadWorks}</button><button className="button button-primary" disabled={busy || !workspace.editable || workspace.works.length >= 50} onClick={toggleCreate}>{text.newWork}</button></div></div>
      {notice && <div className={`notice ${notice.error ? 'notice-error' : ''}`} role={notice.error ? 'alert' : 'status'}>{notice.message}</div>}
      {workspace.requireSubmittingAuthorOrcid && <p className="notice notice-muted">{text.orcidEventRequired}</p>}
      {!workspace.editable && <div className="notice notice-muted">{workspace.reason === 'no_call' ? text.worksNoCall : workspace.reason === 'closed' ? text.worksClosed : text.worksInactive}</div>}
      {creating && workspace.call && <section className="panel form-panel"><h2>{text.newWork}</h2><form className="form-fields" onSubmit={(e) => { e.preventDefault(); void create(); }}>
        <label className="field"><span>{text.workTitle}</span><input required minLength={3} maxLength={300} value={newWork.title} disabled={busy} onChange={(e) => setNewWork({ ...newWork, title: e.target.value })} /></label>
        {choices('trackId', newWork.trackId, (value) => setNewWork({ ...newWork, trackId: value }))}{choices('contributionTypeId', newWork.contributionTypeId, (value) => setNewWork({ ...newWork, contributionTypeId: value }))}
        <label className="field"><span>{text.workLanguage}</span><select value={newWork.language} disabled={busy} onChange={(e) => setNewWork({ ...newWork, language: e.target.value as Locale })}>{workspace.languages.map((language) => <option key={language} value={language}>{language === 'es' ? text.languageSpanish : text.languageEnglish}</option>)}</select></label>
        <button className="button button-primary" disabled={busy || !workspace.editable} type="submit">{text.createWork}</button>
      </form></section>}
      <section id="work-list" className="panel form-panel" tabIndex={-1}><h2>{text.workDrafts}</h2>{!workspace.works.length && <p className="muted">{text.noWorks}</p>}{workspace.works.map((row) => <div className="panel-heading" key={row.id}><div><strong>{row.title}</strong><p>{text.status}: {text.workStatuses[row.status]}{row.canManage===false?` · ${text.sharedWithYou}`:''} · {text.revision} {row.revision}</p></div><div className="editor-actions"><button className="button button-outline" disabled={busy} onClick={() => open(row.id)}>{text.viewWork}</button>{row.editable && <button className="button button-outline" disabled={busy} onClick={() => open(row.id, true)}>{text.editWorkAction}</button>}{row.canManage!==false && row.status === 'draft' && !row.submittedAt && <button className="button button-outline" disabled={busy} onClick={() => removeDraft(row.id)}>{text.removeDraft}</button>}</div></div>)}</section>
      {work && <section className="panel form-panel work-detail"><div className="work-detail-header"><div><span className="eyebrow">{text.workStatuses[work.status]}</span><h2>{editing ? text.editWork : text.workDetails}</h2></div><div className="editor-actions">{editing ? <span className="draft-state">{dirty ? text.unsaved : text.upToDate}</span> : <button className="button button-outline" disabled={busy || !work.editable} aria-describedby={!work.editable?'work-edit-reason':undefined} onClick={() => startEdit()}>{text.editWorkAction}</button>}<button className="button button-outline" disabled={busy} onClick={returnToList}>{text.backToWorks}</button></div></div>
        {!work.editable && <p id="work-edit-reason" className="work-edit-notice">{['submitted','in_review','final_submitted'].includes(work.status)?text.workLockedSubmitted:work.status==='accepted'?text.workLockedAccepted:work.status==='rejected'?text.workLockedRejected:work.responseDeadline?text.workLockedDeadline:text.workLockedUnavailable}</p>}
        <p className="muted small">{text.workPinnedRules} {work.call.revision}</p>{callChanged && <p className="notice notice-muted">{text.workCallChanged}</p>}
        {!editing ? <div className="form-fields">
          <WorkContentView content={work} locale={locale} />{work.canManage===false&&<p className="notice notice-muted">{text.sharedEditorHelp}</p>}<WorkFlow key={`${work.id}:${work.revision}`} work={work} eventId={workspace.event.id} locale={locale} contextKey={contextKey} busy={busy} onBusyChange={setBusy} callChanged={callChanged} onUpdate={(next) => { select(next); setWorkspace({ ...workspace, works: workspace.works.map((row) => row.id === next.id ? next : row) }); setNotice({ error: false, message: text.workActionSaved }); }} />
          {work.canManage!==false&&<WorkSharing key={work.id} work={work} personId={person.id} eventId={workspace.event.id} locale={locale} contextKey={contextKey} busy={busy} onBusyChange={setBusy} onUpdate={next=>{select(next);setWorkspace(current=>({...current,works:current.works.map(row=>row.id===next.id?next:row)}));}}/>}
        </div> : <form id="work-edit-form" className="form-fields" onSubmit={(e) => { e.preventDefault(); void save(); }}>
          <label className="field"><span>{text.workTitle}</span><input required minLength={3} maxLength={300} value={work.title} disabled={busy || !work.editable} onChange={(e) => setWork({ ...work, title: e.target.value })} /></label>
          {choices('trackId', work.trackId, (value) => setWork({ ...work, trackId: value }), true)}{choices('contributionTypeId', work.contributionTypeId, (value) => setWork({ ...work, contributionTypeId: value }), true)}
          <label className="field"><span>{text.workLanguage}</span><select value={work.language} disabled={busy || !work.editable || finalRound} onChange={(e) => setWork({ ...work, language: e.target.value as Locale })}>{!workspace.languages.includes(work.language) && <option value={work.language} disabled>{work.language}</option>}{workspace.languages.map((language) => <option key={language} value={language}>{language === 'es' ? text.languageSpanish : text.languageEnglish}</option>)}</select></label>
          <label className="field"><span>{text.workAbstract}</span><textarea rows={10} maxLength={50000} value={work.abstract} disabled={busy || !work.editable} onChange={(e) => setWork({ ...work, abstract: e.target.value })} /></label>
          {type && <p className="muted small">{text.workWordCount}: {words} · {text.workExpected}: {type.abstractMinWords}–{type.abstractMaxWords}</p>}
          <label className="field"><span>{text.workKeywords}</span><textarea rows={4} value={keywords} maxLength={1700} disabled={busy || !work.editable} onChange={(e) => setKeywords(e.target.value)} /></label>
          {type && <p className="muted small">{text.workExpected}: {type.keywordsMin}–{type.keywordsMax} {text.callKeywords.toLowerCase()}{type.manuscriptRequired ? ` · ${text.callManuscript} ${type.maxPages}` : ''}</p>}
          <p className="muted small"><a href={`/${locale}?event=${encodeURIComponent(contextKey)}&tab=profile`} onClick={event=>{event.preventDefault();guard(()=>window.location.assign(`/${locale}?event=${encodeURIComponent(contextKey)}&tab=profile`));}}>{text.orcidProfileLink}</a></p>
          <WorkAuthors value={work.authors} onChange={(authors) => setWork({ ...work, authors })} locale={locale} editing={work.canManage!==false} disabled={busy || !work.editable} account={work.canManage===false?undefined:person} contextKey={contextKey} />
          <section aria-labelledby="work-file-heading">
            <h3 id="work-file-heading">{text.workManuscript}</h3>
            <p>{work.manuscript ? `${work.manuscript.name} · ${work.manuscript.pages} ${text.workPages}` : text.noManuscript}</p>
            <label className="field"><span>{text.uploadManuscript}</span><input type="file" accept="application/pdf,.pdf" disabled={busy || !work.editable} onChange={(event) => {
              const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
              if (file.size > MAX_MANUSCRIPT_BYTES) { setNotice({ error: true, message: text.workFileLimit }); return; }
              setPendingFile(file); setRemoveFile(false); setNotice(null);
            }} /><small>{text.workFileHelp}</small></label>
            {pendingFile && <p role="status">{text.pendingManuscript} {pendingFile.name}</p>}
            {removeFile && <p role="status">{text.manuscriptWillRemove}</p>}
            <p className="muted small">{text.manuscriptSaveHelp}</p>
            {(pendingFile || removeFile) && <button className="button button-outline" type="button" disabled={busy} onClick={() => { setPendingFile(null); setRemoveFile(false); }}>{text.undoManuscriptChange}</button>}
            {work.manuscript && !removeFile && <button className="button button-outline" type="button" disabled={busy} onClick={() => { setRemoveFile(true); setPendingFile(null); }}>{text.removeManuscript}</button>}
          </section>
          <p className="notice notice-muted">{text.workDraftOnly}</p><div className="editor-actions"><button className="button button-primary" type="submit" disabled={busy || !work.editable || !dirty}>{busy ? text.saving : text.saveWorkChanges}</button><button className="button button-outline" type="button" disabled={busy} onClick={returnToList}>{text.backToWorks}</button></div>
        </form>}
      </section>}
    </main></div>
    <dialog ref={closeDialog} aria-labelledby="work-unsaved-title" aria-describedby="work-unsaved-help" onCancel={(event) => { event.preventDefault(); if (!busy) setPendingAction(null); }} style={{ maxWidth: '34rem', width: 'calc(100% - 2rem)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid #cbd5e1' }}>
      <h2 id="work-unsaved-title">{text.workUnsavedTitle}</h2><p id="work-unsaved-help">{text.workUnsavedHelp}</p>
      <div className="editor-actions">
        <button className="button button-primary" disabled={busy} onClick={() => { if (pendingAction) void save(pendingAction); }}>{busy ? text.saving : closingPanel ? text.saveAndClose : text.saveAndContinue}</button>
        <button className="button button-outline" disabled={busy} onClick={() => { const next = pendingAction; setPendingAction(null); if (saved) select(saved); next?.(); }}>{text.discardChanges}</button>
        <button className="button button-outline" autoFocus disabled={busy} onClick={() => setPendingAction(null)}>{text.keepEditing}</button>
      </div>
    </dialog></div>;
}
