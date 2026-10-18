import {headers} from 'next/headers';
import {notFound} from 'next/navigation';
import type {PublicationDetail} from '@sep/contracts';
import {apiRequest,bindingFor,ApiTransportError} from '@sep/web-server';
export async function publicationData(lang:string,id:string,event?:string){
 if(!['es','en'].includes(lang)||! /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))notFound();const binding=bindingFor((await headers()).get('host')??'',event);
 try{return {value:await apiRequest<PublicationDetail>(binding,'public/publications/'+id,{locale:lang as 'es'|'en'}),binding};}catch(e){if(e instanceof ApiTransportError&&e.status===404)notFound();throw e;}
}
export function publicPublicationLink(id:string,path:string,event:string|undefined,lang:string,paper?:string){const query=new URLSearchParams({lang});if(event)query.set('event',event);if(paper)query.set('paper',paper);return `/api/publications/${id}/${path}?${query}`;}
export const licenseLink=(license:string)=>license.startsWith('CC-')?'https://creativecommons.org/licenses/'+license.replace('CC-','').replace('-4.0','').toLowerCase()+'/4.0/':null;
