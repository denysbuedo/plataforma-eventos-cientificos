import {NextResponse} from 'next/server';
import {ACCOUNT_LINK_COOKIE,readAccountLink,saveAccountLink,removeOidcValue,tokenForCookie,apiRequest,bindingFor,adminOrigin,oidcCookieSecure,SESSION_COOKIE} from '@sep/web-server';
type Jar={get(name:string):{value:string}|undefined};
export function setLinkCookie(response:NextResponse,value:string){response.cookies.set(ACCOUNT_LINK_COOKIE,value,{httpOnly:true,secure:oidcCookieSecure(),sameSite:'lax',path:'/api/auth',maxAge:value?600:0});response.headers.set('cache-control','no-store');response.headers.set('referrer-policy','no-referrer');return response;}
export async function completeAccountLink(jar:Jar,credential:string,provider:'google'|'reduniv'|'local'){
 const id=jar.get(ACCOUNT_LINK_COOKIE)?.value;if(!id)return null;
 const parent=jar.get(SESSION_COOKIE)?.value,state=readAccountLink(id,parent),token=await tokenForCookie(parent);
 if(!state||!token||state.provider!==provider)throw new Error('Invalid account link');
 const result=await apiRequest<Record<string,unknown>>(bindingFor(new URL(adminOrigin()).host,undefined),'me/sign-in-methods/prepare',{method:'POST',token,body:{credential}});
 const {ticket,...preview}=result;removeOidcValue(id,'link');
 const next=saveAccountLink({...state,ticket:typeof ticket==='string'?ticket:undefined,preview});
 return setLinkCookie(NextResponse.redirect(new URL(state.returnTo,adminOrigin()),303),next);
}
export function failedAccountLink(jar:Jar,flowCookie:string){const id=jar.get(ACCOUNT_LINK_COOKIE)?.value;if(!id)return null;const state=readAccountLink(id,jar.get(SESSION_COOKIE)?.value);removeOidcValue(id,'link');const target=new URL(state?.returnTo??'/es?tab=profile',adminOrigin());target.searchParams.set('mode','link-error');const response=setLinkCookie(NextResponse.redirect(target,303),'');response.cookies.set(flowCookie,'',{httpOnly:true,secure:oidcCookieSecure(),sameSite:'lax',path:'/api/auth',maxAge:0});return response;}
