'use client';
import { useEffect, useRef, useState } from 'react';
import type { AuthorshipCandidate, AuthorshipClaim, AuthorshipContribution, AuthorshipResponsibility, AuthorshipWorkspace } from '@sep/contracts';
import { webCopy, type Locale } from '@sep/i18n';
import { authorshipCopy, authorshipUi } from './authorship-copy';
const empty: AuthorshipWorkspace = { candidates: [], claims: [], contributions: [], responsibilities: [] };
type Section = 'pending' | 'contributions' | 'activity';
type Decision = { action: 'approve' | 'reject' | 'cancel' | 'revoke'; claim: AuthorshipClaim }
  | { action: 'disown'; contribution: AuthorshipContribution }
  | { action: 'request' | 'decline'; candidate: AuthorshipCandidate }
  | { action: 'accept_responsibility' | 'release_responsibility'; responsibility: AuthorshipResponsibility };
export default function Authorship({ eventId, contextKey, locale, staff = false }: { eventId: string; contextKey: string; locale: Locale; staff?: boolean }) {
  const text = authorshipCopy[locale], ui = authorshipUi[locale];
  const [data, setData] = useState(empty), [busy, setBusy] = useState(false), [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(''), [notice, setNotice] = useState(''), [section, setSection] = useState<Section>('pending');
  const [decision, setDecision] = useState<Decision | null>(null), [message, setMessage] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const receiptAttempts = useRef(new Set<string>());
  const base = `/api/backend/events/${eventId}/${staff ? 'authorship-review' : 'authorship'}`;
  const query = `?event=${encodeURIComponent(contextKey)}&lang=${locale}`;
  useEffect(() => {
    const controller = new AbortController(); setLoaded(false); setError('');
    void fetch(base + query, { signal: controller.signal, cache: 'no-store' }).then(async response => {
      const next = await response.json(); if (!response.ok) throw new Error(next.error?.message ?? text.error);
      if (!staff && !next.candidates.length && !next.claims.some((claim: AuthorshipClaim) => claim.status === 'pending') && next.claims.some((claim: AuthorshipClaim) => claim.unread)) setSection('activity');
      setData(next); setLoaded(true);
    }).catch(e => { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : text.error); });
    return () => controller.abort();
  }, [base, query, text.error, staff]);
  useEffect(() => {
    if (staff || !loaded || section === 'pending') return;
    const claims = data.claims.filter(claim => claim.unread && claim.status !== 'pending' &&
      (section === 'activity' || claim.status === 'approved' && data.contributions.some(item => item.workId === claim.workId && item.authorId === claim.authorId)))
      .map(({ id, revision }) => ({ id, revision }));
    if (!claims.length) return;
    const key = JSON.stringify([base, query, claims]);
    let mounted = true;
    function acknowledgeVisible() {
      if (document.visibilityState !== 'visible' || receiptAttempts.current.has(key)) return;
      receiptAttempts.current.add(key);
      // Keep the receipt in flight when the person returns to My works immediately.
      void fetch(base + '/read' + query, { method: 'POST', keepalive: true, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ claims }) }).then(async response => {
        const next = await response.json() as AuthorshipWorkspace & { error?: { message?: string } };
        if (!response.ok) throw new Error(next.error?.message ?? text.readError);
        if (mounted) setData(current => ({ ...current, claims: current.claims.map(claim => {
          const seen = claims.some(item => item.id === claim.id && item.revision === claim.revision);
          const saved = next.claims.some(item => item.id === claim.id && item.revision === claim.revision && !item.unread);
          return seen && saved ? { ...claim, unread: false } : claim;
        }) }));
      }).catch(() => { if (mounted) setError(text.readError); });
    }
    acknowledgeVisible();
    document.addEventListener('visibilitychange', acknowledgeVisible);
    return () => { mounted = false; document.removeEventListener('visibilitychange', acknowledgeVisible); };
  }, [base, query, data.claims, data.contributions, loaded, section, staff, text.readError]);
  useEffect(() => { if (decision) dialog.current?.showModal(); else dialog.current?.close(); }, [decision]);
  async function request(suffix = '', body?: unknown) {
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch(base + suffix + query, { method: body === undefined ? 'GET' : 'POST', headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
      const next = await response.json(); if (!response.ok) throw new Error(next.error?.message ?? text.error);
      setData(next); setLoaded(true); setDecision(null); setMessage(''); if (body !== undefined) setNotice(text.saved);
    } catch (e) { setError(e instanceof Error ? e.message : text.error); } finally { setBusy(false); }
  }
  function choose(next: Decision) { setMessage(''); setError(''); setDecision(next); }
  function confirm() {
    if (!decision) return;
    if ('candidate' in decision) void request('', { workId: decision.candidate.workId, authorId: decision.candidate.authorId, action: decision.action });
    else if ('contribution' in decision) void request('', { workId: decision.contribution.workId, authorId: decision.contribution.authorId, action: decision.action, message });
    else if ('responsibility' in decision) void request(`/works/${decision.responsibility.workId}/responsibility`, { action: decision.action, revision: decision.responsibility.revision });
    else void request(`/claims/${decision.claim.id}`, { action: decision.action, revision: decision.claim.revision, message });
  }
  const pending = data.claims.filter(claim => claim.status === 'pending');
  const toReview = pending.filter(claim => claim.canDecide);
  const waiting = pending.filter(claim => !claim.canDecide);
  const activity = data.claims.filter(claim => claim.status !== 'pending');
  const candidates = staff ? [] : data.candidates;
  const pendingCount = pending.length + candidates.length;
  const reasonRequired = !!decision && (['reject', 'revoke', 'disown'].includes(decision.action) || staff && decision.action === 'approve');
  const labels = { approve: ui.approve, reject: ui.reject, cancel: text.cancel, revoke: text.revoke, disown: text.withdraw, request: ui.requestTitle, decline: ui.declineTitle, accept_responsibility: ui.accept, release_responsibility: ui.release };
  const explanations = { approve: ui.approveHelp, reject: ui.rejectHelp, cancel: ui.cancelHelp, revoke: ui.revokeHelp, disown: ui.withdrawHelp, request: ui.requestHelp, decline: ui.declineHelp, accept_responsibility: ui.acceptHelp, release_responsibility: ui.releaseHelp };
  const date = (value: string) => new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(value));
  function claimCard(claim: AuthorshipClaim, review = false) {
    return <article className="authorship-item" key={claim.id}>
      <div className="authorship-item-heading"><div>{review && <p className="authorship-item-kicker">{ui.requestedBy} <strong>{claim.claimantName}</strong></p>}<h4>{claim.title || ui.privateTitle}</h4>{!claim.title && <p className="authorship-caption">{ui.privateHelp}</p>}</div>
        <div className="authorship-badges">{claim.unread && <span className="authorship-new">{ui.unread}</span>}<span className={`authorship-status authorship-status-${claim.status}`}>{claim.status === 'pending' && !review ? ui.waiting : text[claim.status]}</span></div>
      </div>
      {claim.status === 'pending' && !review && <p className="authorship-next-step">{claim.needsIndependentReview ? ui.independent : ui[claim.responsibility]}</p>}
      {claim.stale && <p className="notice notice-muted">{ui.stale}</p>}
      {claim.message && <p className="authorship-message">{claim.message}</p>}
      {review && <div className="editor-actions"><button className="button button-primary" disabled={busy || claim.stale} onClick={() => choose({ claim, action: 'approve' })}>{ui.approve}</button><button className="button button-outline" disabled={busy} onClick={() => choose({ claim, action: 'reject' })}>{ui.reject}</button></div>}
      <details className="authorship-details"><summary>{ui.details}</summary><dl className="authorship-facts"><div><dt>{ui.requestedBy}</dt><dd>{claim.claimantName}</dd></div><div><dt>{ui.declaredName}</dt><dd>{claim.fullName}</dd></div><div><dt>{ui.requestedOn}</dt><dd>{date(claim.createdAt)}</dd></div>{claim.decidedAt && <div><dt>{ui.decidedOn}</dt><dd>{date(claim.decidedAt)}</dd></div>}<div><dt>{ui.matchedBy}</dt><dd>{text[claim.basis]}</dd></div></dl>
        {(claim.canCancel || claim.canRevoke) && <div className="editor-actions"><button className="button button-outline" disabled={busy} onClick={() => choose({ claim, action: claim.canCancel ? 'cancel' : 'revoke' })}>{claim.canCancel ? text.cancel : text.revoke}</button></div>}
      </details>
    </article>;
  }
  return <section className="panel form-panel authorship-workspace" aria-label={staff ? text.review : text.title}>
    <header className="authorship-header"><div><h2>{staff ? text.review : text.title}</h2><p>{staff ? ui.reviewHelp : ui.help}</p></div><button className="button button-outline" disabled={busy} onClick={() => void request()}>{text.reload}</button></header>
    {error && !decision && <p className="notice notice-error" role="alert">{error}</p>}{notice && <p className="notice" role="status">{notice}</p>}
    {!loaded && !error && <p className="authorship-loading" role="status">{ui.loading}</p>}
    {loaded && <>
      <nav className="authorship-sections" aria-label={ui.sections}>
        <button type="button" aria-pressed={section === 'pending'} onClick={() => setSection('pending')}>{ui.pendingTab}<span>{pendingCount}</span></button>
        {!staff && <button type="button" aria-pressed={section === 'contributions'} onClick={() => setSection('contributions')}>{ui.contributionsTab}<span>{data.contributions.length}</span></button>}
        <button type="button" aria-pressed={section === 'activity'} onClick={() => setSection('activity')}>{ui.activityTab}{activity.some(claim => claim.unread) && <span className="authorship-new">{ui.unread}</span>}</button>
      </nav>
      <div className="authorship-section-content" aria-busy={busy}>
        {section === 'pending' && <>
          {!pendingCount && <div className="authorship-empty"><span className="authorship-empty-mark" aria-hidden="true">✓</span><h3>{ui.allClear}</h3><p>{ui.allClearHelp}</p>{!staff && data.contributions.length > 0 && <button className="button button-outline" onClick={() => setSection('contributions')}>{ui.contributionsTab}</button>}</div>}
          {candidates.length > 0 && <section className="authorship-group"><h3>{ui.confirmGroup}</h3><p className="authorship-group-help">{ui.confirmHelp}</p>{candidates.map(candidate => <article className="authorship-item" key={`${candidate.workId}:${candidate.authorId}`}><p className="authorship-item-kicker">{ui.candidate}</p><h4>{candidate.fullName}</h4><div className="editor-actions"><button className="button button-primary" disabled={busy} onClick={() => choose({ candidate, action: 'request' })}>{ui.yes}</button><button className="button button-outline" disabled={busy} onClick={() => choose({ candidate, action: 'decline' })}>{ui.no}</button></div></article>)}</section>}
          {toReview.length > 0 && <section className="authorship-group"><h3>{ui.reviewGroup}</h3><p className="authorship-group-help">{ui.reviewHelp}</p>{toReview.map(claim => claimCard(claim, true))}</section>}
          {waiting.length > 0 && <section className="authorship-group"><h3>{staff ? ui.staffWaiting : ui.waitingGroup}</h3><p className="authorship-group-help">{staff ? ui.staffWaitingHelp : ui.waitingHelp}</p>{waiting.map(claim => claimCard(claim))}</section>}
        </>}
        {section === 'contributions' && !staff && <><p className="authorship-group-help">{ui.contributionHelp}</p>{!data.contributions.length ? <div className="authorship-empty"><h3>{ui.noContributions}</h3><p>{ui.noContributionsHelp}</p></div> : <>{data.contributions.map(item => <article className="authorship-item" key={`${item.workId}:${item.authorId}`}><h4>{item.title}</h4><p className="authorship-caption">{ui.workStatus}: {webCopy[locale].workStatuses[item.status]}</p><details className="authorship-details"><summary>{ui.options}</summary><button className="button button-outline" disabled={busy} onClick={() => choose({ action: 'disown', contribution: item })}>{text.withdraw}</button></details></article>)}<p className="authorship-footnote">{ui.contributionNote}</p></>}</>}
        {section === 'activity' && <><div className="authorship-group-heading"><p className="authorship-group-help">{ui.activityHelp}</p>{!staff && activity.some(claim => claim.unread) && <button className="button button-outline" disabled={busy} onClick={() => void request('/read', { claims: activity.filter(claim => claim.unread).map(({id,revision}) => ({id,revision})) })}>{text.read}</button>}</div>{!activity.length && <div className="authorship-empty"><p>{ui.noActivity}</p></div>}{activity.map(claim => claimCard(claim))}</>}
      </div>
      {!staff && data.responsibilities.length > 0 && <details className="authorship-managers"><summary>{ui.managers}</summary><p className="authorship-group-help">{ui.managersHelp}</p>{data.responsibilities.map(item => <article className="authorship-item" key={item.workId}><h4>{item.title}</h4><p className="authorship-caption">{item.responsibility === 'submitter' ? ui.managedBySubmitter : ui.managedByCorresponding}</p>{(item.canAccept || item.canRelease) && <button className="button button-outline" disabled={busy} onClick={() => choose({ responsibility: item, action: item.canAccept ? 'accept_responsibility' : 'release_responsibility' })}>{item.canAccept ? ui.accept : ui.release}</button>}</article>)}</details>}
    </>}
    <dialog className="researcher-close-dialog authorship-dialog" ref={dialog} aria-labelledby={`authorship-decision-${staff ? 'staff' : 'author'}`} onCancel={event => { event.preventDefault(); if (!busy) setDecision(null); }}>
      {decision && <form className="form-fields" onSubmit={event => { event.preventDefault(); confirm(); }}><h2 id={`authorship-decision-${staff ? 'staff' : 'author'}`}>{labels[decision.action]}</h2><p className="authorship-dialog-subject">{'claim' in decision ? decision.claim.title || decision.claim.fullName : 'candidate' in decision ? decision.candidate.fullName : 'contribution' in decision ? decision.contribution.title : decision.responsibility.title}</p><p>{explanations[decision.action]}</p>
        {reasonRequired && <label className="field"><span>{ui.reason}</span><textarea autoFocus rows={4} maxLength={2000} minLength={3} required value={message} disabled={busy} onChange={event => setMessage(event.target.value)} /></label>}
        {error && <p className="notice notice-error" role="alert">{error}</p>}<div className="editor-actions"><button className="button button-primary" disabled={busy} type="submit">{busy ? ui.saving : labels[decision.action]}</button><button className="button button-outline" disabled={busy} type="button" onClick={() => setDecision(null)}>{text.close}</button></div>
      </form>}
    </dialog>
  </section>;
}
