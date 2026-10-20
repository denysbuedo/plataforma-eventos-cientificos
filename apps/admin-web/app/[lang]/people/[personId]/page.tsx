import {cookies,headers} from 'next/headers';
import {notFound,redirect} from 'next/navigation';
import type {Metadata} from 'next';
import type {MyAccess,OrganizationPersonDetail} from '@sep/contracts';
import {apiRequest,ApiTransportError,bindingFor,demoConfiguration,oidcEnabled,SESSION_COOKIE,tokenForCookie} from '@sep/web-server';
import ParticipantShell from '../../participant-shell';
import PersonDetail from '../../person-detail';
export const dynamic='force-dynamic';
export const metadata:Metadata={title:'SEP · Ficha de persona',robots:{index:false,follow:false}};
export default async function PersonPage({params,searchParams}:{params:Promise<{lang:string;personId:string}>;searchParams:Promise<{event?:string;q?:string;offset?:string;view?:string}>}){
 const {lang,personId}=await params;if((lang!=='es'&&lang!=='en')||!/^[0-9a-f-]{36}$/i.test(personId))notFound();
 const locale=lang,query=await searchParams,config=demoConfiguration(),contextKey=query.event??(oidcEnabled()?'org':'orgA');
 const back=new URLSearchParams({event:contextKey,tab:'people',view:query.view==='list'?'list':'cards'});if(query.q)back.set('q',query.q.slice(0,100));if(query.offset&&/^\d{1,9}$/.test(query.offset))back.set('offset',query.offset);
 const returnHref=`/${locale}?${back}`,token=await tokenForCookie((await cookies()).get(SESSION_COOKIE)?.value);if(!token)redirect(returnHref);
 const binding=bindingFor((await headers()).get('host')??'',contextKey);
 let detail:OrganizationPersonDetail,access:MyAccess;
 try{[detail,access]=await Promise.all([apiRequest<OrganizationPersonDetail>(binding,`people/${personId}`,{token,locale}),apiRequest<MyAccess>(binding,'me/access',{token,locale})]);}
 catch(error){if(error instanceof ApiTransportError&&error.status===401)redirect(returnHref);if(error instanceof ApiTransportError&&[403,404].includes(error.status))notFound();throw error;}
 const publicUrl=config?.publicUrl??process.env.SEP_PUBLIC_ORIGIN??'';
 return <ParticipantShell person={access.person} initialAccess={access} locale={locale} contextKey={contextKey} tab="people" pageLabel={locale==='es'?'Ficha de la persona':'Person profile'} publicUrl={publicUrl?`${publicUrl}/${locale}?event=${encodeURIComponent(contextKey)}`:''}><PersonDetail detail={detail} locale={locale} returnHref={returnHref}/></ParticipantShell>;
}
