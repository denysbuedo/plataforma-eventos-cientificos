import {Worker} from 'node:worker_threads';
import type {PublicationSnapshot} from '@sep/contracts';
import {ApiException} from '../common/http.js';
export function createEditorialPdf(snapshot:PublicationSnapshot,files:{workId:string;data:Buffer}[],preview:boolean):Promise<{pdf:Buffer;snapshot:PublicationSnapshot}>{
 return new Promise((resolve,reject)=>{
  const worker=new Worker(new URL('./editorial.worker.js',import.meta.url),{workerData:{snapshot,files,preview},resourceLimits:{maxOldGenerationSizeMb:512}});let settled=false;
  const fail=()=>{if(settled)return;settled=true;clearTimeout(timer);void worker.terminate();reject(new ApiException(400,'PUBLICATION_INVALID'));};
  const timer=setTimeout(fail,35000);
  worker.once('message',(v:{pdf?:Uint8Array;snapshot?:PublicationSnapshot})=>{if(!v.pdf||!v.snapshot){fail();return;}if(settled)return;settled=true;clearTimeout(timer);void worker.terminate();resolve({pdf:Buffer.from(v.pdf),snapshot:v.snapshot});});worker.once('error',fail);worker.once('exit',()=>{if(!settled)fail();});
 });
}
