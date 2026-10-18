'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Brand, Icon } from '@sep/ui';
import { webCopy, type Locale } from '@sep/i18n';
import AuthorshipNav from './authorship-nav';
import WorkNoticesNav from './work-notices-nav';
import ReviewNav from './peer-review-nav';
import NotificationNav from './notification-nav';
import {communicationCopy} from './communications-common';
import {certificateCopy} from './certificates-common';
import {attendanceCopy} from './attendance-common';
import {registrationCopy} from './registration-common';
import {programCopy} from './program-copy';
import {reviewCopy} from './peer-review-copy';
import { authorshipCopy } from './authorship-copy';

type Guard = (action: () => void) => void;
const NavigationGuard = createContext<(guard: Guard | null) => void>(() => {});
export function useParticipantNavigationGuard(guard: Guard) {
  const register = useContext(NavigationGuard);
  useEffect(() => { register(guard); return () => register(null); }, [register, guard]);
}
export const participantCopy = {
  es: { space:'Mi espacio', account:'Opciones de mi cuenta', home:'SEP · Inicio de Mi espacio', navigation:'Participación en el evento', public:'Ir al portal público', noEvent:'Selecciona un evento desde su portal para consultar tus trabajos y autorías.' },
  en: { space:'My workspace', account:'My account options', home:'SEP · My workspace home', navigation:'Event participation', public:'Go to public portal', noEvent:'Select an event from its portal to view your works and authorship.' },
} as const;
export default function ParticipantShell({children,person,locale,contextKey,eventId,tab,publicUrl,busy=false,onNavigate,onCurrentWorks}: {
  children:ReactNode; person:{name:string}; locale:Locale; contextKey:string; eventId?:string|null; tab:'works'|'authorship'|'profile'|'reviews'|'participation'|'registration'|'accreditation'|'certificates'|'notifications'; publicUrl:string;
  busy?:boolean; onNavigate?:Guard; onCurrentWorks?:()=>void;
}) {
  const text=webCopy[locale], copy=participantCopy[locale];
  const [signingOut,setSigningOut]=useState(false), [error,setError]=useState('');
  const registeredGuard=useRef<Guard|null>(null), account=useRef<HTMLDetailsElement>(null);
  const register=useCallback((guard:Guard|null)=>{registeredGuard.current=guard;},[]);
  const prefix=`/${locale}?event=${encodeURIComponent(contextKey)}&tab=`;
  const home=eventId?prefix+'works':prefix+'profile';
  const pageName=tab==='notifications'?communicationCopy[locale].notifications:tab==='certificates'?certificateCopy[locale].mine:tab==='accreditation'?attendanceCopy[locale].mine:tab==='registration'?registrationCopy[locale].mine:tab==='participation'?programCopy[locale].participation:tab==='reviews'?reviewCopy[locale].mine:tab==='profile'?text.myProfile:tab==='works'?text.myWorks:authorshipCopy[locale].title;
  const names=person.name.trim().split(/\s+/u);
  const initials=[names[0],...(names.length>1?[names.at(-1)!]:[])].map(name=>Array.from(name)[0]??'').join('').toLocaleUpperCase(locale);
  function guard(action:()=>void) { if(busy||signingOut)return; (onNavigate??registeredGuard.current??((next:()=>void)=>next()))(action); }
  function navigate(href:string) { account.current?.removeAttribute('open'); guard(()=>window.location.assign(href)); }
  async function signOut() {
    setSigningOut(true); setError('');
    try { const response=await fetch(`/api/auth/logout?lang=${locale}`,{method:'POST'}); const data=await response.json(); if(!response.ok)throw new Error(data.error?.message??text.serviceHelp); window.location.assign(data.redirectTo??`/${locale}`); }
    catch(e) { setError(e instanceof Error?e.message:text.serviceHelp);setSigningOut(false); }
  }
  useEffect(()=>{
    const outside=(event:PointerEvent)=>{if(!account.current?.contains(event.target as Node))account.current?.removeAttribute('open');};
    const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'&&account.current?.open){account.current.removeAttribute('open');account.current.querySelector('summary')?.focus();}};
    document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);
    return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape);};
  },[]);
  return <NavigationGuard.Provider value={register}><div className="admin-shell participant-shell"><a className="skip-link" href="#main">{text.skip}</a>
    <aside className="sidebar"><a className="participant-brand" href={home} aria-label={copy.home} onClick={event=>{event.preventDefault();if(tab==='works'&&onCurrentWorks)onCurrentWorks();else navigate(home);}}><Brand compact/></a><p className="workspace-label">{copy.space}</p>
      <nav aria-label={copy.navigation}>{eventId?<>
        <a href={prefix+'works'} className={tab==='works'?'active':undefined} aria-current={tab==='works'?'page':undefined} onClick={event=>{event.preventDefault();if(tab==='works'&&onCurrentWorks)onCurrentWorks();else navigate(prefix+'works');}}><Icon name="book" size={18}/><span><WorkNoticesNav eventId={eventId} contextKey={contextKey} locale={locale}/></span></a>
        <a href={prefix+'registration'} className={tab==='registration'?'active':undefined} aria-current={tab==='registration'?'page':undefined} onClick={event=>{event.preventDefault();navigate(prefix+'registration');}}><Icon name="check" size={18}/><span>{registrationCopy[locale].mine}</span></a>
        <a href={prefix+'accreditation'} className={tab==='accreditation'?'active':undefined} aria-current={tab==='accreditation'?'page':undefined} onClick={event=>{event.preventDefault();navigate(prefix+'accreditation');}}><Icon name="check" size={18}/><span>{attendanceCopy[locale].mine}</span></a>
        <a href={prefix+'certificates'} className={tab==='certificates'?'active':undefined} aria-current={tab==='certificates'?'page':undefined} onClick={event=>{event.preventDefault();navigate(prefix+'certificates');}}><Icon name="book" size={18}/><span>{certificateCopy[locale].mine}</span></a>
        <a href={prefix+'authorship'} className={tab==='authorship'?'active':undefined} aria-current={tab==='authorship'?'page':undefined} onClick={event=>{event.preventDefault();navigate(prefix+'authorship');}}><Icon name="check" size={18}/><span><AuthorshipNav eventId={eventId} contextKey={contextKey} locale={locale}/></span></a>
        <a href={prefix+'reviews'} className={tab==='reviews'?'active':undefined} aria-current={tab==='reviews'?'page':undefined} onClick={event=>{event.preventDefault();navigate(prefix+'reviews');}}><Icon name="edit" size={18}/><span><ReviewNav eventId={eventId} contextKey={contextKey} locale={locale}/></span></a>
        <a href={prefix+'participation'} className={tab==='participation'?'active':undefined} aria-current={tab==='participation'?'page':undefined} onClick={event=>{event.preventDefault();navigate(prefix+'participation');}}><Icon name="calendar" size={18}/><span>{programCopy[locale].participation}</span></a>
        <a href={prefix+'notifications'} className={tab==='notifications'?'active':undefined} aria-current={tab==='notifications'?'page':undefined} onClick={event=>{event.preventDefault();navigate(prefix+'notifications');}}><Icon name="book" size={18}/><span><NotificationNav eventId={eventId} contextKey={contextKey} locale={locale}/></span></a>
      </>:<p className="participant-no-event">{copy.noEvent}</p>}</nav>
      {publicUrl&&<div className="sidebar-bottom"><a href={publicUrl} onClick={event=>{event.preventDefault();navigate(publicUrl);}}><Icon name="external" size={17}/><span>{text.publicPortal}</span></a></div>}
    </aside>
    <div className="admin-area"><header className="admin-topbar participant-topbar"><div className="participant-breadcrumb"><span>{copy.space}</span><span aria-hidden="true">/</span><strong>{pageName}</strong></div>
      <div className="topbar-right"><nav className="language-switch" aria-label={locale==='es'?'Idioma':'Language'}>{(['es','en'] as const).map(language=><a key={language} href={`/${language}?event=${encodeURIComponent(contextKey)}&tab=${tab}`} className={locale===language?'active':undefined} aria-current={locale===language?'true':undefined} onClick={event=>{event.preventDefault();navigate(`/${language}?event=${encodeURIComponent(contextKey)}&tab=${tab}`);}}>{language.toUpperCase()}</a>)}</nav>
        <details className="participant-account" ref={account}><summary aria-label={`${copy.account}: ${person.name}`}><span className="participant-avatar" aria-hidden="true">{initials}</span><span className="participant-name">{person.name}</span><span className="participant-chevron" aria-hidden="true">⌄</span></summary>
          <div className="participant-account-menu"><p>{person.name}</p><a href={prefix+'profile'} aria-current={tab==='profile'?'page':undefined} onClick={event=>{event.preventDefault();if(tab!=='profile')navigate(prefix+'profile');else account.current?.removeAttribute('open');}}><Icon name="settings" size={17}/>{text.myProfile}</a>
            {publicUrl&&<a className="participant-mobile-portal" href={publicUrl} onClick={event=>{event.preventDefault();navigate(publicUrl);}}><Icon name="external" size={17}/>{text.publicPortal}</a>}
            <button type="button" disabled={busy||signingOut} onClick={()=>{account.current?.removeAttribute('open');guard(()=>{void signOut();});}}><Icon name="logout" size={17}/>{text.logout}</button>
          </div>
        </details>
      </div>
    </header><main id="main" className={`admin-main participant-main participant-${tab}`}>{error&&<p className="notice notice-error" role="alert">{error}</p>}{children}</main></div>
  </div></NavigationGuard.Provider>;
}
