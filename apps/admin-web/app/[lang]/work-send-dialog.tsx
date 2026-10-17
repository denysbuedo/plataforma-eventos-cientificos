'use client';
import {useEffect,useRef,useState} from 'react';
import type {AuthorWork} from '@sep/contracts';
import {webCopy,type Locale} from '@sep/i18n';
import {feedbackCopy} from './work-feedback-copy';
export default function WorkSendDialog({work,locale,busy,onClose,onSend}:{work:AuthorWork;locale:Locale;busy:boolean;onClose:()=>void;onSend:()=>Promise<void>}){
 const dialog=useRef<HTMLDialogElement>(null),[confirmed,setConfirmed]=useState(false),[error,setError]=useState(''),copy=feedbackCopy[locale],text=webCopy[locale];
 const number=Math.max(0,...work.versions.map(item=>item.number))+1;
 useEffect(()=>{dialog.current?.showModal();},[]);
 async function send(){if(busy||!confirmed)return;setError('');try{await onSend();}catch(error){setError(error instanceof Error?error.message:text.serviceHelp);}}
 return <dialog ref={dialog} className="researcher-close-dialog work-send-dialog" aria-labelledby="work-send-heading" onCancel={event=>{event.preventDefault();if(!busy)onClose();}}><h2 id="work-send-heading">{copy.sendTitle}</h2><p className="work-send-title">{work.title}</p><p className="profile-help">{copy.sendHelp}</p><dl className="work-send-summary"><div><dt>{copy.version}</dt><dd>{number}</dd></div><div><dt>{copy.file}</dt><dd>{work.manuscript?.name??copy.noFile}</dd></div></dl>{error&&<p className="notice notice-error" role="alert">{error}</p>}<label className="profile-checkbox"><input type="checkbox" checked={confirmed} disabled={busy} onChange={event=>setConfirmed(event.target.checked)}/><span>{text.confirmSubmission}</span></label><div className="editor-actions"><button type="button" className="button button-primary" disabled={busy||!confirmed} onClick={()=>{void send();}}>{copy.send} {number}</button><button type="button" className="button button-outline" disabled={busy} onClick={onClose}>{text.cancel}</button></div></dialog>;
}
