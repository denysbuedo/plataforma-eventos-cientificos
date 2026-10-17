import type {Locale} from '@sep/i18n';
import {webCopy} from '@sep/i18n';
export function reviewApi(eventId:string,contextKey:string,locale:Locale){
 const url=(suffix:string)=>`/api/backend/events/${eventId}/peer-review/${suffix}${suffix.includes('?')?'&':'?'}event=${encodeURIComponent(contextKey)}&lang=${locale}`;
 return {url,request:async<T>(suffix:string,method='GET',body?:unknown):Promise<T>=>{const response=await fetch(url(suffix),{method,headers:{'content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});const data=await response.json();if(!response.ok)throw new Error(data.error?.message??webCopy[locale].serviceHelp);return data as T;}};
}
