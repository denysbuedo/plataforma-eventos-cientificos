'use client';
import {useEffect,useRef,useState} from 'react';
import type {AuthorWork,AuthorReviewFeedback} from '@sep/contracts';
import {webCopy,type Locale} from '@sep/i18n';
import {feedbackCopy} from './work-feedback-copy';
export default function WorkFeedback({work,locale,unread,onRead}:{work:AuthorWork;locale:Locale;unread:boolean;onRead:()=>Promise<boolean>}){
 const text=webCopy[locale],copy=feedbackCopy[locale],root=useRef<HTMLElement>(null),read=useRef(onRead),attempted=useRef(''),[error,setError]=useState(false),[reading,setReading]=useState(false);
 const entries=work.authorFeedback??work.history.filter(item=>item.action==='peer_reviews_released').map(item=>({id:item.id,publishedAt:item.createdAt,message:item.message}));
 const decision=[...work.history].sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt)).find(item=>item.actor==='staff'&&['changes_requested','final_requested','accepted','rejected'].includes(item.action));
 const signature=JSON.stringify(work.noticeIds??[]);
 useEffect(()=>{read.current=onRead;});
 async function mark(){setReading(true);setError(false);try{if(!await read.current())setError(true);}catch{setError(true);}finally{setReading(false);}}
 useEffect(()=>{if(!unread||signature==='[]'||!root.current||attempted.current===signature)return;let active=true;const observer=new IntersectionObserver(records=>{if(records.some(item=>item.isIntersecting)){attempted.current=signature;observer.disconnect();void read.current().then(ok=>{if(active)setError(!ok);}).catch(()=>{if(active)setError(true);});}},{threshold:0.1});observer.observe(root.current);return()=>{active=false;observer.disconnect();};},[unread,signature]);
 if(!decision&&!entries.length)return null;
 const date=(value:string)=>new Intl.DateTimeFormat(locale,{dateStyle:'medium',timeStyle:'short',timeZone:work.call.timezone}).format(new Date(value));
 function report(entry:AuthorReviewFeedback){return <div className="author-review-release"><div className="author-feedback-meta"><time dateTime={entry.publishedAt}>{date(entry.publishedAt)}</time>{entry.roundNumber&&<span>{copy.round} {entry.roundNumber}</span>}{entry.versionNumber&&<span>{copy.version} {entry.versionNumber}</span>}</div>{entry.comments?.length?<div className="author-review-comments">{entry.comments.map(comment=><article key={comment.number}><h5>{copy.review} {comment.number}</h5><p>{comment.text}</p></article>)}</div>:<p className="author-review-legacy">{entry.message}</p>}</div>;}
 return <section id="work-feedback" ref={root} className="author-feedback" aria-labelledby="work-feedback-heading"><div className="tracking-section-heading"><h3 id="work-feedback-heading">{copy.title}</h3>{unread&&<span className="work-news-badge">{copy.news}</span>}</div>{decision&&<section className="author-feedback-decision"><div className="tracking-section-heading"><h4>{copy.team}</h4><span className={`participant-work-status participant-work-status-${decision.action}`}>{(text.workActions as Record<string,string>)[decision.action]??decision.action}</span></div><p className="author-review-legacy">{decision.message}</p>{work.responseDeadline&&['changes_requested','final_requested'].includes(work.status)&&<p className="author-feedback-deadline">{copy.deadline}: <strong>{new Intl.DateTimeFormat(locale,{dateStyle:'long',timeZone:'UTC'}).format(new Date(`${work.responseDeadline}T00:00:00Z`))}</strong></p>}<p className="tracking-meta">{decision.actorName||text.eventTeam} · <time dateTime={decision.createdAt}>{date(decision.createdAt)}</time></p></section>}
 {entries.length>0&&<section className="author-feedback-reviews"><h4>{copy.reviews}</h4><p className="profile-help">{copy.help}</p>{report(entries[0])}{entries.length>1&&<details className="author-feedback-previous"><summary>{copy.previous} ({entries.length-1})</summary>{entries.slice(1).map(entry=><div key={entry.id}>{report(entry)}</div>)}</details>}</section>}
 {error&&<p className="profile-help" role="status">{copy.readError} <button className="button button-outline" type="button" disabled={reading} onClick={()=>{void mark();}}>{copy.retry}</button></p>}
 </section>;
}
