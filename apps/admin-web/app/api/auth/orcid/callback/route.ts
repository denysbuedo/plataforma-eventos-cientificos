import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { apiRequest, bindingFor, demoConfiguration, SESSION_COOKIE, tokenForCookie } from '@sep/web-server';
export const runtime='nodejs';
export async function GET(request:Request){
  const origin=process.env.SEP_ADMIN_ORIGIN;if(!origin)return NextResponse.json({error:{code:'ORCID_INVALID'}},{status:400});
  let destination='/es?tab=profile&orcidError=1';
  try{
    const jar=await cookies();const url=new URL(request.url);const state=url.searchParams.get('state');const stored=jar.get('sep_orcid_flow')?.value;
    if(!state||!stored||state.length!==43||stored.length!==43||!timingSafeEqual(Buffer.from(state),Buffer.from(stored))||url.searchParams.has('error'))throw new Error('Invalid state');
    const token=await tokenForCookie(jar.get(SESSION_COOKIE)?.value);if(!token)throw new Error('Session expired');
    const result=await apiRequest<{returnTo:string}>(bindingFor(new URL(origin).host,demoConfiguration()?'a1':undefined),'me/orcid/finish',{token,method:'POST',body:{state,code:url.searchParams.get('code')??''}});
    if(!/^\/(?:es|en)\?event=[a-zA-Z0-9-]+&tab=profile$/.test(result.returnTo))throw new Error('Invalid return');
    destination=result.returnTo;
  }catch{/* Codes, tokens and provider responses are never logged or included in the redirect. */}
  const response=NextResponse.redirect(new URL(destination,origin),303);
  response.cookies.set('sep_orcid_flow','',{httpOnly:true,secure:new URL(origin).protocol==='https:',sameSite:'lax',path:'/api/auth/orcid',maxAge:0});
  response.headers.set('cache-control','no-store');response.headers.set('referrer-policy','no-referrer');return response;
}
