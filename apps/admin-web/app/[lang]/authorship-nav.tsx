'use client';
import { useEffect, useState } from 'react';
import type { AuthorshipWorkspace } from '@sep/contracts';
import type { Locale } from '@sep/i18n';
import { authorshipCopy } from './authorship-copy';
export default function AuthorshipNav({eventId,contextKey,locale}:{eventId:string;contextKey:string;locale:Locale}){
  const [count,setCount]=useState(0);
  useEffect(()=>{const controller=new AbortController();void fetch(`/api/backend/events/${eventId}/authorship?event=${encodeURIComponent(contextKey)}&lang=${locale}`,{signal:controller.signal}).then(async response=>{if(response.ok){const data=await response.json() as AuthorshipWorkspace;setCount(data.candidates.length+data.claims.filter(claim=>claim.unread||claim.canDecide).length);}}).catch(()=>{/* Navigation remains available if the notice count is unavailable. */});return()=>controller.abort();},[eventId,contextKey,locale]);
  return <>{authorshipCopy[locale].title}{count>0&&<span className="authorship-nav-count" aria-label={`${count} ${authorshipCopy[locale].notices}`}>{count}</span>}</>;
}
