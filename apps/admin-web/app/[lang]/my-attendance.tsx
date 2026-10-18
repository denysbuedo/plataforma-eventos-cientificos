 'use client';
import {useCallback,useState} from 'react';
import type {AttendanceDetail} from '@sep/contracts';
import type {Locale} from '@sep/i18n';
import {useParticipantNavigationGuard} from './participant-shell';
import {attendanceApi,attendanceCopy,AttendanceRecords} from './attendance-common';
export default function MyAttendance({initial,eventId,contextKey,locale}:{initial:AttendanceDetail;eventId:string;contextKey:string;locale:Locale}){
 const c=attendanceCopy[locale],[value,setValue]=useState(initial),[code,setCode]=useState(''),[codeRevision,setCodeRevision]=useState(0),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const request=attendanceApi(eventId,contextKey,locale),canIssue=value.registration?.status==='confirmed';
 const guard=useCallback((next:()=>void)=>{if(!busy)next();},[busy]);useParticipantNavigationGuard(guard);
 async function run(action:()=>Promise<void>){setBusy(true);setError('');try{await action();}catch(e){setError(e instanceof Error?e.message:c.error);}finally{setBusy(false);}}
 async function credential(revoke=false){const response=await request<{detail:AttendanceDetail;code:string|null}>('/credential'+(revoke?'/revoke':''),'POST',{revision:value.credential?.revision??0});setValue(response.detail);setCode(response.code??'');setCodeRevision(response.detail.credential?.revision??0);}
 function download(){const url=URL.createObjectURL(new Blob([`${c.credential}
${value.registration?.name}
${contextKey}
${code}
`],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='sep-credencial.txt';a.click();URL.revokeObjectURL(url);}
 return <div className="registration-module attendance-module"><div className="admin-heading"><div><h1>{c.mine}</h1><p>{c.ownHelp}</p></div><button className="button button-outline" disabled={busy} onClick={()=>void run(async()=>setValue(await request<AttendanceDetail>('/mine')))}>{c.refresh}</button></div>{error&&<p className="notice notice-error" role="alert">{error}</p>}<section className="panel profile-card"><div className="registration-line"><div><h2>{c.credential}</h2><p>{value.credential?.active?c.active:c.inactive}</p></div><div className="editor-actions">{canIssue&&<button className="button button-outline" disabled={busy} onClick={()=>{if(!value.credential?.active||window.confirm(c.rotateConfirm))void run(()=>credential());}}>{busy?c.busy:value.credential?.active?c.rotate:c.issue}</button>}{value.credential?.active&&<button className="button button-outline" disabled={busy} onClick={()=>{if(window.confirm(c.revokeConfirm))void run(()=>credential(true));}}>{c.revoke}</button>}</div></div>{!canIssue&&<p>{c.noRegistration} <a href={`/${locale}?event=${encodeURIComponent(contextKey)}&tab=registration`}>{c.registration}</a></p>}{code&&value.credential?.active&&codeRevision===value.credential.revision&&<div className="attendance-credential"><p><strong>{value.registration?.name}</strong></p><code>{code}</code><p className="profile-help">{c.codeHelp}</p><button className="button button-outline" onClick={download}>{c.download}</button></div>}<p className="profile-help">{c.manual}</p></section><section className="panel profile-card"><AttendanceRecords detail={value} locale={locale}/></section></div>;
}
