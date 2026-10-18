import 'server-only';
import http from 'node:http';
import https from 'node:https';
import { MAX_MANUSCRIPT_BYTES,MAX_PUBLICATION_BYTES } from '@sep/contracts';
import { ApiTransportError, type Binding } from './index.js';
import { randomUUID } from 'node:crypto';
import { errorMessage, type ErrorCode } from '@sep/i18n';
// The JSON gateway retains authentication/CSRF handling; this adapter only
// transports bounded multipart bodies and authenticated attachment responses.
export async function fileTransport(request:Request,binding:Binding,path:string,token:string|undefined,locale:'es'|'en'):Promise<Response> {
  const failure=(status:number,code:ErrorCode)=>new ApiTransportError(status,{error:{code,message:errorMessage(code,locale),requestId:randomUUID()}});
  let body:Buffer|undefined;
  if(request.method==='POST') {
    if(!request.headers.get('content-type')?.startsWith('multipart/form-data;'))throw failure(400,'PDF_INVALID');
    const reader=request.body?.getReader();const chunks:Buffer[]=[];let size=0;
    if(!reader)throw failure(400,'PDF_INVALID');
    while(true){const chunk=await reader.read();if(chunk.done)break;size+=chunk.value.length;if(size>MAX_MANUSCRIPT_BYTES+65536){await reader.cancel();throw failure(413,'FILE_TOO_LARGE');}chunks.push(Buffer.from(chunk.value));}
    body=Buffer.concat(chunks);
  }
  const base=process.env.SEP_API_URL??binding.config?.baseUrl;if(!base)throw failure(503,'DATABASE_UNAVAILABLE');
  const target=new URL('/api/v1/'+path,base);
  return new Promise((resolve,reject)=>{
    const req=(target.protocol==='https:'?https:http).request(target,{method:request.method,timeout:45000,headers:{host:binding.host,...(token?{authorization:`Bearer ${token}`}:{}),'accept-language':locale,...(body?{'content-type':request.headers.get('content-type')!,'content-length':body.length}:{})}},res=>{
      const chunks:Buffer[]=[];let size=0;
      res.on('data',(chunk:Buffer)=>{size+=chunk.length;if(size>(/editorial|publications/.test(path)?MAX_PUBLICATION_BYTES:MAX_MANUSCRIPT_BYTES)+65536)req.destroy();else chunks.push(chunk);});
      res.on('end',()=>{
        const bytes=Buffer.concat(chunks);
        if((res.statusCode??500)>=400){try{reject(new ApiTransportError(res.statusCode!,JSON.parse(bytes.toString('utf8'))));}catch{reject(new Error('Invalid API response'));}return;}
        const headers:Record<string,string>={'cache-control':'no-store','x-content-type-options':'nosniff','content-type':String(res.headers['content-type']??'application/octet-stream')};
        if(request.method==='GET')headers['content-disposition']=String(res.headers['content-disposition']??'attachment');
        resolve(new Response(new Uint8Array(bytes),{status:res.statusCode??200,headers}));
      });
    });
    req.on('timeout',()=>req.destroy());req.on('error',()=>reject(failure(503,'DATABASE_UNAVAILABLE')));req.end(body);
  });
}
