 'use client';
import {useEffect,useRef,useState} from 'react';
import type {Locale} from '@sep/i18n';
import {reviewCopy} from './peer-review-copy';
export default function ReviewNav({eventId,contextKey,locale}:{eventId:string;contextKey:string;locale:Locale}){
 const [count,setCount]=useState(0),generation=useRef(0);
 useEffect(()=>{const controller=new AbortController();let active=true;const update=()=>{const current=++generation.current;void fetch(`/api/backend/events/${eventId}/peer-review/mine/status?event=${encodeURIComponent(contextKey)}&lang=${locale}`,{signal:controller.signal,cache:'no-store'}).then(async response=>{if(response.ok){const value=await response.json();if(active&&current===generation.current)setCount(value.count);}}).catch(()=>{});};const refresh=(event:Event)=>{if((event as CustomEvent<{eventId:string}>).detail?.eventId===eventId)update();};update();window.addEventListener('sep:review-updated',refresh);return()=>{active=false;controller.abort();window.removeEventListener('sep:review-updated',refresh);};},[eventId,contextKey,locale]);
 return <>{reviewCopy[locale].mine}{count>0&&<span className="authorship-nav-count" aria-label={`${count} ${locale==='es'?'revisiones pendientes':'pending reviews'}`}>{count}</span>}</>;
}
