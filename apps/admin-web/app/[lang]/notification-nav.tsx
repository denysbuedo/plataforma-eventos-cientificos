'use client';
import {useEffect,useState} from 'react';
import type {NotificationPage} from '@sep/contracts';
import type {Locale} from '@sep/i18n';
import {communicationCopy,communicationsApi} from './communications-common';
export default function NotificationNav({eventId,contextKey,locale}:{eventId:string;contextKey:string;locale:Locale}){
 const [count,setCount]=useState(0);
 useEffect(()=>{let active=true,sequence=0;const request=communicationsApi(eventId,contextKey,locale);async function update(){if(document.visibilityState==='hidden')return;const current=++sequence;try{const value=await request<NotificationPage>('notifications?limit=1');if(active&&current===sequence)setCount(value.unread);}catch{/* The destination page reports errors; navigation remains usable. */}}const listener=()=>{void update();};void update();const interval=setInterval(listener,30000);window.addEventListener('sep:notifications',listener);window.addEventListener('focus',listener);return()=>{active=false;clearInterval(interval);window.removeEventListener('sep:notifications',listener);window.removeEventListener('focus',listener);};},[eventId,contextKey,locale]);
 return <>{communicationCopy[locale].notifications}{count>0&&<span className="authorship-nav-count" aria-label={`${count} ${communicationCopy[locale].unread.toLocaleLowerCase(locale)}`}>{count}</span>}</>;
}
