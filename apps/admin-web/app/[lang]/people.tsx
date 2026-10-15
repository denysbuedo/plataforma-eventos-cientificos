'use client';
import { useState } from 'react';
import type { CreatedInvitation, PeopleDirectory } from '@sep/contracts';
import { webCopy, type Locale } from '@sep/i18n';
import { Icon, StatusBadge } from '@sep/ui';

export default function People({ initial, locale, contextKey }: { initial: PeopleDirectory; locale: Locale; contextKey: string }) {
  const text = webCopy[locale]; const [directory, setDirectory] = useState(initial);
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false); const [link, setLink] = useState('');
  const [notice, setNotice] = useState<{ message: string; error: boolean } | null>(null);
  async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
    const response = await fetch(`/api/backend/${path}?event=${encodeURIComponent(contextKey)}&lang=${locale}`, {
      method, headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message ?? text.serviceHelp);
    return data;
  }
  async function create() {
    setBusy(true); setNotice(null); setLink('');
    try {
      const created = await request<CreatedInvitation>('invitations', 'POST', { name, email });
      setLink(`${window.location.origin}/${locale}/invitations/${created.token}?event=${encodeURIComponent(contextKey)}`);
      setName(''); setEmail(''); setCreating(false); setNotice({ message: text.invitationCreated, error: false });
      setDirectory(await request<PeopleDirectory>('people'));
    } catch (error) { setNotice({ error: true, message: error instanceof Error ? error.message : text.serviceHelp }); }
    finally { setBusy(false); }
  }
  async function revoke(id: string) {
    setBusy(true); setNotice(null);
    try { await request(`invitations/${id}/revoke`, 'POST', {}); setDirectory(await request<PeopleDirectory>('people')); setLink(''); setNotice({ message: text.invitationRevoked, error: false }); }
    catch (error) { setNotice({ error: true, message: error instanceof Error ? error.message : text.serviceHelp }); }
    finally { setBusy(false); }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(link); setNotice({ message: text.copiedLink, error: false }); }
    catch { /* The read-only field remains available for manual copying. */ }
  }
  return <>
    {notice && <div className={`notice ${notice.error ? 'notice-error' : ''}`} role={notice.error ? 'alert' : 'status'}>{notice.message}</div>}
    <section className="panel"><div className="panel-heading"><h2>{text.invitations}</h2><button className="button button-primary" onClick={() => setCreating(!creating)}><Icon name="plus" size={16} />{text.invitePerson}</button></div>
    {creating && <form className="form-panel" onSubmit={(event) => { event.preventDefault(); void create(); }}><div className="form-fields"><label className="field"><span>{text.personName}</span><input value={name} onChange={(e) => setName(e.target.value)} minLength={2} maxLength={120} required /></label><label className="field"><span>{text.personEmail}</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={254} required /></label></div><div className="editor-actions"><button className="button button-primary" disabled={busy}>{busy ? text.saving : text.createInvitation}</button><button type="button" className="button button-outline" onClick={() => setCreating(false)}>{text.cancel}</button></div></form>}
    {link && <div className="form-panel"><label className="field"><span>{text.invitationShare}</span><input readOnly value={link} onFocus={(e) => e.target.select()} /></label><p className="muted small">{text.invitationLinkHelp}</p><button className="button button-outline" onClick={copy}>{text.copyLink}</button></div>}
    <div className="table-scroll"><table className="event-table"><thead><tr><th>{text.personName}</th><th>{text.invitationStatus}</th><th>{text.expires}</th><th>{text.actions}</th></tr></thead><tbody>{directory.invitations.map((invitation) => <tr key={invitation.id}><td><strong>{invitation.name}</strong><p className="small muted">{invitation.email}</p></td><td><StatusBadge status={invitation.status === 'accepted' ? 'published' : invitation.status === 'pending' ? 'draft' : 'archived'} label={text[invitation.status]} /></td><td>{new Intl.DateTimeFormat(locale).format(new Date(invitation.expiresAt))}</td><td>{invitation.status === 'pending' && <button className="button button-outline" disabled={busy} onClick={() => revoke(invitation.id)}>{text.revokeInvitation}</button>}</td></tr>)}</tbody></table></div>{!directory.invitations.length && <p className="form-panel muted">{text.noInvitations}</p>}</section>
    <section className="panel"><div className="panel-heading"><h2>{text.organizationPeople}</h2></div><table className="event-table"><thead><tr><th>{text.personName}</th><th>{text.linkedEvents}</th></tr></thead><tbody>{directory.people.map((person) => <tr key={person.personId}><td>{person.name}</td><td>{person.eventCount}</td></tr>)}</tbody></table>{!directory.people.length && <p className="form-panel muted">{text.noPeople}</p>}</section>
  </>;
}
