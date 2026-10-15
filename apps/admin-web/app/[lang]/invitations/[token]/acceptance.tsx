'use client';
import { useState } from 'react';
import { Brand, Icon } from '@sep/ui';
import { webCopy, type Locale } from '@sep/i18n';

export default function Acceptance({ locale, token, contextKey, authenticated, accountName, demo }: {
  locale: Locale; token: string; contextKey: string; authenticated: boolean; accountName: string | null; demo: boolean;
}) {
  const text = webCopy[locale]; const [busy, setBusy] = useState(false); const [accepted, setAccepted] = useState(false); const [error, setError] = useState('');
  async function guest() {
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ persona: 'outsider' }) });
      if (!response.ok) throw new Error(text.noAuth);
      window.location.reload();
    } catch (error) { setError(error instanceof Error ? error.message : text.serviceHelp); setBusy(false); }
  }
  async function accept() {
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/backend/invitations/accept?event=${encodeURIComponent(contextKey)}&lang=${locale}`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token }),
      });
      if (!response.ok) throw new Error(text.invitationInvalid);
      setAccepted(true);
    } catch (error) { setError(error instanceof Error ? error.message : text.serviceHelp); }
    finally { setBusy(false); }
  }
  return <main className="invitation-page"><Brand /><section className="panel form-panel"><span className="eyebrow">{text.invitations}</span><h1>{accepted ? text.invitationAccepted : text.invitationTitle}</h1><p>{accepted ? text.invitationAcceptedHelp : text.invitationHelp}</p>
    {error && <div className="notice notice-error" role="alert">{error}</div>}
    {!accepted && <><p className="muted">{authenticated ? text.invitationAccount : text.invitationSignIn}{accountName && <> <strong>{accountName}</strong></>}</p><div className="editor-actions"><button className="button button-primary" disabled={!authenticated || busy} onClick={accept}>{busy ? text.saving : text.acceptInvitation}<Icon name="arrow" size={16} /></button></div>
      {demo && <><p className="demo-note">{text.demoGuestHelp}</p><button className="button button-outline" disabled={busy} onClick={guest}>{text.demoGuest}</button></>}
    </>}
    {accepted && <a className="button button-outline" href={`/${locale}?event=${encodeURIComponent(contextKey)}`}>{text.enter}</a>}
  </section></main>;
}
