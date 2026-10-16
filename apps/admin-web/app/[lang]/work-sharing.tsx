'use client';
import { useEffect, useState } from 'react';
import type { AuthorWork, CreatedWorkCollaboration, WorkCollaboration } from '@sep/contracts';
import { webCopy,type Locale } from '@sep/i18n';
export default function WorkSharing({work,personId,eventId,contextKey,locale,busy,onBusyChange,onUpdate}:{work:AuthorWork;personId:string;eventId:string;contextKey:string;locale:Locale;busy:boolean;onBusyChange:(value:boolean)=>void;onUpdate:(work:AuthorWork)=>void}){
  const text=webCopy[locale];const [invitations,setInvitations]=useState<WorkCollaboration[]>([]);const [link,setLink]=useState('');const [error,setError]=useState('');const [copied,setCopied]=useState(false);
  const base=`/api/backend/events/${eventId}/my-works/${work.id}/collaborations`;
  const url=(suffix='')=>`${base}${suffix}?event=${encodeURIComponent(contextKey)}&lang=${locale}`;
  useEffect(()=>{
    const controller=new AbortController();
    void fetch(`${base}?event=${encodeURIComponent(contextKey)}&lang=${locale}`,{signal:controller.signal}).then(async response=>{const data=await response.json();if(!response.ok)throw new Error(data.error?.message??text.serviceHelp);setInvitations(data);}).catch(error=>{if(!controller.signal.aborted)setError(error instanceof Error?error.message:text.serviceHelp);});
    return()=>controller.abort();
  },[base,contextKey,locale,work.revision,text.serviceHelp]);
  async function mutate(suffix:string,body:unknown,create=false){
    onBusyChange(true);setError('');setCopied(false);
    try{const response=await fetch(url(suffix),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});const data=await response.json();if(!response.ok)throw new Error(data.error?.message??text.serviceHelp);
      if(create){const result=data as CreatedWorkCollaboration;setLink(`${window.location.origin}/${locale}/work-invitations/${result.token}?event=${encodeURIComponent(contextKey)}`);onUpdate(result.work);}else{setLink('');onUpdate(data as AuthorWork);}
    }catch(error){setError(error instanceof Error?error.message:text.serviceHelp);}finally{onBusyChange(false);}
  }
  const corresponding=work.authors.find(author=>author.corresponding);const active=invitations.some(item=>item.authorId===corresponding?.id&&['pending','accepted'].includes(item.status));
  return <section className="work-section work-sharing"><div className="work-detail-header"><div><h3>{text.sharedManagement}</h3><p className="muted small">{text.sharedManagementHelp}</p></div></div>
    {error&&<p className="notice notice-error" role="alert">{error}</p>}
    {corresponding&&<p><strong>{corresponding.fullName}</strong> · {corresponding.email}</p>}
    <button className="button button-outline" type="button" disabled={busy||!corresponding?.email||active||corresponding.personId===personId} onClick={()=>{if(corresponding&&window.confirm(text.confirmShareWork))void mutate('',{revision:work.revision,authorId:corresponding.id},true);}}>{text.inviteCorrespondingAuthor}</button>
    <p className="muted small">{corresponding?.personId===personId?text.selfCorrespondingHelp:text.shareLinkHelp}</p>
    {link&&<div className="form-fields"><label className="field"><span>{text.workInvitationLink}</span><input readOnly value={link} onFocus={event=>event.target.select()}/></label><button className="button button-outline" type="button" onClick={()=>{if(!navigator.clipboard){setError(text.copyLinkManually);return;}void navigator.clipboard.writeText(link).then(()=>setCopied(true)).catch(()=>setError(text.copyLinkManually));}}>{copied?text.workLinkCopied:text.copyWorkLink}</button></div>}
    <div className="work-author-list">{invitations.map(item=><article className="work-author-card" key={item.id}><div className="work-author-info"><strong>{item.email}</strong><p className="muted small">{text.collaborationStatuses[item.status]} · {item.acceptedAt?new Intl.DateTimeFormat(locale,{dateStyle:'medium'}).format(new Date(item.acceptedAt)):new Intl.DateTimeFormat(locale,{dateStyle:'medium'}).format(new Date(item.expiresAt))}</p></div>{['pending','accepted'].includes(item.status)&&<button className="button button-outline" type="button" disabled={busy} onClick={()=>{if(window.confirm(text.revokeWorkAccessConfirm))void mutate(`/${item.id}/revoke`,{revision:work.revision});}}>{text.revokeWorkAccess}</button>}</article>)}</div>
  </section>;
}
