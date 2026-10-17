'use client';
import ParticipantShell from './participant-shell';
import { useEffect, useRef, useState } from 'react';
import { MAX_MANUSCRIPT_BYTES, type WorkNoticeBoard, type AuthorWork, type AuthorWorkspace } from '@sep/contracts';
import { webCopy, type Locale } from '@sep/i18n';
import { Icon } from '@sep/ui';
import WorkAuthors, { accountAuthor, type AuthorAccount } from './work-authors';
import WorkFlow, { WorkContentView } from './work-flow';
import WorkFeedback from './work-feedback';
import WorkSendDialog from './work-send-dialog';
import {feedbackCopy} from './work-feedback-copy';
import WorkSharing from './work-sharing';

export default function AuthorWorks({ initial, locale, contextKey, publicUrl, person }: {
  initial: AuthorWorkspace; locale: Locale; contextKey: string; publicUrl: string; person: AuthorAccount;
}) {
  const text = webCopy[locale], feedback=feedbackCopy[locale]; const [workspace, setWorkspace] = useState(initial);
  const [saved, setSaved] = useState<AuthorWork | null>(null); const [work, setWork] = useState<AuthorWork | null>(null);
  const [keywords, setKeywords] = useState(''); const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);const [preparing,setPreparing]=useState(false);
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
  async function open(id: string, startEditing = false, focusFeedback=false) {
    guard(() => { void action(async () => { const savedWork = await request<AuthorWork>(`/${id}`, 'GET'); select(savedWork); if (startEditing && savedWork.editable) startEdit(savedWork); setCreating(false);if(!focusFeedback)requestAnimationFrame(()=>document.getElementById('work-detail')?.scrollIntoView({block:'start'}));if(focusFeedback)requestAnimationFrame(()=>document.getElementById('work-feedback')?.scrollIntoView({block:'start'})); }); });
  }
  async function markNoticesRead():Promise<boolean>{if(!work?.noticeIds?.length)return true;try{const board=await request<WorkNoticeBoard>(`/${work.id}/notices/read`,'POST',{noticeIds:work.noticeIds});setWorkspace(current=>({...current,works:current.works.map(row=>({...row,unreadNotices:board.items.find(item=>item.workId===row.id)?.unreadNotices??0}))}));window.dispatchEvent(new CustomEvent('sep:work-notices',{detail:{eventId:workspace.event.id,count:board.count}}));return true;}catch{return false;}}
  async function create() {
    if (dirty && !window.confirm(text.discardWorkChanges)) return;
    await action(async () => {
      const next = await request<AuthorWork>('', 'POST', newWork); select(next);
      setWorkspace({ ...workspace, works: [next, ...workspace.works] }); setCreating(false); setNewWork({ title: '', trackId: '', contributionTypeId: '', language: workspace.languages.includes(locale) ? locale : workspace.languages[0] });
    }, text.workCreated);
  }
  async function save(afterSave?: () => void, keepEditing=false) {
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
      if(keepEditing)setEditing(true);setNotice({ error: false, message: text.workSaved }); setPendingAction(null); afterSave?.();
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
  function choices(kind: 'trackId' | 'contributionTypeId', value: string, set: (value: string) => void, current = false) {
    const call = current ? work?.call : workspace.call; const rows = kind === 'trackId' ? call?.content.tracks : call?.content.contributionTypes;
    return <label className="field"><span>{kind === 'trackId' ? text.scientificTracks : text.contributionTypes}</span><select required value={value} disabled={busy || !(current ? work?.editable : workspace.editable) || current && finalRound} onChange={(e) => set(e.target.value)}><option value="">{text.selectWorkOption}</option>{rows?.map((row) => <option key={row.id} value={row.id}>{locale === 'es' ? row.nameEs : row.nameEn}</option>)}</select></label>;
  }
  return <ParticipantShell person={person} locale={locale} contextKey={contextKey} eventId={workspace.event.id} tab="works" publicUrl={publicUrl} busy={busy} onNavigate={guard} onCurrentWorks={returnToList}>
    <div className="admin-heading"><div><span className="eyebrow">{locale === 'es' ? workspace.event.nameEs : workspace.event.nameEn}</span><h1>{text.myWorks}</h1><p>{text.worksHelp}</p></div><div className="editor-actions">{creating && <button className="button button-outline" disabled={busy} onClick={returnToList}>{text.backToWorks}</button>}<button className="button button-outline" disabled={busy} onClick={reload}>{text.reloadWorks}</button><button className="button button-primary" disabled={busy || !workspace.editable || workspace.works.length >= 50} onClick={toggleCreate}>{text.newWork}</button></div></div>
      {notice && <div className={`notice ${notice.error ? 'notice-error' : ''}`} role={notice.error ? 'alert' : 'status'}>{notice.message}</div>}
      {workspace.requireSubmittingAuthorOrcid && <p className="notice notice-muted">{text.orcidEventRequired}</p>}
      {!workspace.editable && <div className="notice notice-muted">{workspace.reason === 'no_call' ? text.worksNoCall : workspace.reason === 'closed' ? text.worksClosed : text.worksInactive}</div>}
      {creating && workspace.call && <section className="panel form-panel"><h2>{text.newWork}</h2><form className="form-fields" onSubmit={(e) => { e.preventDefault(); void create(); }}>
        <label className="field"><span>{text.workTitle}</span><input required minLength={3} maxLength={300} value={newWork.title} disabled={busy} onChange={(e) => setNewWork({ ...newWork, title: e.target.value })} /></label>
        {choices('trackId', newWork.trackId, (value) => setNewWork({ ...newWork, trackId: value }))}{choices('contributionTypeId', newWork.contributionTypeId, (value) => setNewWork({ ...newWork, contributionTypeId: value }))}
        <label className="field"><span>{text.workLanguage}</span><select value={newWork.language} disabled={busy} onChange={(e) => setNewWork({ ...newWork, language: e.target.value as Locale })}>{workspace.languages.map((language) => <option key={language} value={language}>{language === 'es' ? text.languageSpanish : text.languageEnglish}</option>)}</select></label>
        <button className="button button-primary" disabled={busy || !workspace.editable} type="submit">{text.createWork}</button>
      </form></section>}
      {workspace.works.some(row=>row.unreadNotices)&&<section className="work-news-banner" aria-label={feedback.news}><div><h2>{workspace.works.filter(row=>row.unreadNotices).length===1?feedback.one:feedback.many.replace('{count}',String(workspace.works.filter(row=>row.unreadNotices).length))}</h2><p>{feedback.newsHelp}</p></div><ul>{workspace.works.filter(row=>row.unreadNotices).map(row=><li key={row.id}><div><strong>{row.title}</strong><span>{text.workStatuses[row.status]}</span></div><button type="button" className="button button-outline" disabled={busy} onClick={()=>{void open(row.id,false,true);}}>{feedback.read}</button></li>)}</ul></section>}
      <section id="work-list" className="panel form-panel participant-work-list" aria-label={text.myWorks} tabIndex={-1}>{!workspace.works.length && <p className="muted">{text.noWorks}</p>}{workspace.works.map((row) => <div className={`participant-work-row ${work?.id===row.id?'participant-work-selected':''}`} aria-current={work?.id===row.id?'true':undefined} key={row.id}><span className="profile-affiliation-icon"><Icon name="book" size={20}/></span><div className="participant-work-summary"><strong>{row.title}</strong><p><span className={`participant-work-status participant-work-status-${row.status}`}>{text.workStatuses[row.status]}</span>{!!row.unreadNotices&&<span className="work-news-badge">{feedback.news}</span>}{work?.id===row.id&&<span className="work-row-current">{locale==='es'?(editing?'En edición':'En consulta'):(editing?'Editing':'Viewing')}</span>}{row.canManage===false&&<span>{text.sharedWithYou}</span>}</p></div><div className="editor-actions"><button className="button button-outline" disabled={busy} onClick={() => open(row.id)}>{text.viewWork}</button>{row.editable && <button className="button button-outline" disabled={busy} onClick={() => open(row.id, true)}>{text.editWorkAction}</button>}{row.canManage!==false && row.status === 'draft' && !row.submittedAt && <button className="button button-outline" disabled={busy} onClick={() => removeDraft(row.id)}>{text.removeDraft}</button>}</div></div>)}</section>
      {work && <section id="work-detail" className="panel form-panel work-detail"><div className="work-detail-header"><div><span className="eyebrow">{text.workStatuses[work.status]}</span><h2 className="work-detail-title">{work.title}</h2><p className="work-detail-mode">{editing ? text.editWork : text.workDetails}</p></div><div className="editor-actions">{editing ? <span className="draft-state">{dirty ? text.unsaved : text.upToDate}</span> : <button className="button button-outline" disabled={busy || !work.editable} aria-describedby={!work.editable?'work-edit-reason':undefined} onClick={() => startEdit()}>{text.editWorkAction}</button>}<button className="button button-outline" disabled={busy} onClick={returnToList}>{text.backToWorks}</button></div></div>
        {!work.editable && <p id="work-edit-reason" className="work-edit-notice">{['submitted','in_review','final_submitted'].includes(work.status)?text.workLockedSubmitted:work.status==='accepted'?text.workLockedAccepted:work.status==='rejected'?text.workLockedRejected:work.responseDeadline?text.workLockedDeadline:text.workLockedUnavailable}</p>}
        <p className="muted small">{text.workPinnedRules} {work.call.revision}</p>{callChanged && <p className="notice notice-muted">{text.workCallChanged}</p>}
        {!editing ? <div className="form-fields">
          <WorkContentView content={work} locale={locale} showTitle={false} />{work.canManage===false&&<p className="notice notice-muted">{text.sharedEditorHelp}</p>}
          {work.canManage!==false&&<WorkSharing key={work.id} work={work} personId={person.id} eventId={workspace.event.id} locale={locale} contextKey={contextKey} busy={busy} onBusyChange={setBusy} onUpdate={next=>{select(next);setWorkspace(current=>({...current,works:current.works.map(row=>row.id===next.id?next:row)}));}}/>}
        </div> : <form id="work-edit-form" className="work-editor" onSubmit={(e) => { e.preventDefault(); void save(undefined,true); }}>
          <section className="work-editor-section"><h3>{feedback.details}</h3><label className="field"><span>{text.workTitle}</span><input required minLength={3} maxLength={300} value={work.title} disabled={busy || !work.editable} onChange={(e) => setWork({ ...work, title: e.target.value })} /></label>
          <div className="field-row work-classification-fields">{choices('trackId', work.trackId, (value) => setWork({ ...work, trackId: value }), true)}{choices('contributionTypeId', work.contributionTypeId, (value) => setWork({ ...work, contributionTypeId: value }), true)}
          <label className="field"><span>{text.workLanguage}</span><select value={work.language} disabled={busy || !work.editable || finalRound} onChange={(e) => setWork({ ...work, language: e.target.value as Locale })}>{!workspace.languages.includes(work.language) && <option value={work.language} disabled>{work.language}</option>}{workspace.languages.map((language) => <option key={language} value={language}>{language === 'es' ? text.languageSpanish : text.languageEnglish}</option>)}</select></label></div></section>
          <section className="work-editor-section"><h3>{feedback.content}</h3><label className="field"><span>{text.workAbstract}</span><textarea rows={10} maxLength={50000} value={work.abstract} disabled={busy || !work.editable} onChange={(e) => setWork({ ...work, abstract: e.target.value })} /></label>
          {type && <p className="muted small">{text.workWordCount}: {words} · {text.workExpected}: {type.abstractMinWords}–{type.abstractMaxWords}</p>}
          <label className="field"><span>{text.workKeywords}</span><textarea rows={4} value={keywords} maxLength={1700} disabled={busy || !work.editable} onChange={(e) => setKeywords(e.target.value)} /></label>
          {type && <p className="muted small">{text.workExpected}: {type.keywordsMin}–{type.keywordsMax} {text.callKeywords.toLowerCase()}{type.manuscriptRequired ? ` · ${text.callManuscript} ${type.maxPages}` : ''}</p>}
          </section><p className="profile-help"><a href={`/${locale}?event=${encodeURIComponent(contextKey)}&tab=profile`} onClick={event=>{event.preventDefault();guard(()=>window.location.assign(`/${locale}?event=${encodeURIComponent(contextKey)}&tab=profile`));}}>{text.orcidProfileLink}</a></p>
          <WorkAuthors value={work.authors} onChange={(authors) => setWork({ ...work, authors })} locale={locale} editing={work.canManage!==false} disabled={busy || !work.editable} account={work.canManage===false?undefined:person} contextKey={contextKey} />
          <section className="work-editor-section" aria-labelledby="work-file-heading">
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
          <div className="work-editor-footer"><p className="profile-help">{dirty?feedback.saveFirst:work.submissionReady===false?feedback.changeFirst:feedback.saveHelp}</p><div className="editor-actions"><button className="button button-primary" type="submit" disabled={busy || !work.editable || !dirty}>{busy ? text.saving : text.saveWorkChanges}</button><button className="button button-outline" type="button" disabled={busy||dirty||work.submissionReady===false||!work.editable||callChanged&&['draft','withdrawn'].includes(work.status)} onClick={()=>setPreparing(true)}>{feedback.prepare} {Math.max(0,...work.versions.map(item=>item.number))+1}</button><button className="button button-outline" type="button" disabled={busy} onClick={returnToList}>{text.cancel}</button></div></div>
        </form>}
        <WorkFlow key={`${work.id}:${work.revision}`} work={saved??work} eventId={workspace.event.id} locale={locale} contextKey={contextKey} busy={busy} onBusyChange={setBusy} callChanged={callChanged} editing={editing} feedback={<WorkFeedback work={saved??work} locale={locale} unread={!!workspace.works.find(row=>row.id===work.id)?.unreadNotices} onRead={markNoticesRead}/>} onEdit={()=>{startEdit();requestAnimationFrame(()=>document.getElementById('work-edit-form')?.scrollIntoView({block:'start'}));}} onUpdate={(next) => { select(next); setWorkspace({ ...workspace, works: workspace.works.map((row) => row.id === next.id ? next : row) }); setNotice({ error: false, message: text.workActionSaved }); }} />
        {preparing&&<WorkSendDialog work={saved??work} locale={locale} busy={busy} onClose={()=>setPreparing(false)} onSend={async()=>{setBusy(true);try{const next=await request<AuthorWork>(`/${work.id}/submit`,'POST',{revision:(saved??work).revision,confirmed:true});select(next);setPreparing(false);setWorkspace(current=>({...current,works:current.works.map(row=>row.id===next.id?next:row)}));setNotice({error:false,message:text.workActionSaved});}finally{setBusy(false);}}}/>}
      </section>}
    <dialog ref={closeDialog} aria-labelledby="work-unsaved-title" aria-describedby="work-unsaved-help" onCancel={(event) => { event.preventDefault(); if (!busy) setPendingAction(null); }} className="researcher-close-dialog">
      <h2 id="work-unsaved-title">{text.workUnsavedTitle}</h2><p id="work-unsaved-help">{text.workUnsavedHelp}</p>
      <div className="editor-actions">
        <button className="button button-primary" disabled={busy} onClick={() => { if (pendingAction) void save(pendingAction); }}>{busy ? text.saving : closingPanel ? text.saveAndClose : text.saveAndContinue}</button>
        <button className="button button-outline" disabled={busy} onClick={() => { const next = pendingAction; setPendingAction(null); if (saved) select(saved); next?.(); }}>{text.discardChanges}</button>
        <button className="button button-outline" autoFocus disabled={busy} onClick={() => setPendingAction(null)}>{text.keepEditing}</button>
      </div>
    </dialog></ParticipantShell>;
}
