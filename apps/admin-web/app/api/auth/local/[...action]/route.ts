import {cookies} from 'next/headers';
import {NextResponse} from 'next/server';
import {adminOrigin,apiRequest,ApiTransportError,bindingFor,checkOrigin,createLocalSession,errorResponse,localLoginEnabled,localReturnTo,oidcCookieSecure,removeOidcValue,SESSION_COOKIE} from '@sep/web-server';
export const runtime='nodejs';
const missing=()=>NextResponse.json({error:{code:'NOT_FOUND'}},{status:404});
export async function POST(request:Request,{params}:{params:Promise<{action:string[]}>}){
 try{
  if(!localLoginEnabled())return missing();checkOrigin(request);
  const {action}=await params;
  if(action.length!==1||!['login','register','request-mail','verify','reset'].includes(action[0]))return missing();
  const raw=await request.text();if(Buffer.byteLength(raw,'utf8')>8192)return NextResponse.json({error:{code:'VALIDATION_FAILED'}},{status:400});
  let data:unknown;try{data=JSON.parse(raw);}catch{return NextResponse.json({error:{code:'VALIDATION_FAILED'}},{status:400});}
  if(!data||typeof data!=='object'||Array.isArray(data))return NextResponse.json({error:{code:'VALIDATION_FAILED'}},{status:400});
  const {returnTo,...body}=data as Record<string,unknown>,locale=new URL(request.url).searchParams.get('lang')==='en'?'en':'es';
  const value=await apiRequest<{accessToken?:string;maxAge?:number;ok?:boolean;previewId?:string}>(bindingFor(new URL(adminOrigin()).host,undefined),'auth/local/'+action[0],{method:'POST',body,locale});
  if(action[0]!=='login')return NextResponse.json({ok:true,...(value.previewId?{previewId:value.previewId}:{})},{headers:{'cache-control':'no-store'}});
  const session=createLocalSession(value.accessToken!,value.maxAge!),jar=await cookies();
  removeOidcValue(jar.get(SESSION_COOKIE)?.value);
  const response=NextResponse.json({ok:true,redirectTo:localReturnTo(typeof returnTo==='string'?returnTo:`/${locale}?tab=access`)},{headers:{'cache-control':'no-store'}});
  response.cookies.set(SESSION_COOKIE,session,{httpOnly:true,secure:oidcCookieSecure(),sameSite:'lax',path:'/',maxAge:value.maxAge});return response;
 }catch(error){if(error instanceof ApiTransportError)return errorResponse(error);return errorResponse(new Error('Local authentication unavailable'));}
}
export async function GET(_request:Request,{params}:{params:Promise<{action:string[]}>}){
 try{if(!localLoginEnabled())return missing();const {action}=await params;if(action.length!==2||action[0]!=='mail'||!/^[A-Za-z0-9_-]{43}$/.test(action[1]))return missing();
  const value=await apiRequest(bindingFor(new URL(adminOrigin()).host,undefined),'auth/local/mail/'+action[1]);return NextResponse.json(value,{headers:{'cache-control':'no-store','referrer-policy':'no-referrer'}});
 }catch(error){return errorResponse(error);}
}
