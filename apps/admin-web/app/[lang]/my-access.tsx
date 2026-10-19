'use client';
import {useState} from 'react';
import type {MyAccess} from '@sep/contracts';
import type {Locale} from '@sep/i18n';
export const accessRole=(role:string,es:boolean)=>({organization_admin:es?'Administrador de organización':'Organization administrator',organizer:es?'Organizador':'Organizer',participant:es?'Participante':'Participant',reviewer:es?'Revisor':'Reviewer',accreditor:es?'Acreditador':'Accreditor'}[role]??role);

export default function MyAccessView({value,locale,contextKey,contextEvents,profileSaved,demo=false}:{value:MyAccess;locale:Locale;contextKey:string;contextEvents:Record<string,string>;profileSaved:boolean;demo?:boolean}){
 const es=locale==='es',t=(a:string,b:string)=>es?a:b,[search,setSearch]=useState('');
 const eventKey=(id:string)=>Object.keys(contextEvents).find(k=>contextEvents[k]===id)??id;
 const path=(key:string,tab:string)=>`/${locale}?event=${encodeURIComponent(key)}&tab=${tab}`;
 const personalEvents=value.events.filter(event=>event.personal);
 const filtered=personalEvents.filter(e=>(e.nameEs+' '+e.nameEn).toLocaleLowerCase(locale).includes(search.toLocaleLowerCase(locale)));
 return <div className="module-workspace access-home">
  <div className="admin-heading"><div><h1>{t('Inicio','Home')}</h1></div></div>
  {<section className="panel profile-card access-profile-card"><div><h2>{profileSaved?t('Mi perfil','My profile'):t('Completa tus datos básicos','Complete your basic details')}</h2><p className="profile-help">{profileSaved?t('Tus datos básicos están guardados. Puedes consultar o actualizar tu formación, afiliaciones y ORCID desde Mi perfil.','Your basic details are saved. You can view or update your education, affiliations and ORCID in My profile.'):t('Confirma tu nombre y añade tu cargo e institución si corresponde. Podrás ampliar tu perfil más adelante.','Confirm your name and add your position and institution if applicable. You can expand your profile later.')}</p></div><a className={`button ${profileSaved?'button-outline':'button-primary'}`} href={path(contextKey,'profile')+(profileSaved?'':'&mode=complete-profile')}>{profileSaved?t('Ver mi perfil','View my profile'):t('Completar mi perfil','Complete my profile')}</a></section>}
  <section className="panel profile-card"><div className="profile-card-heading"><h2>{t('Mis eventos','My events')}</h2>
   {personalEvents.length>4&&<label className="field"><span>{t('Buscar evento','Search events')}</span><input value={search} onChange={e=>setSearch(e.target.value)}/></label>}
  </div>
  {!personalEvents.length&&<><p className="access-empty-title">{t('Todavía no te has incorporado a un evento.','You have not joined an event yet.')}</p><p className="profile-help">{t('Para inscribirte o enviar un trabajo, entra desde la página del evento. Si recibiste una invitación, abre su enlace para aceptarla.','To register or submit a work, start from the event website. If you received an invitation, open its link to accept it.')}</p></>}
  {personalEvents.length>0&&!filtered.length&&<p>{t('No hay eventos que coincidan con la búsqueda.','No events match your search.')}</p>}
  {filtered.map(e=><article className="editorial-row" key={e.id}><h3>{es?e.nameEs:e.nameEn}</h3>
   {e.reviewStatus==='invited'&&<p className="profile-help">{t('Tienes una invitación al comité revisor.','You have an invitation to the review committee.')}</p>}
   <div className="editor-actions">
    {(e.reviewStatus==='accepted'||e.reviewStatus==='invited')&&<a className="button button-outline" href={path(eventKey(e.id),'reviews')}>{e.reviewStatus==='invited'?t('Ver invitación de revisión','View review invitation'):t('Mis revisiones','My reviews')}</a>}
    <a className="button button-outline" href={path(eventKey(e.id),'works')}>{t('Mis trabajos','My works')}</a>
    <a className="button button-outline" href={path(eventKey(e.id),'registration')}>{t('Mi inscripción','My registration')}</a>
    <a className="button button-outline" href={path(eventKey(e.id),'certificates')}>{t('Mis certificados','My certificates')}</a>
   </div>
  </article>)}
  </section>
  {demo&&<details className="panel profile-card"><summary>{t('Cambiar organización de la demo','Switch demo organization')}</summary><div className="editor-actions">{['orgA','orgB'].map(k=><a className="button button-outline" key={k} href={path(k,'access')}>{t('Organización','Organization')} {k==='orgA'?'A':'B'}</a>)}</div></details>}
 </div>;
}
