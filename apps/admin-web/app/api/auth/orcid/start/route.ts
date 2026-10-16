import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { apiRequest, bindingFor, checkOrigin, errorResponse, SESSION_COOKIE, tokenForCookie } from '@sep/web-server';
export const runtime='nodejs';
export async function POST(request:Request){
  try{
    checkOrigin(request);const url=new URL(request.url);const token=await tokenForCookie((await cookies()).get(SESSION_COOKIE)?.value);
    if(!token)return NextResponse.json({error:{code:'UNAUTHORIZED'}},{status:401});
    const locale=url.searchParams.get('lang')==='en'?'en':'es';const event=url.searchParams.get('event')??'org';
    const result=await apiRequest<{authorizationUrl:string}>(bindingFor(url.host,event),'me/orcid/start',{token,method:'POST',body:{returnTo:`/${locale}?event=${event}&tab=profile`}});
    const target=new URL(result.authorizationUrl);
    if(!['https://orcid.org','https://sandbox.orcid.org'].includes(target.origin)||target.pathname!=='/oauth/authorize')throw new Error('Invalid provider');
    const state=target.searchParams.get('state');if(!state||!/^[A-Za-z0-9_-]{43}$/.test(state))throw new Error('Invalid state');
    const response=NextResponse.redirect(target,303);
    response.cookies.set('sep_orcid_flow',state,{httpOnly:true,secure:new URL(process.env.SEP_ADMIN_ORIGIN!).protocol==='https:',sameSite:'lax',path:'/api/auth/orcid',maxAge:600});
    response.headers.set('cache-control','no-store');response.headers.set('referrer-policy','no-referrer');return response;
  }catch(error){return errorResponse(error);}
}
