'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { EventConfiguration, EventLifecycle } from '@sep/contracts';
import { webCopy, type Locale } from '@sep/i18n';

const nextStates: Record<EventLifecycle, EventLifecycle[]> = {
  planning: ['scheduled', 'cancelled'], scheduled: ['planning', 'ongoing', 'cancelled'],
  ongoing: ['completed', 'cancelled'], completed: [], cancelled: ['planning'],
};
export default function Configuration({ initial, locale, eventId, contextKey, canEdit, archived, onSaved, onStatusChange }: {
  initial: EventConfiguration; locale: Locale; eventId: string; contextKey: string; canEdit: boolean; archived: boolean;
  onSaved: (configuration: EventConfiguration) => void;
  onStatusChange: (status: { dirty: boolean; busy: boolean }) => void;
}) {
  const text = webCopy[locale]; const router = useRouter();
  const [saved, setSaved] = useState(initial); const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false); const [notice, setNotice] = useState<{ error: boolean; message: string } | null>(null);
  const dirty = JSON.stringify(form) !== JSON.stringify(saved);
  useEffect(() => { onStatusChange({ dirty, busy }); }, [dirty, busy, onStatusChange]);
  const editable = canEdit && !archived && saved.lifecycle !== 'completed';
  async function send(path: string, method: string, body: unknown) {
    const response = await fetch(`/api/backend/events/${eventId}/${path}?event=${encodeURIComponent(contextKey)}&lang=${locale}`, {
      method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
    });
    const data = await response.json();
    if (response.status === 401) window.location.assign(`/${locale}?event=${encodeURIComponent(contextKey)}`);
    if (!response.ok) throw new Error(data.error?.message ?? text.serviceHelp);
    return data as EventConfiguration;
  }
  async function apply(path: string, body: unknown, message: string) {
    setBusy(true); setNotice(null);
    try { const next = await send(path, path === 'configuration' ? 'PUT' : 'POST', body); setSaved(next); setForm(next); onSaved(next); setNotice({ error: false, message }); router.refresh(); }
    catch (error) { setNotice({ error: true, message: error instanceof Error ? error.message : text.serviceHelp }); }
    finally { setBusy(false); }
  }
  const stateLabels = { planning: text.lifecyclePlanning, scheduled: text.lifecycleScheduled, ongoing: text.lifecycleOngoing, completed: text.lifecycleCompleted, cancelled: text.lifecycleCancelled };
  const actionLabels = { planning: text.returnToPlanning, scheduled: text.scheduleEvent, ongoing: text.startEvent, completed: text.completeEvent, cancelled: text.cancelEvent };
  return <section style={{ marginTop: '2rem' }}>
    <h2>{text.configurationTitle}</h2><p className="muted small">{text.configurationHelp}</p>
    {notice && <div className={`notice ${notice.error ? 'notice-error' : ''}`} role={notice.error ? 'alert' : 'status'}>{notice.message}</div>}
    <form className="form-fields" onSubmit={(event) => { event.preventDefault(); void apply('configuration', { timezone: form.timezone, startDate: form.startDate, endDate: form.endDate, modality: form.modality, languages: form.languages, defaultLanguage: form.defaultLanguage, revision: saved.revision }, text.configurationSaved); }}>
      <div className="field-row"><label className="field"><span>{text.startDate}</span><input type="date" min="1900-01-01" max="9999-12-31" value={form.startDate ?? ''} disabled={!editable || busy} onChange={(event) => setForm({ ...form, startDate: event.target.value || null })} /></label>
        <label className="field"><span>{text.endDate}</span><input type="date" min={form.startDate ?? '1900-01-01'} max="9999-12-31" value={form.endDate ?? ''} disabled={!editable || busy} onChange={(event) => setForm({ ...form, endDate: event.target.value || null })} /></label></div>
      <label className="field"><span>{text.timezone}</span><input required maxLength={100} value={form.timezone} disabled={!editable || busy} onChange={(event) => setForm({ ...form, timezone: event.target.value })} /></label>
      <label className="field"><span>{text.modality}</span><select value={form.modality} disabled={!editable || busy} onChange={(event) => setForm({ ...form, modality: event.target.value as EventConfiguration['modality'] })}><option value="in_person">{text.modalityInPerson}</option><option value="virtual">{text.modalityVirtual}</option><option value="hybrid">{text.modalityHybrid}</option></select></label>
      <fieldset disabled={!editable || busy}><legend>{text.eventLanguages}</legend>{(['es', 'en'] as const).map((language) => <label key={language} style={{ display: 'block', margin: '.5rem 0' }}><input type="checkbox" checked={form.languages.includes(language)} onChange={(event) => {
        const languages = event.target.checked ? [...form.languages, language] : form.languages.filter((item) => item !== language);
        setForm({ ...form, languages, defaultLanguage: languages.includes(form.defaultLanguage) ? form.defaultLanguage : languages[0] ?? 'es' });
      }} /> {language === 'es' ? text.languageSpanish : text.languageEnglish}</label>)}</fieldset>
      <label className="field"><span>{text.defaultEventLanguage}</span><select value={form.defaultLanguage} disabled={!editable || busy || !form.languages.length} onChange={(event) => setForm({ ...form, defaultLanguage: event.target.value as 'es' | 'en' })}>{form.languages.map((language) => <option value={language} key={language}>{language === 'es' ? text.languageSpanish : text.languageEnglish}</option>)}</select></label>
      <p className="muted small">{text.eventLanguagesHelp}</p>
      <button type="submit" className="button button-primary" disabled={!editable || busy || !dirty || !form.languages.length || (form.startDate === null) !== (form.endDate === null)}>{busy ? text.saving : text.saveConfiguration}</button>
    </form>
    <h2 style={{ marginTop: '2rem' }}>{text.lifecycleTitle}</h2><p><strong>{stateLabels[saved.lifecycle]}</strong></p><p className="muted small">{text.lifecycleHelp}</p>
    {saved.lifecycle === 'completed' && <p className="notice notice-muted">{text.completedReadOnly}</p>}
    {dirty && <p className="muted small">{text.saveBeforeLifecycle}</p>}
    <div className="editor-actions">{nextStates[saved.lifecycle].map((state) => <button key={state} className="button button-outline" disabled={!canEdit || archived || busy || dirty || state === 'scheduled' && !saved.startDate} onClick={() => {
      if ((state === 'cancelled' || state === 'completed') && !window.confirm(state === 'completed' ? text.confirmComplete : text.confirmCancel)) return;
      void apply('lifecycle', { lifecycle: state, revision: saved.revision }, text.lifecycleSaved);
    }}>{actionLabels[state]}</button>)}</div>
  </section>;
}
