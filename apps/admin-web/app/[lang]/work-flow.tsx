'use client';
import { useState, type ReactNode } from 'react';
import { type AuthorWork, type WorkVersion, type WorkContent } from '@sep/contracts';
import { webCopy, type Locale } from '@sep/i18n';
import WorkAuthors from './work-authors';
import {WorkResponseView} from './work-response';
import { Icon } from '@sep/ui';
import { trackingCopy } from './work-flow-copy';
export function WorkContentView({content,locale,showTitle=true,showResponse=true}:{content:WorkContent;locale:Locale;showTitle?:boolean;showResponse?:boolean}) {
  const text=webCopy[locale];return <div className="work-content">
    {showTitle&&<h3 className="work-title">{content.title}</h3>}
    <dl className="work-metadata">
      <div><dt>{text.scientificTracks}</dt><dd>{content.call.content.tracks.find(t=>t.id===content.trackId)?.[locale==='es'?'nameEs':'nameEn']??text.workIncomplete}</dd></div>
      <div><dt>{text.contributionTypes}</dt><dd>{content.call.content.contributionTypes.find(t=>t.id===content.contributionTypeId)?.[locale==='es'?'nameEs':'nameEn']??text.workIncomplete}</dd></div>
      <div><dt>{text.workLanguage}</dt><dd>{content.language==='es'?text.languageSpanish:text.languageEnglish}</dd></div>
    </dl>
    <section className="work-section"><h3>{text.workAbstract}</h3><p className="work-abstract">{content.abstract||text.workIncomplete}</p></section>
    <section className="work-section"><h3>{text.callKeywords}</h3><p className="work-keywords">{content.keywords.length?content.keywords.map(k=>k.trim().replace(/[;,]+$/u,'')).join('; '):text.workIncomplete}</p></section>
    {showResponse&&content.reviewResponse&&<WorkResponseView response={content.reviewResponse} locale={locale}/>}
    <WorkAuthors value={content.authors} onChange={()=>{}} locale={locale} editing={false}/>
  </div>;
}
export default function WorkFlow({work,eventId,locale,contextKey,busy,onBusyChange,onUpdate,onEdit,callChanged=false,staff=false,feedback,editing=false}:{
  work:AuthorWork;eventId:string;locale:Locale;contextKey:string;busy:boolean;onBusyChange:(busy:boolean)=>void;onUpdate:(work:AuthorWork)=>void;onEdit?:()=>void;callChanged?:boolean;staff?:boolean;feedback?:ReactNode;editing?:boolean;
}) {
  const text=webCopy[locale],copy=trackingCopy[locale];const [expandedHistory,setExpandedHistory]=useState(false);const [error,setError]=useState('');const [reason,setReason]=useState('');const [version,setVersion]=useState<WorkVersion|null>(null);
  const base=`/api/backend/events/${eventId}/${staff?'submissions':'my-works'}/${work.id}`;
  const url=(action:string)=>`${base}/${action}?event=${encodeURIComponent(contextKey)}&lang=${locale}`;
  async function request<T>(action:string,method='POST',body?:unknown):Promise<T> {
    const multipart=body instanceof FormData;const res=await fetch(url(action),{method,headers:multipart?undefined:{'content-type':'application/json'},body:body===undefined?undefined:multipart?body as FormData:JSON.stringify(body)});const data=await res.json();
    if(res.status===401)window.location.assign(`/${locale}?event=${encodeURIComponent(contextKey)}&tab=${staff?'submissions':'works'}`);
    if(!res.ok)throw new Error(data.error?.message??text.serviceHelp);return data as T;
  }
  async function run(action:()=>Promise<void>) {onBusyChange(true);setError('');try{await action();}catch(e){setError(e instanceof Error?e.message:text.serviceHelp);}finally{onBusyChange(false);}}
  function update(action:string,body:unknown,method='POST'){void run(async()=>onUpdate(await request<AuthorWork>(action,method,body)));}
  const canWithdraw=['submitted','in_review','changes_requested','accepted','final_requested','final_submitted'].includes(work.status);
  const dateTime=(value:string)=>new Intl.DateTimeFormat(locale,{dateStyle:'medium',timeStyle:'short',timeZone:work.call.timezone}).format(new Date(value));
  // Deadlines are calendar dates in the event timezone, not UTC instants.
  const deadline=work.responseDeadline?new Intl.DateTimeFormat(locale,{dateStyle:'long',timeZone:'UTC'}).format(new Date(`${work.responseDeadline}T12:00:00Z`)):null;
  const versions=[...work.versions].sort((a,b)=>b.number-a.number);
  const history=[...work.history].sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt));
  const latestDecision=history.find(item=>item.actor==='staff'&&['in_review','changes_requested','accepted','rejected','final_requested'].includes(item.action)&&item.message);
  const visibleHistory=expandedHistory?history:history.slice(0,6);
  const actionNeeded=['draft','withdrawn','changes_requested','final_requested'].includes(work.status);
  return <section className="work-tracking" aria-labelledby={`tracking-${work.id}`}>
    <div className="tracking-heading"><div><h3 id={`tracking-${work.id}`}>{text.workTracking}</h3><p className="profile-help">{copy.intro}</p></div><span className={`participant-work-status participant-work-status-${work.status}`}>{text.workStatuses[work.status]}</span></div>
    {error&&<div className="notice notice-error" role="alert">{error}</div>}
    <div className={`tracking-overview ${actionNeeded?'tracking-overview-action':''}`}>
      <div className="tracking-next"><span className="profile-note-icon"><Icon name={actionNeeded?'edit':work.status==='accepted'||work.status==='final_submitted'?'check':'book'} size={22}/></span><div><h4>{copy.next}</h4><p>{staff?copy.staffNext:actionNeeded&&!work.editable?copy.notEditable:copy.steps[work.status]}</p>{!staff&&!editing&&actionNeeded&&work.editable&&onEdit&&<button type="button" className="button button-outline tracking-edit" disabled={busy} onClick={onEdit}><Icon name="edit" size={16}/>{text.editWork}</button>}</div></div>
      <dl className="tracking-facts"><div><dt><Icon name="book" size={15}/>{copy.lastSubmission}</dt><dd>{versions[0]?<><strong>{copy.version} {versions[0].number} · {versions[0].kind==='final'?text.finalVersion:text.submissionVersion}</strong><time dateTime={versions[0].createdAt}>{dateTime(versions[0].createdAt)}</time></>:<strong>{copy.notSubmitted}</strong>}</dd></div><div><dt><Icon name="calendar" size={15}/>{copy.deadline}</dt><dd>{deadline?<strong><time dateTime={work.responseDeadline!}>{deadline}</time></strong>:<span>{copy.noDeadline}</span>}<small>{copy.timezone}: {work.call.timezone}</small></dd></div></dl>
    </div>
    {feedback}
    {!staff&&work.reviewResponse&&<WorkResponseView response={work.reviewResponse} locale={locale}/>}
    {staff&&latestDecision&&<section className="tracking-message"><div className="tracking-section-heading"><h4>{copy.latestMessage}</h4><span className="profile-count">{(text.workActions as Record<string,string>)[latestDecision.action]??copy.activity}</span></div><blockquote>{latestDecision.message}</blockquote><p className="tracking-meta">{latestDecision.actorName||text.eventTeam} · <time dateTime={latestDecision.createdAt}>{dateTime(latestDecision.createdAt)}</time></p></section>}
    <section className="tracking-section"><div className="tracking-section-heading"><h4>{text.workManuscript}</h4></div>
      {work.manuscript?<><div className="tracking-file"><span className="profile-affiliation-icon"><Icon name="book" size={21}/></span><div><strong>{work.manuscript.name}</strong><p className="tracking-meta">PDF · {work.manuscript.pages} {text.workPages} · {Math.ceil(work.manuscript.bytes/1024)} KiB</p></div><a className="button button-outline" href={url(`files/${work.manuscript.id}`)}>{text.downloadManuscript}</a></div>{work.manuscript.scan==='demo_unscanned'&&<p className="tracking-meta">{text.workUnscanned}</p>}</>:<p className="profile-help">{text.noManuscript}</p>}
    </section>
    {!staff&&!editing&&callChanged&&work.editable&&['draft','withdrawn'].includes(work.status)&&<div className="tracking-call-update"><button type="button" className="button button-outline" disabled={busy} onClick={()=>{if(window.confirm(text.syncCallConfirm))update('synchronize-call',{revision:work.revision});}}>{text.syncCall}</button></div>}
    <section className="tracking-section"><div className="tracking-section-heading"><h4>{text.workVersions}</h4><span className="profile-count">{versions.length}</span></div><p className="profile-help">{copy.versionsHelp}</p>
      {!versions.length?<p className="tracking-empty">{text.noWorkVersions}</p>:<ul className="tracking-versions">{versions.map((item,index)=><li key={item.id}><span className="tracking-version-number" aria-hidden="true">V{item.number}</span><div><strong>{copy.version} {item.number} · {item.kind==='final'?text.finalVersion:text.submissionVersion}</strong><p className="tracking-meta"><time dateTime={item.createdAt}>{dateTime(item.createdAt)}</time>{index===0&&<span className="tracking-latest">{copy.currentVersion}</span>}</p></div><button type="button" className="button button-outline" aria-label={`${copy.viewVersion} ${item.number}`} aria-expanded={version?.id===item.id} disabled={busy} onClick={()=>{void run(async()=>setVersion(await request<WorkVersion>(`versions/${item.id}`,'GET')));}}>{text.viewWork}</button></li>)}</ul>}
      {version&&<section className="tracking-version-detail"><div className="tracking-section-heading"><div><h4>{copy.version} {version.number}</h4><p className="tracking-meta">{text.immutableVersion} · {dateTime(version.createdAt)}</p></div><button type="button" className="button button-outline" onClick={()=>setVersion(null)}>{text.closeVersion}</button></div><WorkContentView content={version.content} locale={locale}/>{version.content.manuscript&&<a className="button button-outline" href={url(`files/${version.content.manuscript.id}`)}>{text.downloadManuscript}</a>}</section>}
    </section>
    <section className="tracking-section"><div className="tracking-section-heading"><h4>{text.workHistory}</h4><span className="profile-count">{history.length}</span></div><p className="profile-help">{copy.historyHelp}</p>
      {!history.length?<p className="tracking-empty">{text.noWorkHistory}</p>:<ol className="tracking-timeline">{visibleHistory.map(item=><li key={item.id} className={item.actor==='staff'?'tracking-event-staff':''}><span className="tracking-event-dot" aria-hidden="true"/><div><div className="tracking-event-heading"><strong>{(text.workActions as Record<string,string>)[item.action]??copy.activity}</strong><time dateTime={item.createdAt}>{dateTime(item.createdAt)}</time></div><p className="tracking-meta">{item.actorName||(item.actor==='staff'?text.eventTeam:text.author)}</p>{item.message&&<p className="tracking-event-message">{item.message}</p>}</div></li>)}</ol>}
      {history.length>6&&<button type="button" className="button button-outline" aria-expanded={expandedHistory} onClick={()=>setExpandedHistory(!expandedHistory)}>{expandedHistory?copy.showLess:`${copy.showAll} (${history.length})`}</button>}
    </section>
    {!staff&&!editing&&work.canManage!==false&&canWithdraw&&<details className="tracking-withdraw"><summary>{copy.withdrawHeading}</summary><div><p className="profile-help">{copy.withdrawHelp}</p><label className="field"><span>{text.withdrawReason}</span><textarea minLength={10} maxLength={2000} rows={3} value={reason} disabled={busy} onChange={(e)=>setReason(e.target.value)}/></label><button type="button" className="button button-outline" disabled={busy||reason.trim().length<10} onClick={()=>{if(window.confirm(text.withdrawWorkConfirm))update('withdraw',{revision:work.revision,message:reason.trim()});}}>{text.withdrawWork}</button></div></details>}
  </section>;
}
