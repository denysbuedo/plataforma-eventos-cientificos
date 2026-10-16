'use client';
import { useEffect, useRef, useState } from 'react';
import type { AuthorshipWorkspace } from '@sep/contracts';
import type { Locale } from '@sep/i18n';
import { authorshipCopy } from './authorship-copy';
export default function AuthorshipNav({eventId,contextKey,locale}:{eventId:string;contextKey:string;locale:Locale}){
  const [count,setCount]=useState(0);const generation=useRef(0);
  useEffect(()=>{
    const controller=new AbortController();const started=++generation.current;
    const update=(event:Event)=>{const detail=(event as CustomEvent<{eventId:string;count:number}>).detail;if(detail?.eventId===eventId){generation.current++;setCount(detail.count);}};
    window.addEventListener('sep:authorship-count',update);
    void fetch(`/api/backend/events/${eventId}/authorship?event=${encodeURIComponent(contextKey)}&lang=${locale}`,{signal:controller.signal,cache:'no-store'}).then(async response=>{if(response.ok){const data=await response.json() as AuthorshipWorkspace;if(started===generation.current)setCount(data.candidates.length+data.claims.filter(claim=>claim.unread||claim.canDecide).length);}}).catch(()=>{/* Navigation remains available if the notice count is unavailable. */});
    return()=>{controller.abort();window.removeEventListener('sep:authorship-count',update);};
  },[eventId,contextKey,locale]);
  return <>{authorshipCopy[locale].title}{count>0&&<span className="authorship-nav-count" aria-label={`${count} ${authorshipCopy[locale].notices}`}>{count}</span>}</>;
}
