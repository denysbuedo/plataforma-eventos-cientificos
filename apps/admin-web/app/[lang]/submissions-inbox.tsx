'use client';
import { useState } from 'react';
import { WORK_STATUSES } from '@sep/contracts';
import type { StaffWork,SubmissionPage,WorkStatus } from '@sep/contracts';
import { webCopy,type Locale } from '@sep/i18n';
import WorkFlow,{WorkContentView} from './work-flow';
export default function SubmissionsInbox({initial,eventId,contextKey,locale}:{initial:SubmissionPage;eventId:string;contextKey:string;locale:Locale}) {
  const text=webCopy[locale];const [page,setPage]=useState(initial);const [work,setWork]=useState<StaffWork|null>(null);const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  const [filter,setFilter]=useState('');const [search,setSearch]=useState('');
  const [deciding,setDeciding]=useState(false);const [decision,setDecision]=useState('in_review');const [message,setMessage]=useState('');const [deadline,setDeadline]=useState('');
  async function request<T>(path:string,method='GET',body?:unknown):Promise<T>{const response=await fetch(`/api/backend/events/${eventId}/submissions${path}${path.includes('?')?'&':'?'}event=${encodeURIComponent(contextKey)}&lang=${locale}`,{method,headers:{'content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});const data=await response.json();if(response.status===401)window.location.assign(`/${locale}?event=${encodeURIComponent(contextKey)}`);if(!response.ok)throw new Error(data.error?.message??text.serviceHelp);return data as T;}
  async function run(action:()=>Promise<void>){setBusy(true);setError('');try{await action();}catch(e){setError(e instanceof Error?e.message:text.serviceHelp);}finally{setBusy(false);}}
  function select(next:StaffWork){setWork(next);setDeciding(false);setMessage('');setDeadline('');setDecision(next.status==='accepted'?'final_requested':'in_review');}
  async function refresh(offset=page.offset){await run(async()=>{setPage(await request<SubmissionPage>(`?limit=${page.limit}&offset=${offset}${filter?`&status=${filter}`:''}${search.trim()?`&q=${encodeURIComponent(search.trim())}`:''}`));setWork(null);setDeciding(false);});}
  const actions:WorkStatus[]=work?.status==='accepted'?['final_requested']:work&&['submitted','in_review','final_submitted'].includes(work.status)?['in_review','changes_requested','accepted','rejected'].filter(s=>s!==work.status) as WorkStatus[]:[];
  return <>
    <p className="notice notice-muted">{text.staffScopeHelp}</p>{error&&<div className="notice notice-error" role="alert">{error}</div>}
    <section className="panel form-panel"><div className="panel-heading"><h2>{text.receivedWorks}</h2><button className="button button-outline" disabled={busy} onClick={()=>refresh()}>{text.reloadWorks}</button></div>
      <form className="form-fields" onSubmit={(e)=>{e.preventDefault();void refresh(0);}}><div className="field-row"><label className="field"><span>{text.status}</span><select value={filter} disabled={busy} onChange={(e)=>setFilter(e.target.value)}><option value="">{text.allWorkStates}</option>{WORK_STATUSES.filter(status=>status!=='draft').map(status=><option key={status} value={status}>{text.workStatuses[status]}</option>)}</select></label><label className="field"><span>{text.searchWorkTitle}</span><input value={search} maxLength={100} disabled={busy} onChange={(e)=>setSearch(e.target.value)}/></label></div><button type="submit" className="button button-outline" disabled={busy}>{text.applyWorkFilter}</button></form>
      {!page.data.length&&<p className="muted">{text.noReceivedWorks}</p>}
      {page.data.map(row=><div className="panel-heading" key={row.id}><div><strong>{row.title}</strong><p>{text.workStatuses[row.status]}</p></div><button className="button button-outline" disabled={busy} onClick={()=>run(async()=>select(await request<StaffWork>(`/${row.id}`)))}>{text.viewWork}</button></div>)}
      <div className="editor-actions"><button className="button button-outline" disabled={busy||page.offset===0} onClick={()=>refresh(Math.max(0,page.offset-page.limit))}>{text.previousPage}</button><button className="button button-outline" disabled={busy||page.data.length<page.limit} onClick={()=>refresh(page.offset+page.limit)}>{text.nextPage}</button></div>
    </section>
    {work&&<section className="panel form-panel"><div className="panel-heading"><h2>{work.title}</h2><button className="button button-outline" disabled={busy} onClick={()=>{setWork(null);setDeciding(false);}}>{text.backToWorks}</button></div><WorkContentView content={work} locale={locale}/>
      <WorkFlow key={`${work.id}:${work.revision}`} work={work} eventId={eventId} contextKey={contextKey} locale={locale} busy={busy} onBusyChange={setBusy} onUpdate={()=>{}} staff/>
      {!work.canDecide&&<p className="muted">{text.noSelfDecision}</p>}
      {work.canDecide&&actions.length>0&&!deciding&&<button className="button button-primary" disabled={busy} onClick={()=>{setDecision(actions[0]);setDeciding(true);}}>{text.manageSubmission}</button>}
      {deciding&&<form className="form-fields" onSubmit={(e)=>{e.preventDefault();if(!window.confirm(text.confirmDecision))return;void run(async()=>{const next=await request<StaffWork>(`/${work.id}/decision`,'POST',{revision:work.revision,decision,message,responseDeadline:['changes_requested','final_requested'].includes(decision)?deadline:null});select(next);setPage({...page,data:page.data.map(row=>row.id===next.id?next:row)});});}}>
        <label className="field"><span>{text.submissionDecision}</span><select value={decision} disabled={busy} onChange={(e)=>setDecision(e.target.value)}>{actions.map(action=><option value={action} key={action}>{text.workStatuses[action]}</option>)}</select></label>
        <label className="field"><span>{text.decisionMessage}</span><textarea required minLength={10} maxLength={2000} rows={5} value={message} disabled={busy} onChange={(e)=>setMessage(e.target.value)}/></label>
        {['changes_requested','final_requested'].includes(decision)&&<label className="field"><span>{text.workResponseBy} · {work.call.timezone}</span><input type="date" required value={deadline} disabled={busy} onChange={(e)=>setDeadline(e.target.value)}/></label>}
        <div className="editor-actions"><button className="button button-primary" disabled={busy} type="submit">{text.saveDecision}</button><button className="button button-outline" disabled={busy} type="button" onClick={()=>setDeciding(false)}>{text.cancel}</button></div>
      </form>}
    </section>}
  </>;
}
