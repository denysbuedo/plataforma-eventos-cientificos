'use client';
import { useState } from 'react';
import { type AuthorWork, type WorkVersion, type WorkContent } from '@sep/contracts';
import { webCopy, type Locale } from '@sep/i18n';
import WorkAuthors from './work-authors';
export function WorkContentView({content,locale}:{content:WorkContent;locale:Locale}) {
  const text=webCopy[locale];return <div className="work-content">
    <h3 className="work-title">{content.title}</h3>
    <dl className="work-metadata">
      <div><dt>{text.scientificTracks}</dt><dd>{content.call.content.tracks.find(t=>t.id===content.trackId)?.[locale==='es'?'nameEs':'nameEn']??text.workIncomplete}</dd></div>
      <div><dt>{text.contributionTypes}</dt><dd>{content.call.content.contributionTypes.find(t=>t.id===content.contributionTypeId)?.[locale==='es'?'nameEs':'nameEn']??text.workIncomplete}</dd></div>
      <div><dt>{text.workLanguage}</dt><dd>{content.language==='es'?text.languageSpanish:text.languageEnglish}</dd></div>
    </dl>
    <section className="work-section"><h3>{text.workAbstract}</h3><p className="work-abstract">{content.abstract||text.workIncomplete}</p></section>
    <section className="work-section"><h3>{text.callKeywords}</h3><p className="work-keywords">{content.keywords.length?content.keywords.map(k=>k.trim().replace(/[;,]+$/u,'')).join('; '):text.workIncomplete}</p></section>
    <WorkAuthors value={content.authors} onChange={()=>{}} locale={locale} editing={false}/>
  </div>;
}
export default function WorkFlow({work,eventId,locale,contextKey,busy,onBusyChange,onUpdate,callChanged=false,staff=false}:{
  work:AuthorWork;eventId:string;locale:Locale;contextKey:string;busy:boolean;onBusyChange:(busy:boolean)=>void;onUpdate:(work:AuthorWork)=>void;callChanged?:boolean;staff?:boolean;
}) {
  const text=webCopy[locale];const [error,setError]=useState('');const [confirmed,setConfirmed]=useState(false);const [reason,setReason]=useState('');const [version,setVersion]=useState<WorkVersion|null>(null);
  const base=`/api/backend/events/${eventId}/${staff?'submissions':'my-works'}/${work.id}`;
  const url=(action:string)=>`${base}/${action}?event=${encodeURIComponent(contextKey)}&lang=${locale}`;
  async function request<T>(action:string,method='POST',body?:unknown):Promise<T> {
    const multipart=body instanceof FormData;const res=await fetch(url(action),{method,headers:multipart?undefined:{'content-type':'application/json'},body:body===undefined?undefined:multipart?body as FormData:JSON.stringify(body)});const data=await res.json();
    if(res.status===401)window.location.assign(`/${locale}?event=${encodeURIComponent(contextKey)}&tab=${staff?'submissions':'works'}`);
    if(!res.ok)throw new Error(data.error?.message??text.serviceHelp);return data as T;
  }
  async function run(action:()=>Promise<void>) {onBusyChange(true);setError('');try{await action();}catch(e){setError(e instanceof Error?e.message:text.serviceHelp);}finally{onBusyChange(false);}}
  function update(action:string,body:unknown,method='POST'){void run(async()=>onUpdate(await request<AuthorWork>(action,method,body)));}
  const canSubmit=work.editable&&['draft','withdrawn','changes_requested','final_requested'].includes(work.status);
  const canWithdraw=['submitted','in_review','changes_requested','accepted','final_requested','final_submitted'].includes(work.status);
  return <section style={{marginTop:'1.5rem'}}>
    <h3>{text.workTracking}</h3><p><strong>{text.status}: {text.workStatuses[work.status]}</strong></p>
    {work.responseDeadline&&<p>{text.workResponseBy}: {work.responseDeadline} · {work.call.timezone}</p>}
    {error&&<div className="notice notice-error" role="alert">{error}</div>}
    <h4>{text.workManuscript}</h4>
    {work.manuscript?<div><p>{work.manuscript.name} · {work.manuscript.pages} {text.workPages} · {Math.ceil(work.manuscript.bytes/1024)} KiB</p>
      {work.manuscript.scan==='demo_unscanned'&&<p className="notice notice-muted">{text.workUnscanned}</p>}
      <a className="button button-outline" href={url(`files/${work.manuscript.id}`)}>{text.downloadManuscript}</a>
    </div>:<p className="muted">{text.noManuscript}</p>}
    {!staff&&callChanged&&work.editable&&['draft','withdrawn'].includes(work.status)&&<button type="button" className="button button-outline" disabled={busy} onClick={()=>{if(window.confirm(text.syncCallConfirm))update('synchronize-call',{revision:work.revision});}}>{text.syncCall}</button>}
    {!staff&&canSubmit&&<div className="form-fields"><p className="muted small">{text.workSubmitHelp}</p><label><input type="checkbox" checked={confirmed} disabled={busy} onChange={(e)=>setConfirmed(e.target.checked)}/> {text.confirmSubmission}</label>
      <button type="button" className="button button-primary" disabled={busy||!confirmed||callChanged&&['draft','withdrawn'].includes(work.status)} onClick={()=>{if(window.confirm(text.submitWorkConfirm))update('submit',{revision:work.revision,confirmed:true});}}>{work.status==='final_requested'?text.submitFinal:work.versions.length?text.resubmitWork:text.submitWork}</button>
    </div>}
    {!staff&&canWithdraw&&<div className="form-fields" style={{marginTop:'1rem'}}><label className="field"><span>{text.withdrawReason}</span><textarea minLength={10} maxLength={2000} rows={3} value={reason} disabled={busy} onChange={(e)=>setReason(e.target.value)}/></label><button type="button" className="button button-outline" disabled={busy||reason.trim().length<10} onClick={()=>{if(window.confirm(text.withdrawWorkConfirm))update('withdraw',{revision:work.revision,message:reason.trim()});}}>{text.withdrawWork}</button></div>}
    <h4>{text.workVersions}</h4>{!work.versions.length&&<p className="muted">{text.noWorkVersions}</p>}
    {work.versions.map(item=><div className="panel-heading" key={item.id}><span>{text.revision} {item.number} · {item.kind==='final'?text.finalVersion:text.submissionVersion}</span><button type="button" className="button button-outline" disabled={busy} onClick={()=>run(async()=>setVersion(await request<WorkVersion>(`versions/${item.id}`,'GET')))}>{text.viewWork}</button></div>)}
    {version&&<section className="panel form-panel"><div className="panel-heading"><h4>{text.revision} {version.number} · {text.immutableVersion}</h4><button type="button" className="button button-outline" onClick={()=>setVersion(null)}>{text.closeVersion}</button></div><WorkContentView content={version.content} locale={locale}/>{version.content.manuscript&&<a className="button button-outline" href={url(`files/${version.content.manuscript.id}`)}>{text.downloadManuscript}</a>}</section>}
    <h4>{text.workHistory}</h4>{!work.history.length&&<p className="muted">{text.noWorkHistory}</p>}
    <ol>{work.history.map(item=><li key={item.id} style={{marginBottom:'1rem'}}><strong>{(text.workActions as Record<string,string>)[item.action]??item.action}</strong><p className="muted small">{new Intl.DateTimeFormat(locale,{dateStyle:'medium',timeStyle:'short',timeZone:work.call.timezone}).format(new Date(item.createdAt))} · {item.actor==='staff'?text.eventTeam:text.author}</p>{item.message&&<p style={{whiteSpace:'pre-wrap'}}>{item.message}</p>}</li>)}</ol>
  </section>;
}
