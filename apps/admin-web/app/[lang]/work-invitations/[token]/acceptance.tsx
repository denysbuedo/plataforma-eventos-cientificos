'use client';
import { useState } from 'react';
import { Brand } from '@sep/ui';
import { webCopy,type Locale } from '@sep/i18n';
import SignInButtons from '../../sign-in-buttons';
export default function Acceptance({locale,token,eventId,contextKey,accountName,demo,institutional,googleEnabled,redunivEnabled}:{locale:Locale;token:string;eventId:string;contextKey:string;accountName:string|null;demo:boolean;institutional:boolean;googleEnabled:boolean;redunivEnabled:boolean}){
  const text=webCopy[locale];const [busy,setBusy]=useState(false);const [accepted,setAccepted]=useState(false);const [error,setError]=useState('');const [confirmed,setConfirmed]=useState(false);
  async function accept(){setBusy(true);setError('');try{const response=await fetch(`/api/backend/events/${eventId}/work-collaborations/accept?event=${encodeURIComponent(contextKey)}&lang=${locale}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({token})});const data=await response.json();if(!response.ok)throw new Error(data.error?.message??text.serviceHelp);setAccepted(true);}catch(error){setError(error instanceof Error?error.message:text.serviceHelp);}finally{setBusy(false);}}
  async function demoSignIn(persona:string){setBusy(true);try{const response=await fetch('/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({persona})});if(!response.ok)throw new Error(text.noAuth);window.location.reload();}catch(error){setError(error instanceof Error?error.message:text.serviceHelp);setBusy(false);}}
  return <main className="invitation-page"><Brand/><section className="panel form-panel work-content"><div><span className="eyebrow">{text.sharedManagement}</span><h1>{accepted?text.workAccessAccepted:text.workAccessInvitation}</h1></div><p>{accepted?text.workAccessAcceptedHelp:text.workAccessInvitationHelp}</p>
    {error&&<p className="notice notice-error" role="alert">{error}</p>}
    {!accepted&&<>{accountName&&<p>{text.invitationAccount} <strong>{accountName}</strong></p>}<label><input type="checkbox" checked={confirmed} disabled={!accountName||busy} onChange={event=>setConfirmed(event.target.checked)}/> {text.confirmWorkAccess}</label><button className="button button-primary" disabled={!accountName||busy||!confirmed} onClick={()=>{void accept();}}>{busy?text.saving:text.acceptWorkAccess}</button>
      {institutional&&!accountName&&<SignInButtons locale={locale} googleEnabled={googleEnabled} redunivEnabled={redunivEnabled} returnTo={`/${locale}/work-invitations/${token}?event=${encodeURIComponent(contextKey)}`}/>}
      {demo&&<section><p className="notice notice-muted">{text.workAccessDemoHelp}</p><div className="editor-actions"><button className="button button-outline" disabled={busy} onClick={()=>{void demoSignIn('mixed');}}>{text.demoCollaborator}</button><button className="button button-outline" disabled={busy} onClick={()=>{void demoSignIn('outsider');}}>{text.demoSender}</button></div></section>}
    </>}
    <a className="button button-outline" href={`/${locale}?event=${encodeURIComponent(contextKey)}&tab=works`}>{text.myWorks}</a>
  </section></main>;
}
