'use client';
import {useCallback,useEffect,useRef} from 'react';
import type {Locale} from '@sep/i18n';
import {useParticipantNavigationGuard} from './participant-shell';
import type {ProgramLeaveGuard} from './scientific-program';
export function moduleApi(eventId:string,contextKey:string,locale:Locale,module:string){return async<T>(path='',method='GET',body?:unknown):Promise<T>=>{const response=await fetch(`/api/backend/events/${eventId}/${module}${path}?event=${encodeURIComponent(contextKey)}&lang=${locale}`,{method,cache:'no-store',headers:body?{'content-type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined});const value=await response.json();if(!response.ok)throw new Error(value.error?.message??(locale==='es'?'No pudimos completar la operación.':'We could not complete the operation.'));return value;};}
export function useModuleGuard(dirty:boolean,busy:boolean,locale:Locale,onGuardChange?:((guard:ProgramLeaveGuard|null)=>void)){
 const state=useRef({dirty,busy,leaving:false});state.current.dirty=dirty;state.current.busy=busy;
 const confirm=useCallback(()=>!state.current.busy&&(!state.current.dirty||window.confirm(locale==='es'?'Hay cambios sin guardar. ¿Quieres descartarlos?':'You have unsaved changes. Discard them?')),[locale]);
 const navigate=useCallback((next:()=>void)=>{if(confirm()){state.current.leaving=true;next();requestAnimationFrame(()=>{state.current.leaving=false;});}},[confirm]);useParticipantNavigationGuard(navigate);
 useEffect(()=>{onGuardChange?.({confirm:()=>{const ok=confirm();state.current.leaving=ok;return ok;},reset:()=>{state.current.leaving=false;}});return()=>onGuardChange?.(null);},[confirm,onGuardChange]);
 useEffect(()=>{const warn=(e:BeforeUnloadEvent)=>{if(!state.current.leaving&&(state.current.dirty||state.current.busy)){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[]);
 return confirm;
}
export function moduleDate(value:string,locale:Locale){return new Intl.DateTimeFormat(locale,{dateStyle:'medium',timeStyle:'short'}).format(new Date(value));}
