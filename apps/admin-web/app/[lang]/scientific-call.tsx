'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ContributionType, ScientificCallDraft } from '@sep/contracts';
import { webCopy, type Locale } from '@sep/i18n';

export default function ScientificCall({ initial, locale, contextKey, eventId, editable, canWithdraw, publicUrl }: {
  initial: ScientificCallDraft; locale: Locale; contextKey: string; eventId: string; editable: boolean; canWithdraw: boolean; publicUrl: string;
}) {
  const text = webCopy[locale]; const router = useRouter();
  const [saved, setSaved] = useState(initial); const [content, setContent] = useState(initial.content);
  const [busy, setBusy] = useState(false); const [notice, setNotice] = useState<{ error: boolean; message: string } | null>(null);
  const dirty = JSON.stringify(content) !== JSON.stringify(saved.content);
  async function run(action: 'save' | 'publish' | 'withdraw') {
    if (action === 'withdraw' && !window.confirm(text.callWithdrawConfirm)) return;
    setBusy(true); setNotice(null);
    try {
      const path = `events/${eventId}/call${action === 'save' ? '' : `/${action}`}`;
      const response = await fetch(`/api/backend/${path}?event=${encodeURIComponent(contextKey)}&lang=${locale}`, {
        method: action === 'save' ? 'PUT' : 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify(action === 'save' ? { revision: saved.revision, content } : { revision: action === 'withdraw' ? saved.publishedRevision : saved.revision }),
      });
      const data = await response.json();
      if (response.status === 401) window.location.assign(`/${locale}?event=${encodeURIComponent(contextKey)}`);
      if (!response.ok) throw new Error(data.error?.message ?? text.serviceHelp);
      const next = data as ScientificCallDraft; setSaved(next);
      // Withdrawal does not discard an unsaved editorial draft in this browser.
      if (action !== 'withdraw') setContent(next.content);
      setNotice({ error: false, message: action === 'save' ? text.callSaved : action === 'publish' ? text.callPublished : text.callWithdrawn }); router.refresh();
    } catch (error) { setNotice({ error: true, message: error instanceof Error ? error.message : text.serviceHelp }); }
    finally { setBusy(false); }
  }
  function typeChange(id: string, change: Partial<ContributionType>) { setContent({ ...content, contributionTypes: content.contributionTypes.map((type) => type.id === id ? { ...type, ...change } : type) }); }
  function input(label: string, value: string, change: (value: string) => void, maxLength: number, multiline = false) {
    return <label className="field"><span>{label}</span>{multiline ? <textarea rows={5} maxLength={maxLength} value={value} onChange={(e) => change(e.target.value)} disabled={!editable || busy} /> : <input maxLength={maxLength} value={value} onChange={(e) => change(e.target.value)} disabled={!editable || busy} />}</label>;
  }
  return <>
    {notice && <div className={`notice ${notice.error ? 'notice-error' : ''}`} role={notice.error ? 'alert' : 'status'}>{notice.message}</div>}
    <div className="editor-toolbar"><div><strong>{dirty ? text.unsaved : saved.publishedRevision === saved.revision && saved.revision > 0 ? text.callCurrentPublication : text.callPendingPublication}</strong><p className="muted small">{text.callPublicationHelp}</p></div>
      <div className="editor-actions"><button className="button button-outline" disabled={!editable || busy || !dirty} onClick={() => run('save')}>{busy ? text.saving : text.saveDraft}</button><button className="button button-primary" disabled={!editable || busy || dirty || saved.revision === 0} onClick={() => run('publish')}>{text.publishCall}</button>{saved.publication && <button className="button button-outline" disabled={!canWithdraw || busy} onClick={() => run('withdraw')}>{text.withdrawCall}</button>}</div></div>
    {!editable && <p className="notice notice-muted">{text.callReadOnly}</p>}
    <section className="panel form-panel"><h2>{text.callGeneral}</h2><div className="form-fields">
      <div className="field-row">{input(text.callTitleEs, content.titleEs, (value) => setContent({ ...content, titleEs: value }), 200)}{input(text.callTitleEn, content.titleEn, (value) => setContent({ ...content, titleEn: value }), 200)}</div>
      {input(text.callInstructionsEs, content.instructionsEs, (value) => setContent({ ...content, instructionsEs: value }), 6000, true)}
      {input(text.callInstructionsEn, content.instructionsEn, (value) => setContent({ ...content, instructionsEn: value }), 6000, true)}
      <div className="field-row"><label className="field"><span>{text.callOpens}</span><input type="date" min="1900-01-01" max="9999-12-31" value={content.opensOn ?? ''} disabled={!editable || busy} onChange={(e) => setContent({ ...content, opensOn: e.target.value || null })} /></label>
      <label className="field"><span>{text.callCloses}</span><input type="date" min={content.opensOn ?? '1900-01-01'} max="9999-12-31" value={content.closesOn ?? ''} disabled={!editable || busy} onChange={(e) => setContent({ ...content, closesOn: e.target.value || null })} /></label></div>
      <p className="muted small">{text.callDateHelp} <strong>{saved.timezone}</strong></p>
    </div></section>
    <section className="panel form-panel"><div className="panel-heading"><h2>{text.scientificTracks}</h2><button className="button button-outline" disabled={!editable || busy || content.tracks.length >= 50} onClick={() => setContent({ ...content, tracks: [...content.tracks, { id: crypto.randomUUID(), nameEs: '', nameEn: '' }] })}>{text.addTrack}</button></div>
      {!content.tracks.length && <p className="muted">{text.noTracks}</p>}
      {content.tracks.map((track) => <div className="form-fields" key={track.id} style={{ marginBottom: '1.5rem' }}><div className="field-row">
        {input(text.nameEs, track.nameEs, (value) => setContent({ ...content, tracks: content.tracks.map((t) => t.id === track.id ? { ...t, nameEs: value } : t) }), 150)}
        {input(text.nameEn, track.nameEn, (value) => setContent({ ...content, tracks: content.tracks.map((t) => t.id === track.id ? { ...t, nameEn: value } : t) }), 150)}</div>
        <button className="button button-outline" disabled={!editable || busy} onClick={() => setContent({ ...content, tracks: content.tracks.filter((t) => t.id !== track.id) })}>{text.removeTrack}</button></div>)}
    </section>
    <section className="panel form-panel"><div className="panel-heading"><h2>{text.contributionTypes}</h2><button className="button button-outline" disabled={!editable || busy || content.contributionTypes.length >= 20} onClick={() => setContent({ ...content, contributionTypes: [...content.contributionTypes, { id: crypto.randomUUID(), nameEs: '', nameEn: '', abstractMinWords: 150, abstractMaxWords: 300, keywordsMin: 3, keywordsMax: 5, manuscriptRequired: false, maxPages: null }] })}>{text.addContributionType}</button></div>
      {!content.contributionTypes.length && <p className="muted">{text.noContributionTypes}</p>}
      {content.contributionTypes.map((type) => <article className="panel form-panel" key={type.id} style={{ marginBottom: '1rem' }}><div className="form-fields"><div className="field-row">
        {input(text.nameEs, type.nameEs, (value) => typeChange(type.id, { nameEs: value }), 150)}{input(text.nameEn, type.nameEn, (value) => typeChange(type.id, { nameEn: value }), 150)}</div>
        {(['abstractMinWords', 'abstractMaxWords', 'keywordsMin', 'keywordsMax'] as const).map((field) => <label className="field" key={field}><span>{text[field]}</span><input type="number" min={field.startsWith('abstract') ? 10 : 0} max={field.startsWith('abstract') ? 10000 : 20} step={1} value={type[field]} disabled={!editable || busy} onChange={(e) => typeChange(type.id, { [field]: Number(e.target.value) })} /></label>)}
        <label><input type="checkbox" checked={type.manuscriptRequired} disabled={!editable || busy} onChange={(e) => typeChange(type.id, { manuscriptRequired: e.target.checked, maxPages: e.target.checked ? 10 : null })} /> {text.manuscriptRequired}</label>
        {type.manuscriptRequired && <label className="field"><span>{text.maxManuscriptPages}</span><input type="number" min={1} max={500} value={type.maxPages ?? ''} disabled={!editable || busy} onChange={(e) => typeChange(type.id, { maxPages: Number(e.target.value) })} /></label>}
        <button className="button button-outline" disabled={!editable || busy} onClick={() => setContent({ ...content, contributionTypes: content.contributionTypes.filter((t) => t.id !== type.id) })}>{text.removeContributionType}</button>
      </div></article>)}
      <p className="muted small">{text.callNoSubmissions}</p>
    </section>
    {saved.publication && <section className="panel form-panel"><h2>{text.callCurrentPublication}</h2><p>{text.revision} {saved.publishedRevision} · {new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone: saved.publication.timezone }).format(new Date(saved.publication.publishedAt))}</p><p className="muted small">{text.callPublishedTimezone} {saved.publication.timezone}</p><a href={`${publicUrl}#convocatoria`} target="_blank" rel="noreferrer" className="button button-outline">{text.viewSite}</a></section>}
  </>;
}
