'use client';
import { useEffect, useRef, useState } from 'react';
import type { CreatedInvitation, OrganizationPersonDetail, PeopleDirectory } from '@sep/contracts';
import { webCopy, type Locale } from '@sep/i18n';
import { Icon, StatusBadge } from '@sep/ui';

export default function People({ initial, locale, contextKey }: { initial: PeopleDirectory; locale: Locale; contextKey: string }) {
  const es=locale==='es',t=(a:string,b:string)=>es?a:b;
  const [search,setSearch]=useState(''),[detail,setDetail]=useState<OrganizationPersonDetail|null>(null),[loadingPerson,setLoadingPerson]=useState<string|null>(null),selection=useRef(0),detailHeading=useRef<HTMLHeadingElement>(null),returnTo=useRef<HTMLButtonElement|null>(null);
  useEffect(()=>{if(detail){detailHeading.current?.focus({preventScroll:true});detailHeading.current?.scrollIntoView({block:'start',behavior:'smooth'});}},[detail]);
  const text = webCopy[locale]; const [directory, setDirectory] = useState(initial);
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
  async function openPerson(id:string){
    const current=++selection.current;setLoadingPerson(id);setDetail(null);setNotice(null);
    try{const result=await request<OrganizationPersonDetail>(`people/${id}`);if(current===selection.current)setDetail(result);}
    catch(error){if(current===selection.current)setNotice({error:true,message:error instanceof Error?error.message:text.serviceHelp});}
    finally{if(current===selection.current)setLoadingPerson(null);}
  }
  const status=(value:string)=>({pending:t('Pendiente','Pending'),confirmed:t('Confirmada','Confirmed'),waitlisted:t('En espera','Waitlisted'),rejected:t('Rechazado','Rejected'),cancelled:t('Cancelada','Cancelled'),submitted:t('Enviado','Submitted'),in_review:t('En revisión','In review'),changes_requested:t('Correcciones solicitadas','Changes requested'),accepted:t('Aceptado','Accepted'),withdrawn:t('Retirado','Withdrawn'),final_requested:t('Versión final solicitada','Final version requested'),final_submitted:t('Versión final enviada','Final version submitted'),invited:t('Invitación pendiente','Invited'),declined:t('Declinada','Declined'),conflict:t('Conflicto de interés','Conflict of interest'),revoked:t('Retirada','Revoked')})[value]??value;
  const country=(code:string)=>{try{return new Intl.DisplayNames([locale],{type:'region'}).of(code)||code;}catch{return code;}};
  return <div className="organization-people">
    {notice && <div className={`notice ${notice.error ? 'notice-error' : ''}`} role={notice.error ? 'alert' : 'status'}>{notice.message}</div>}
    <section className="panel directory-panel"><div className="panel-heading"><h2>{text.invitations}</h2><button className="button button-primary" onClick={() => setCreating(!creating)}><Icon name="plus" size={16} />{text.invitePerson}</button></div>
    {creating && <form className="form-panel" onSubmit={(event) => { event.preventDefault(); void create(); }}><div className="form-fields"><label className="field"><span>{text.personName}</span><input value={name} onChange={(e) => setName(e.target.value)} minLength={2} maxLength={120} required /></label><label className="field"><span>{text.personEmail}</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={254} required /></label></div><div className="editor-actions"><button className="button button-primary" disabled={busy}>{busy ? text.saving : text.createInvitation}</button><button type="button" className="button button-outline" onClick={() => setCreating(false)}>{text.cancel}</button></div></form>}
    {link && <div className="form-panel"><label className="field"><span>{text.invitationShare}</span><input readOnly value={link} onFocus={(e) => e.target.select()} /></label><p className="muted small">{text.invitationLinkHelp}</p><button className="button button-outline" onClick={copy}>{text.copyLink}</button></div>}
    <div className="table-scroll"><table className="event-table"><thead><tr><th>{text.personName}</th><th>{text.invitationStatus}</th><th>{text.expires}</th><th>{text.actions}</th></tr></thead><tbody>{directory.invitations.map((invitation) => <tr key={invitation.id}><td><strong>{invitation.name}</strong><p className="small muted">{invitation.email}</p></td><td><StatusBadge status={invitation.status === 'accepted' ? 'published' : invitation.status === 'pending' ? 'draft' : 'archived'} label={text[invitation.status]} /></td><td>{new Intl.DateTimeFormat(locale).format(new Date(invitation.expiresAt))}</td><td>{invitation.status === 'pending' && <button className="button button-outline" disabled={busy} onClick={() => revoke(invitation.id)}>{text.revokeInvitation}</button>}</td></tr>)}</tbody></table></div>{!directory.invitations.length && <p className="form-panel muted">{text.noInvitations}</p>}</section>
    <section className="panel directory-panel"><div className="panel-heading"><div><h2>{text.organizationPeople}</h2><p className="profile-help">{t('Consulta sus datos y su participación en los eventos de esta organización.','View their profile and participation in this organization’s events.')}</p></div><span>{directory.people.length} {t('personas','people')}</span></div>
    <div className="directory-content"><label className="field directory-search"><span>{t('Buscar persona','Search people')}</span><input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder={t('Nombre, correo o institución','Name, email or institution')}/></label>
    <div className="person-card-grid">{directory.people.filter(p=>[p.name,p.email,...(p.affiliations??[]).map(a=>a.institution)].join(' ').toLocaleLowerCase(locale).includes(search.toLocaleLowerCase(locale))).map(person=><article className="person-card" key={person.personId}>
      <div className="person-card-identity"><span className="person-initials" aria-hidden="true">{person.name.split(/\s+/).slice(0,2).map(n=>n[0]).join('')}</span><div><h3>{person.name}</h3><p>{person.email??t('Sin correo de contacto confirmado','No verified contact email')}</p></div></div>
      {person.position&&<p>{person.position}</p>}<p className="profile-help">{person.affiliations?.length?person.affiliations.map(a=>`${a.institution} · ${country(a.countryCode)}`).join('; '):t('Sin afiliaciones declaradas','No declared affiliations')}</p>
      {person.orcid&&<p className="profile-help">ORCID: {person.orcid.id}{person.orcid.environment==='sandbox'?t(' (pruebas)',' (sandbox)'):''}</p>}
      <button className="button button-outline" disabled={loadingPerson===person.personId} onClick={e=>{returnTo.current=e.currentTarget;void openPerson(person.personId);}}>{loadingPerson===person.personId?t('Cargando…','Loading…'):t('Ver persona y actividad','View profile and activity')}</button>
    </article>)}</div>{!directory.people.length&&<p className="muted">{text.noPeople}</p>}{directory.people.length>0&&!directory.people.some(p=>[p.name,p.email,...(p.affiliations??[]).map(a=>a.institution)].join(' ').toLocaleLowerCase(locale).includes(search.toLocaleLowerCase(locale)))&&<p>{t('No hay personas que coincidan.','No people match your search.')}</p>}
    </div></section>
    {detail&&<section className="panel directory-panel person-summary" aria-label={t('Resumen de la persona','Person summary')}><div className="panel-heading"><div><h2 ref={detailHeading} tabIndex={-1} style={{scrollMarginTop:24}}>{detail.name}</h2><p>{detail.email??t('Sin correo de contacto confirmado','No verified contact email')}</p></div><button className="button button-outline" onClick={()=>{selection.current++;setDetail(null);returnTo.current?.focus();}}>{t('Cerrar','Close')}</button></div>
    <div className="directory-content"><div className="person-summary-profile"><section><h3>{t('Perfil académico y profesional','Academic and professional profile')}</h3>{detail.position&&<p>{detail.position}</p>}<dl><dt>{t('Afiliaciones declaradas','Declared affiliations')}</dt><dd>{detail.affiliations?.length?detail.affiliations.map(a=><p key={a.institution+a.countryCode}>{a.institution} · {country(a.countryCode)}</p>):t('Sin declarar','Not provided')}</dd>{detail.orcid&&<><dt>ORCID</dt><dd>{detail.orcid.id}{detail.orcid.environment==='sandbox'?t(' (pruebas)',' (sandbox)'):''}</dd></>}</dl></section>
    <section><h3>{t('Formación y trayectoria','Education and background')}</h3>{detail.background?.qualifications?.map((q,i)=><p key={i}>{q.title} · {country(q.countryCode)}</p>)}{detail.background?.degreeTitle&&<p>{detail.background.degreeTitle}</p>}{detail.background?.researchInterests?.length? <p>{detail.background.researchInterests.join('; ')}</p>:null}{detail.background?.biography&&<p className="person-biography">{detail.background.biography}</p>}{detail.background?.website&&<p>{detail.background.website}</p>}{!detail.background&&<p className="profile-help">{t('Todavía no ha completado estos datos.','These details have not been completed yet.')}</p>}</section></div>
    <h3>{t('Participación por evento','Participation by event')}</h3><p className="profile-help">{t('Solo actividad de esta organización. Se muestran los trabajos enviados y las autorías confirmadas; los borradores personales permanecen privados.','Only activity in this organization. Submitted works and confirmed authorships are shown; personal drafts remain private.')}</p>
    {!detail.events.length&&<p>{t('No hay inscripciones, trabajos enviados ni revisiones registradas.','No registrations, submitted works or reviews recorded.')}</p>}
    {detail.events.map(event=><article className="person-event-summary" key={event.id}><h4>{es?event.nameEs:event.nameEn}</h4><div className="person-activity-grid"><section><h5>{t('Inscripciones','Registrations')}</h5>{event.registrations.length?event.registrations.map(r=><p key={r.id}>{status(r.status)} · {r.modality==='virtual'?t('Virtual','Online'):t('Presencial','In person')}</p>):<p className="profile-help">{t('Sin inscripción','Not registered')}</p>}</section><section><h5>{t('Trabajos','Works')}</h5>{event.works.length?event.works.map(w=><div key={w.id}><strong>{w.title}</strong><p className="profile-help">{status(w.status)} · {w.relationship==='submitter'?t('Responsable del envío','Submitter'):t('Autoría confirmada','Confirmed authorship')}</p></div>):<p className="profile-help">{t('Sin trabajos enviados','No submitted works')}</p>}</section><section><h5>{t('Revisión científica','Scientific reviewing')}</h5>{event.reviewStatus&&<p className="profile-help">{t('Comité','Committee')}: {status(event.reviewStatus)}</p>}{event.reviews.length?event.reviews.map(r=><div key={r.id}><strong>{r.title}</strong><p className="profile-help">{status(r.status)}</p></div>):<p className="profile-help">{t('Sin evaluaciones asignadas','No assigned reviews')}</p>}</section></div></article>)}
    </div></section>}
  </div>;
}
