'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { EventView, ManagedDomain, OrganizationSettings } from '@sep/contracts';
import { webCopy, type Locale } from '@sep/i18n';

export default function Organization({ initial, events, locale, contextKey }: {
  initial: OrganizationSettings; events: EventView[]; locale: Locale; contextKey: string;
}) {
  const text = webCopy[locale]; const router = useRouter();
  const [settings, setSettings] = useState(initial); const [profile, setProfile] = useState(initial.organization);
  const [hostname, setHostname] = useState(''); const [eventId, setEventId] = useState('');
  const [busy, setBusy] = useState(false); const [notice, setNotice] = useState<{ error: boolean; message: string } | null>(null);
  const dirty = JSON.stringify(profile) !== JSON.stringify(settings.organization);
  async function request(path: string, method: string, body?: unknown) {
    const response = await fetch(`/api/backend/organization${path}?event=${encodeURIComponent(contextKey)}&lang=${locale}`, {
      method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await response.json();
    if (response.status === 401) window.location.assign(`/${locale}?event=${encodeURIComponent(contextKey)}`);
    if (!response.ok) throw new Error(data.error?.message ?? text.serviceHelp);
    return data as OrganizationSettings;
  }
  async function run(action: () => Promise<void>, message: string) {
    setBusy(true); setNotice(null);
    try { await action(); setNotice({ error: false, message }); router.refresh(); }
    catch (error) { setNotice({ error: true, message: error instanceof Error ? error.message : text.serviceHelp }); }
    finally { setBusy(false); }
  }
  async function save() {
    await run(async () => {
      const body = { name: profile.name, contactEmail: profile.contactEmail, website: profile.website, description: profile.description, revision: profile.revision };
      const next = await request('', 'PATCH', body); setSettings(next); setProfile(next.organization);
    }, text.organizationSaved);
  }
  async function register() {
    await run(async () => { setSettings(await request('/domains', 'POST', { hostname: hostname.trim(), eventId })); setHostname(''); setEventId(''); }, text.domainRegistered);
  }
  async function transition(domain: ManagedDomain, action: 'verify' | 'activate' | 'deactivate' | 'delete') {
    if (action === 'delete' && !window.confirm(text.deleteDomainConfirm)) return;
    await run(async () => { setSettings(await request(`/domains/${domain.id}${action === 'delete' ? '' : `/${action}`}`, action === 'delete' ? 'DELETE' : 'POST')); },
      action === 'verify' ? text.domainVerified : action === 'activate' ? text.domainActivated : action === 'deactivate' ? text.domainDeactivated : text.domainDeleted);
  }
  function status(domain: ManagedDomain) {
    return domain.active ? text.domainActive : domain.verified ? domain.tlsReady ? text.domainReady : text.domainAwaitingTls : text.domainAwaitingDns;
  }
  return <>
    {notice && <div className={`notice ${notice.error ? 'notice-error' : ''}`} role={notice.error ? 'alert' : 'status'}>{notice.message}</div>}
    <section className="panel form-panel"><h2>{text.organizationData}</h2>
      <form onSubmit={(event) => { event.preventDefault(); void save(); }} className="form-fields">
        <label className="field"><span>{text.organizationName}</span><input required minLength={3} maxLength={200} value={profile.name} disabled={busy} onChange={(event) => setProfile({ ...profile, name: event.target.value })} /></label>
        <div className="field-row"><label className="field"><span>{text.email}</span><input type="email" maxLength={254} value={profile.contactEmail} disabled={busy} onChange={(event) => setProfile({ ...profile, contactEmail: event.target.value })} /></label>
          <label className="field"><span>{text.organizationWebsite}</span><input type="url" placeholder="https://" maxLength={500} value={profile.website} disabled={busy} onChange={(event) => setProfile({ ...profile, website: event.target.value })} /></label></div>
        <label className="field"><span>{text.organizationDescription}</span><textarea maxLength={2000} rows={4} value={profile.description} disabled={busy} onChange={(event) => setProfile({ ...profile, description: event.target.value })} /></label>
        <button className="button button-primary" disabled={busy || !dirty} type="submit">{busy ? text.saving : text.saveData}</button>
      </form>
    </section>
    <section className="panel form-panel"><div className="panel-heading"><h2>{text.organizationDomains}</h2><button className="button button-outline" disabled={busy} onClick={() => run(async () => { setSettings(await request('', 'GET')); }, text.domainsReloaded)}>{text.reloadDomains}</button></div><p className="muted">{text.domainsHelp}</p>
      <form className="form-fields" onSubmit={(event) => { event.preventDefault(); void register(); }}>
        <div className="field-row"><label className="field"><span>{text.domainHostname}</span><input required maxLength={235} placeholder="congreso.example.org" value={hostname} disabled={busy} onChange={(event) => setHostname(event.target.value)} /></label>
          <label className="field"><span>{text.event}</span><select required value={eventId} disabled={busy} onChange={(event) => setEventId(event.target.value)}><option value="">{text.selectEvent}</option>{events.filter((event) => event.status !== 'archived').map((event) => <option key={event.id} value={event.id}>{locale === 'es' ? event.nameEs : event.nameEn}</option>)}</select></label></div>
        <button type="submit" className="button button-primary" disabled={busy || !eventId || !hostname.trim()}>{text.registerDomain}</button>
      </form>
      {!settings.domains.length && <p className="muted">{text.noDomains}</p>}
      {settings.domains.map((domain) => <article key={domain.id} className="panel form-panel" style={{ marginTop: '1rem' }}>
        <div className="panel-heading"><div><h3>{domain.hostname}</h3><p>{domain.eventId ? events.find((event) => event.id === domain.eventId)?.[locale === 'es' ? 'nameEs' : 'nameEn'] ?? text.event : text.organizationIngress}</p></div><span>{status(domain)}</span></div>
        {!domain.eventId ? <p className="muted small">{text.organizationIngressHelp}</p> : <>
          {domain.verificationToken && <><p className="muted small">{text.dnsInstructions}</p><label className="field"><span>{text.dnsRecordName}</span><input readOnly value={`_sep-verification.${domain.hostname}`} /></label><label className="field"><span>{text.dnsRecordValue}</span><input readOnly value={`sep-domain-verification=${domain.verificationToken}`} /></label></>}
          {domain.verified && !domain.tlsReady && !domain.active && <p className="muted small">{text.tlsInstructions}</p>}
          <div className="editor-actions">
            {domain.verificationToken && !domain.active && <button className="button button-outline" disabled={busy} onClick={() => transition(domain, 'verify')}>{text.verifyDomain}</button>}
            {!domain.active && <button className="button button-primary" disabled={busy || !domain.verified || !domain.tlsReady || !domain.verificationToken} onClick={() => transition(domain, 'activate')}>{text.activateDomain}</button>}
            {domain.active ? <button className="button button-outline" disabled={busy} onClick={() => transition(domain, 'deactivate')}>{text.deactivateDomain}</button> : <button className="button button-outline" disabled={busy} onClick={() => transition(domain, 'delete')}>{text.deleteDomain}</button>}
          </div>
        </>}
      </article>)}
    </section>
  </>;
}
