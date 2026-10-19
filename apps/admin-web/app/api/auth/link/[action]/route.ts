import {randomUUID} from 'node:crypto';
import {cookies} from 'next/headers';
import {NextResponse} from 'next/server';
import {ApiTransportError,ACCOUNT_LINK_COOKIE,readAccountLink,saveAccountLink,removeOidcValue,tokenForCookie,apiRequest,bindingFor,adminOrigin,checkOrigin,SESSION_COOKIE,beginGoogle,beginOidc,GOOGLE_FLOW_COOKIE,OIDC_FLOW_COOKIE,oidcCookieSecure,oidcEnabled,localLoginEnabled,localReturnTo,errorResponse} from '@sep/web-server';
import {completeAccountLink,setLinkCookie} from '../shared';
export const runtime='nodejs';
async function principal(){const jar=await cookies(),parent=jar.get(SESSION_COOKIE)?.value,token=await tokenForCookie(parent);if(!oidcEnabled()||!parent||!token)throw new ApiTransportError(401,{error:{code:'UNAUTHORIZED',message:'Debes iniciar sesión.',requestId:randomUUID()}});return {jar,parent,token,binding:bindingFor(new URL(adminOrigin()).host,undefined)};}
export async function GET(_request:Request,{params}:{params:Promise<{action:string}>}){
 try{if((await params).action!=='pending')return new NextResponse(null,{status:404});const {jar,parent,token,binding}=await principal();await apiRequest(binding,'me',{token});const state=readAccountLink(jar.get(ACCOUNT_LINK_COOKIE)?.value,parent);return NextResponse.json(state?.preview??null,{headers:{'cache-control':'no-store'}});}catch(error){return errorResponse(error);}
}
export async function POST(request:Request,{params}:{params:Promise<{action:string}>}){
 try{
  checkOrigin(request);const {action}=await params,{jar,parent,token,binding}=await principal();
  await apiRequest(binding,'me',{token});
  const previous=jar.get(ACCOUNT_LINK_COOKIE)?.value;
  if(action==='confirm'){
   const state=readAccountLink(previous,parent);if(!state?.ticket)return NextResponse.json({error:{message:'La comprobación caducó. Inicia la vinculación de nuevo.'}},{status:409});
   const result=await apiRequest(binding,'me/sign-in-methods/confirm',{method:'POST',token,body:{ticket:state.ticket}});removeOidcValue(previous,'link');return setLinkCookie(NextResponse.json(result),'');
  }
  if(action==='cancel'){removeOidcValue(previous,'link');return setLinkCookie(NextResponse.json({ok:true}),'');}
  if(action==='start'){
   const data=await request.formData(),provider=data.get('provider');if(provider!=='google'&&provider!=='reduniv')return new NextResponse(null,{status:400});
   const returnTo=localReturnTo(String(data.get('returnTo')??'/es?tab=profile')),flow=provider==='google'?await beginGoogle(returnTo):await beginOidc(returnTo,true);
   removeOidcValue(previous,'link');const next=saveAccountLink({parent,provider,returnTo,expires:Date.now()+600000});
   const name=provider==='google'?GOOGLE_FLOW_COOKIE:OIDC_FLOW_COOKIE;removeOidcValue(jar.get(name)?.value,'flow');
   const response=setLinkCookie(NextResponse.redirect(flow.destination,303),next);response.cookies.set(name,flow.cookie,{httpOnly:true,secure:oidcCookieSecure(),sameSite:'lax',path:'/api/auth',maxAge:600});return response;
  }
  if(action==='local'){
   if(!localLoginEnabled())return new NextResponse(null,{status:404});const raw=await request.text();if(Buffer.byteLength(raw)>8192)return new NextResponse(null,{status:400});const data=JSON.parse(raw) as {email?:unknown;password?:unknown;returnTo?:unknown};
   const result=await apiRequest<{accessToken:string}>(binding,'auth/local/login',{method:'POST',body:{email:data.email,password:data.password}});
   removeOidcValue(previous,'link');const next=saveAccountLink({parent,provider:'local',returnTo:localReturnTo(typeof data.returnTo==='string'?data.returnTo:'/es?tab=profile'),expires:Date.now()+600000});
   let linked:NextResponse|null;try{linked=await completeAccountLink({get:(name:string)=>name===ACCOUNT_LINK_COOKIE?{value:next}:jar.get(name)},result.accessToken,'local');}finally{removeOidcValue(next,'link');await apiRequest(binding,'auth/local/logout',{method:'POST',token:result.accessToken});}
   if(!linked)throw new Error('Account verification failed');const cookie=linked.cookies.get(ACCOUNT_LINK_COOKIE)?.value;return setLinkCookie(NextResponse.json({ok:true}),cookie??'');
  }
  return new NextResponse(null,{status:404});
 }catch(error){return errorResponse(error);}
}
