import {headers} from 'next/headers';
import {notFound} from 'next/navigation';
import {loadPublicSite,apiRequest,ApiTransportError} from '@sep/web-server';
import type {PublicPoster} from '@sep/contracts';
export type PosterProps={params:Promise<{lang:string;id?:string}>;searchParams:Promise<{event?:string}>};
export async function posterData(props:PosterProps){const {lang,id}=await props.params;if(lang!=='es'&&lang!=='en')notFound();if(id&&!/^[0-9a-f-]{36}$/i.test(id))notFound();const {event}=await props.searchParams;const loaded=await loadPublicSite((await headers()).get('host')??'',event,lang),path=`public/events/${loaded.site.event.id}/gallery`;try{return {...loaded,locale:lang,query:loaded.binding.config?'?event='+encodeURIComponent(loaded.binding.key):'',value:id?await apiRequest<{poster:PublicPoster|null;withdrawn:boolean;withdrawalReason:string|null}>(loaded.binding,path+'/'+id,{locale:lang}):await apiRequest<{data:PublicPoster[]}>(loaded.binding,path,{locale:lang})};}catch(e){if(e instanceof ApiTransportError&&e.status===404)notFound();throw e;}}
