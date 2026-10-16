import type { Metadata } from 'next';
import { cookies,headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { apiRequest,bindingFor,demoConfiguration,googleLoginEnabled,redunivLoginEnabled,oidcEnabled,SESSION_COOKIE,tokenForCookie } from '@sep/web-server';
import Acceptance from './acceptance';
export const dynamic='force-dynamic';
export const metadata:Metadata={title:'SEP · Shared work invitation',robots:{index:false,follow:false},referrer:'no-referrer'};
export default async function Page({params,searchParams}:{params:Promise<{lang:string;token:string}>;searchParams:Promise<{event?:string}>}){
  const {lang,token}=await params;const query=await searchParams;
  if(!['es','en'].includes(lang)||!/^[A-Za-z0-9_-]{43}$/.test(token))notFound();
  const contextKey=query.event??'a1';const binding=bindingFor((await headers()).get('host')??'',contextKey);if(!binding.eventId)notFound();
  const credential=await tokenForCookie((await cookies()).get(SESSION_COOKIE)?.value);let accountName:string|null=null;
  if(credential){try{accountName=(await apiRequest<{person:{name:string}}>(binding,'me',{token:credential})).person.name;}catch{/* Require a fresh authenticated session. */}}
  return <Acceptance locale={lang as 'es'|'en'} token={token} eventId={binding.eventId} contextKey={contextKey} accountName={accountName} demo={!!demoConfiguration()} institutional={oidcEnabled()} googleEnabled={googleLoginEnabled()} redunivEnabled={redunivLoginEnabled()}/>;
}
