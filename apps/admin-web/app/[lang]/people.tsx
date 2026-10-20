'use client';
import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import {useRouter,useSearchParams} from 'next/navigation';
import type { CreatedInvitation, PeopleDirectory } from '@sep/contracts';
import { webCopy, type Locale } from '@sep/i18n';
import { Icon, StatusBadge } from '@sep/ui';

export default function People({ initial, locale, contextKey }: { initial: PeopleDirectory; locale: Locale; contextKey: string }) {
  const es=locale==='es',t=(a:string,b:string)=>es?a:b;
  const router=useRouter(),query=useSearchParams(),[pending,startTransition]=useTransition();
  const [search,setSearch]=useState(initial.q??''),[directory,setDirectory]=useState(initial);
  const mode=query.get('view')==='list'?'list':'cards',limit=directory.limit??20,offset=directory.offset??0,total=directory.total??directory.people.length;
  const text=webCopy[locale];
  useEffect(()=>{setDirectory(initial);setSearch(initial.q??'');},[initial]);
  function listUrl(next:{offset?:number;q?:string;view?:string}={}){
    const params=new URLSearchParams({event:contextKey,tab:'people',view:next.view??mode});
    const q=next.q??directory.q??'',pageOffset=next.offset??offset;
    if(q)params.set('q',q);if(pageOffset)params.set('offset',String(pageOffset));
    return `/${locale}?${params}`;
  }
  function navigate(next:{offset?:number;q?:string;view?:string}){startTransition(()=>router.push(listUrl(next),{scroll:false}));}
  function personUrl(id:string){const params=new URLSearchParams({event:contextKey,view:mode});if(directory.q)params.set('q',directory.q);if(offset)params.set('offset',String(offset));return `/${locale}/people/${id}?${params}`;}
  function affiliation(person:PeopleDirectory['people'][number]){return person.primaryAffiliation?`${person.primaryAffiliation.institution} · ${country(person.primaryAffiliation.countryCode)}`:t('Afiliación principal sin definir','Primary affiliation not selected');}
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false); const [link, setLink] = useState('');
  const [notice, setNotice] = useState<{ message: string; error: boolean } | null>(null);
  async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
    const response = await fetch(`/api/backend/${path}?event=${encodeURIComponent(contextKey)}&lang=${locale}`, {
      method, headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined,
    });
    const data = await response.json();
    if (response.status === 401) window.location.assign(`/${locale}?event=${encodeURIComponent(contextKey)}&tab=people`);
    if (!response.ok) throw new Error(data.error?.message ?? text.serviceHelp);
    return data;
  }
  async function create() {
    setBusy(true); setNotice(null); setLink('');
    try {
      const created = await request<CreatedInvitation>('invitations', 'POST', { name, email });
      setLink(`${window.location.origin}/${locale}/invitations/${created.token}?event=${encodeURIComponent(contextKey)}`);
      setName(''); setEmail(''); setCreating(false); setNotice({ message: text.invitationCreated, error: false });
      router.refresh();
    } catch (error) { setNotice({ error: true, message: error instanceof Error ? error.message : text.serviceHelp }); }
    finally { setBusy(false); }
  }
  async function revoke(id: string) {
    setBusy(true); setNotice(null);
    try { await request(`invitations/${id}/revoke`, 'POST', {}); router.refresh(); setLink(''); setNotice({ message: text.invitationRevoked, error: false }); }
    catch (error) { setNotice({ error: true, message: error instanceof Error ? error.message : text.serviceHelp }); }
    finally { setBusy(false); }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(link); setNotice({ message: text.copiedLink, error: false }); }
    catch { /* The read-only field remains available for manual copying. */ }
  }
  const country=(code:string)=>{try{return new Intl.DisplayNames([locale],{type:'region'}).of(code)||code;}catch{return code;}};
  return <div className="organization-people" aria-busy={pending}>
    {notice && <div className={`notice ${notice.error ? 'notice-error' : ''}`} role={notice.error ? 'alert' : 'status'}>{notice.message}</div>}
    <section className="panel directory-panel"><div className="panel-heading"><h2>{text.invitations}</h2><button className="button button-primary" onClick={() => setCreating(!creating)}><Icon name="plus" size={16} />{text.invitePerson}</button></div>
    {creating && <form className="form-panel" onSubmit={(event) => { event.preventDefault(); void create(); }}><div className="form-fields"><label className="field"><span>{text.personName}</span><input value={name} onChange={(e) => setName(e.target.value)} minLength={2} maxLength={120} required /></label><label className="field"><span>{text.personEmail}</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={254} required /></label></div><div className="editor-actions"><button className="button button-primary" disabled={busy}>{busy ? text.saving : text.createInvitation}</button><button type="button" className="button button-outline" onClick={() => setCreating(false)}>{text.cancel}</button></div></form>}
    {link && <div className="form-panel"><label className="field"><span>{text.invitationShare}</span><input readOnly value={link} onFocus={(e) => e.target.select()} /></label><p className="muted small">{text.invitationLinkHelp}</p><button className="button button-outline" onClick={copy}>{text.copyLink}</button></div>}
    <div className="table-scroll"><table className="event-table"><thead><tr><th>{text.personName}</th><th>{text.invitationStatus}</th><th>{text.expires}</th><th>{text.actions}</th></tr></thead><tbody>{directory.invitations.map((invitation) => <tr key={invitation.id}><td><strong>{invitation.name}</strong><p className="small muted">{invitation.email}</p></td><td><StatusBadge status={invitation.status === 'accepted' ? 'published' : invitation.status === 'pending' ? 'draft' : 'archived'} label={text[invitation.status]} /></td><td>{new Intl.DateTimeFormat(locale).format(new Date(invitation.expiresAt))}</td><td>{invitation.status === 'pending' && <button className="button button-outline" disabled={busy} onClick={() => revoke(invitation.id)}>{text.revokeInvitation}</button>}</td></tr>)}</tbody></table></div>{!directory.invitations.length && <p className="form-panel muted">{text.noInvitations}</p>}</section>
    <section className="panel directory-panel"><div className="panel-heading"><div><h2>{text.organizationPeople}</h2><p className="profile-help">{t('Busca una persona y abre su ficha para consultar sus datos y participación.','Find someone and open their page to view their profile and participation.')}</p></div><span>{total} {t('personas','people')}</span></div>
    <div className="directory-content"><div className="directory-toolbar"><form className="directory-search-form" onSubmit={e=>{e.preventDefault();navigate({q:search.trim(),offset:0});}}><label className="field"><span>{t('Buscar persona','Search people')}</span><input type="search" value={search} maxLength={100} onChange={e=>setSearch(e.target.value)} placeholder={t('Nombre, correo o institución','Name, email or institution')}/></label><button className="button button-outline" disabled={pending}>{t('Buscar','Search')}</button>{directory.q&&<button type="button" className="button button-outline" disabled={pending} onClick={()=>{setSearch('');navigate({q:'',offset:0});}}>{t('Limpiar','Clear')}</button>}</form><div className="directory-view-switch" role="group" aria-label={t('Vista del directorio','Directory view')}><button className="button button-outline" aria-pressed={mode==='cards'} disabled={pending} onClick={()=>navigate({view:'cards'})}>{t('Tarjetas','Cards')}</button><button className="button button-outline" aria-pressed={mode==='list'} disabled={pending} onClick={()=>navigate({view:'list'})}>{t('Lista','List')}</button></div></div>
    {mode==='cards'?<div className="person-card-grid">{directory.people.map(person=><article className="person-card" key={person.personId}>
      <div className="person-card-identity"><span className="person-initials" aria-hidden="true">{person.name.split(/\s+/).slice(0,2).map(n=>n[0]).join('')}</span><div><h3>{person.name}</h3><p>{person.email??t('Sin correo de contacto confirmado','No verified contact email')}</p></div></div>
      <div className="person-card-affiliation"><span>{t('Afiliación principal','Primary affiliation')}</span><p>{affiliation(person)}</p>{person.primaryAffiliation&&person.position&&<p className="profile-help">{person.position}</p>}</div>
      {person.orcid&&<p className="profile-help">ORCID: {person.orcid.id}{person.orcid.environment==='sandbox'?t(' (pruebas)',' (sandbox)'):''}</p>}
      <Link className="button button-outline" href={personUrl(person.personId)} prefetch={false}>{t('Ver persona y actividad','View profile and activity')}</Link>
    </article>)}</div>:<div className="table-scroll"><table className="event-table directory-list"><thead><tr><th>{t('Persona','Person')}</th><th>{t('Afiliación principal','Primary affiliation')}</th><th>{t('Cargo actual','Current position')}</th><th>{text.actions}</th></tr></thead><tbody>{directory.people.map(person=><tr key={person.personId}><td><strong>{person.name}</strong><p className="small muted">{person.email??t('Sin correo confirmado','No verified email')}</p></td><td>{affiliation(person)}</td><td>{person.primaryAffiliation?person.position||'—':'—'}</td><td><Link className="button button-outline" href={personUrl(person.personId)} prefetch={false}>{t('Ver persona','View person')}</Link></td></tr>)}</tbody></table></div>}
    {!directory.people.length&&<p className="muted">{directory.q?t('No hay personas que coincidan.','No people match your search.'):text.noPeople}</p>}
    <nav className="directory-pagination" aria-label={t('Páginas de personas','People pages')}><span role="status">{total&&directory.people.length?`${offset+1}–${Math.min(offset+directory.people.length,total)} ${t('de','of')} ${total}`:t('Sin resultados','No results')}</span><div><button className="button button-outline" disabled={pending||offset===0} onClick={()=>navigate({offset:Math.max(0,offset-limit)})}>{t('Anterior','Previous')}</button><button className="button button-outline" disabled={pending||offset+limit>=total} onClick={()=>navigate({offset:offset+limit})}>{t('Siguiente','Next')}</button></div></nav>
    </div></section>
  </div>;
}
