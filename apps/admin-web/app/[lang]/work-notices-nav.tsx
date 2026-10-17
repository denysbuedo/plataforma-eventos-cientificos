'use client';
import {useEffect,useRef,useState} from 'react';
import {webCopy,type Locale} from '@sep/i18n';
export default function WorkNoticesNav({eventId,contextKey,locale}:{eventId:string;contextKey:string;locale:Locale}){
 const [count,setCount]=useState(0),generation=useRef(0);
 useEffect(()=>{const controller=new AbortController(),started=++generation.current;const update=(event:Event)=>{const detail=(event as CustomEvent<{eventId:string;count:number}>).detail;if(detail?.eventId===eventId){generation.current++;setCount(detail.count);}};window.addEventListener('sep:work-notices',update);void fetch(`/api/backend/events/${eventId}/my-works/notices?event=${encodeURIComponent(contextKey)}&lang=${locale}`,{signal:controller.signal,cache:'no-store'}).then(async response=>{if(response.ok){const value=await response.json();if(started===generation.current)setCount(value.count);}}).catch(()=>{});return()=>{controller.abort();window.removeEventListener('sep:work-notices',update);};},[eventId,contextKey,locale]);
 return <>{webCopy[locale].myWorks}{count>0&&<span className="authorship-nav-count" aria-label={`${count} ${locale==='es'?'trabajos con novedades':'works with updates'}`}>{count}</span>}</>;
}
