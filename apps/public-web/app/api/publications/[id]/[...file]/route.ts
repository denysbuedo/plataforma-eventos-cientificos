import {bindingFor,publicationFileTransport} from '@sep/web-server';
export const runtime='nodejs';
export async function GET(request:Request,{params}:{params:Promise<{id:string;file:string[]}>}){
 const {id,file}=await params,url=new URL(request.url),uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
 const path=file.join('/');if(!uuid.test(id)||!(path==='pdf'||file.length===3&&file[0]==='papers'&&uuid.test(file[1])&&file[2]==='pdf'||file.length===2&&file[0]==='export'&&['json','csl','bib','ris'].includes(file[1])))return Response.json({error:'Not found'},{status:404});
 const paper=url.searchParams.get('paper');if(paper&&!uuid.test(paper))return Response.json({error:'Not found'},{status:404});
 try{const binding=bindingFor(request.headers.get('host')??'',url.searchParams.get('event')??undefined);return await publicationFileTransport(request,binding,`public/publications/${id}/${path}`+(paper?'?paper='+paper:''),undefined,url.searchParams.get('lang')==='en'?'en':'es');}catch(e){const error=e as {status?:number;body?:unknown};return Response.json(error.body??{error:'Download unavailable'},{status:error.status??503,headers:{'cache-control':'no-store'}});}
}
