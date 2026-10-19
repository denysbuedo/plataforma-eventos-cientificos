'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import {COUNTRY_CODES,emptyResearcherBackground,type AuthorAccount,type ResearcherProfile,type ValidationIssue} from '@sep/contracts';
import type {Locale} from '@sep/i18n';
import {Icon} from '@sep/ui';
import {profileIssueMessage,profileIssues} from './profile-validation';
import {useParticipantNavigationGuard} from './participant-shell';

const copy={
 es:{title:'Completa tu perfil',intro:'Solo unos datos para identificarte y reutilizarlos cuando participes en un evento.',account:'Tu cuenta',name:'Nombre y apellidos',position:'Cargo o función actual',optional:'Opcional',positionExample:'Ej.: docente, estudiante o investigador',affiliations:'Institución y país',affiliationHelp:'Puedes dejarlos vacíos si no tienes afiliación institucional.',institution:'Institución',country:'País de la institución',choose:'Selecciona el país',add:'Añadir otra institución',remove:'Quitar',later:'Podrás añadir tu formación, reseña profesional y ORCID después, desde Mi perfil.',save:'Guardar y continuar',busy:'Guardando…',skip:'Ahora no',error:'No pudimos guardar el perfil. Inténtalo de nuevo.',review:'Revisa estos datos:',unsaved:'Tienes cambios sin guardar',unsavedHelp:'Si sales ahora, perderás los cambios de este formulario.',stay:'Seguir completando',leave:'Salir sin guardar'},
 en:{title:'Complete your profile',intro:'A few details to identify you and reuse when you take part in an event.',account:'Your account',name:'Full name',position:'Current position or role',optional:'Optional',positionExample:'For example: lecturer, student or researcher',affiliations:'Institution and country',affiliationHelp:'You can leave these empty if you have no institutional affiliation.',institution:'Institution',country:'Institution country',choose:'Select a country',add:'Add another institution',remove:'Remove',later:'You can add your education, professional biography and ORCID later, in My profile.',save:'Save and continue',busy:'Saving…',skip:'Not now',error:'We could not save your profile. Please try again.',review:'Check these details:',unsaved:'You have unsaved changes',unsavedHelp:'Leaving now will discard your changes to this form.',stay:'Keep completing',leave:'Leave without saving'},
} as const;

export default function CompleteProfile({person,locale,contextKey}:{person:AuthorAccount;locale:Locale;contextKey:string}){
 const text=copy[locale],router=useRouter(),profile=person.researcherProfile;
 const initial={name:profile?.name??person.name,position:profile?.background?.position??'',affiliations:profile?.affiliations.length?profile.affiliations:[{institution:'',countryCode:''}]};
 const [form,setForm]=useState(initial),[busy,setBusy]=useState(false),[issues,setIssues]=useState<ValidationIssue[]>([]),[error,setError]=useState(''),[closing,setClosing]=useState(false);
 const dialog=useRef<HTMLDialogElement>(null),pending=useRef<(()=>void)|null>(null),warn=useRef(false),formElement=useRef<HTMLFormElement>(null);
 const dirty=JSON.stringify(initial)!==JSON.stringify(form),home=`/${locale}?event=${encodeURIComponent(contextKey)}&tab=access`,fullProfile=`/${locale}?event=${encodeURIComponent(contextKey)}&tab=profile`;
 const countries=useMemo(()=>{const names=new Intl.DisplayNames([locale],{type:'region'});return COUNTRY_CODES.map(code=>({code,name:names.of(code)??code})).sort((a,b)=>a.name.localeCompare(b.name,locale));},[locale]);
 function navigate(action:()=>void){if(busy)return;if(dirty){pending.current=action;setClosing(true);}else action();}
 useParticipantNavigationGuard(navigate);
 useEffect(()=>{warn.current=dirty;const handler=(event:BeforeUnloadEvent)=>{if(warn.current){event.preventDefault();event.returnValue='';}};window.addEventListener('beforeunload',handler);return()=>window.removeEventListener('beforeunload',handler);},[dirty]);
 useEffect(()=>{if(closing)dialog.current?.showModal();else dialog.current?.close();},[closing]);
 function focus(field:string){const target=formElement.current?.elements.namedItem(field) as HTMLElement|null;target?.focus();}
 function fieldError(field:string){return issues.find(issue=>issue.field===field);}
 function changeAffiliation(index:number,update:Partial<{institution:string;countryCode:string}>){setForm({...form,affiliations:form.affiliations.map((item,i)=>i===index?{...item,...update}:item)});setIssues([]);}
 async function save(){
  if(busy)return;setError('');
  // Preserve the complete profile: this short form only updates the displayed fields.
  const payload:ResearcherProfile={name:form.name,affiliations:form.affiliations.filter(item=>item.institution.trim()||item.countryCode),discoverable:profile?.discoverable??false,revision:profile?.revision??0,background:{...emptyResearcherBackground(),...profile?.background,position:form.position}};
  // Keep original row indices when highlighting partially filled affiliation rows.
  const validation=profileIssues(payload).map(issue=>{const match=issue.field.match(/^affiliations\.(\d+)\.(.+)$/u);if(!match)return issue;const row=form.affiliations.map((item,index)=>({item,index})).filter(({item})=>item.institution.trim()||item.countryCode)[Number(match[1])];return {...issue,field:`affiliations.${row.index}.${match[2]}`};});
  setIssues(validation);if(validation.length){requestAnimationFrame(()=>focus(validation[0].field));return;}
  setBusy(true);
  try{const response=await fetch(`/api/backend/me/researcher-profile?event=${encodeURIComponent(contextKey)}&lang=${locale}`,{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});const data=await response.json();if(!response.ok){if(data.error?.issues?.length){setIssues(data.error.issues);return;}throw new Error((data.error?.message??text.error)+(data.error?.requestId?` (${data.error.requestId})`:''));}warn.current=false;router.replace(fullProfile);router.refresh();}
  catch(cause){setError(cause instanceof Error?cause.message:text.error);}finally{setBusy(false);}
 }
 return <div className="profile-setup">
  <header className="profile-setup-heading"><h1>{text.title}</h1><p>{text.intro}</p></header>
  <section className="panel profile-setup-card">
   <div className="profile-setup-account"><span className="profile-setup-account-icon"><Icon name="check" size={20}/></span><div><span>{text.account}</span><strong>{person.email||person.name}</strong></div></div>
   <form ref={formElement} noValidate onSubmit={event=>{event.preventDefault();void save();}}>
    {(error||issues.length>0)&&<div className="notice notice-error" role="alert">{error||<><strong>{text.review}</strong><ul>{issues.map((issue,index)=><li key={`${issue.field}-${index}`}><button className="profile-validation-link" type="button" onClick={()=>focus(issue.field)}>{profileIssueMessage(issue,locale)}</button></li>)}</ul></>}</div>}
    <div className="profile-setup-basics"><label className="field"><span>{text.name}</span><input name="name" required autoComplete="name" maxLength={150} value={form.name} disabled={busy} aria-invalid={!!fieldError('name')} onChange={event=>{setForm({...form,name:event.target.value});setIssues([]);}}/></label>
    <label className="field"><span>{text.position} <small>{text.optional}</small></span><input name="background.position" autoComplete="organization-title" maxLength={150} placeholder={text.positionExample} value={form.position} disabled={busy} aria-invalid={!!fieldError('background.position')} onChange={event=>{setForm({...form,position:event.target.value});setIssues([]);}}/></label>
    </div>
    <fieldset className="profile-setup-affiliations"><legend>{text.affiliations} <small>{text.optional}</small></legend><p className="profile-help">{text.affiliationHelp}</p>
     {form.affiliations.map((item,index)=><div className="profile-setup-affiliation" key={index}><div className="field-row">
      <label className="field"><span>{text.institution}</span><input name={`affiliations.${index}.institution`} autoComplete="organization" maxLength={250} value={item.institution} disabled={busy} aria-invalid={!!fieldError(`affiliations.${index}.institution`)} onChange={event=>changeAffiliation(index,{institution:event.target.value})}/></label>
      <label className="field"><span>{text.country}</span><select name={`affiliations.${index}.countryCode`} value={item.countryCode} disabled={busy} aria-invalid={!!fieldError(`affiliations.${index}.countryCode`)} onChange={event=>changeAffiliation(index,{countryCode:event.target.value})}><option value="">{text.choose}</option>{countries.map(country=><option key={country.code} value={country.code}>{country.name}</option>)}</select></label>
     </div>{form.affiliations.length>1&&<button type="button" className="button button-outline profile-remove" disabled={busy} aria-label={`${text.remove} ${text.institution.toLowerCase()} ${index+1}`} onClick={()=>{setForm({...form,affiliations:form.affiliations.filter((_,i)=>i!==index)});setIssues([]);}}>{text.remove}</button>}</div>)}
     <button type="button" className="profile-setup-add" disabled={busy||form.affiliations.length>=5} onClick={()=>setForm({...form,affiliations:[...form.affiliations,{institution:'',countryCode:''}]})}><Icon name="plus" size={15}/>{text.add}</button>
    </fieldset>
    <p className="profile-setup-later">{text.later}</p>
    <div className="profile-setup-actions"><button className="button button-primary" type="submit" disabled={busy}>{busy?text.busy:text.save}</button><button className="button button-outline" type="button" disabled={busy} onClick={()=>navigate(()=>router.push(home))}>{text.skip}</button></div>
   </form>
  </section>
  <dialog ref={dialog} className="researcher-close-dialog" aria-labelledby="profile-setup-unsaved" onCancel={()=>{pending.current=null;setClosing(false);}}><h2 id="profile-setup-unsaved">{text.unsaved}</h2><p>{text.unsavedHelp}</p><div className="editor-actions"><button className="button button-primary" onClick={()=>{pending.current=null;setClosing(false);}}>{text.stay}</button><button className="button button-outline" onClick={()=>{warn.current=false;setClosing(false);pending.current?.();pending.current=null;}}>{text.leave}</button></div></dialog>
 </div>;
}
