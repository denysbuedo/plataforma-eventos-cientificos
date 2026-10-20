import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {randomUUID} from 'node:crypto';
import {Pool} from 'pg';
import {PDFDocument} from 'pdf-lib';
import {createApplication} from '../../apps/api/dist/application.js';
import {loadConfig} from '../../apps/api/dist/config.js';
import {DatabaseService} from '../../apps/api/dist/database/database.service.js';
import {ManuscriptsService} from '../../apps/api/dist/submissions/manuscripts.service.js';
import {fixture} from '../../scripts/demo-fixtures.mjs';
import {siteContents} from '../../scripts/site-fixtures.mjs';
test('gallery, payments and management reports',async t=>{
 const admin=new Pool({connectionString:process.env.SEP_TEST_ADMIN_URL}),runtime=new Pool({connectionString:process.env.DATABASE_URL}),{app}=await createApplication({...loadConfig(),mail:undefined});
 t.after(async()=>{await app.close();await admin.end();await runtime.end();});await app.get(DatabaseService).verifyRuntime();await app.listen(0,'127.0.0.1');
 const port=app.getHttpServer().address().port,tokens=JSON.parse(process.env.SEP_TEST_TOKENS),org=fixture.organizations.a,event=fixture.events.a1,work=randomUUID(),version=randomUUID(),owner=fixture.people.outsider;
 async function call(path,{method='GET',body,user='mixed',host=fixture.hosts.a1}={}){return new Promise((resolve,reject)=>{const data=body===undefined?undefined:JSON.stringify(body);const r=http.request({hostname:'127.0.0.1',port,path:'/api/v1'+path,method,headers:{host,...(user?{authorization:'Bearer '+tokens[user]}:{}),...(data?{'content-type':'application/json','content-length':Buffer.byteLength(data)}:{})}},res=>{const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>{const bytes=Buffer.concat(chunks),text=bytes.toString('utf8');let body;try{body=JSON.parse(text);}catch{}resolve({status:res.statusCode,body,bytes,text,headers:res.headers});});});r.on('error',reject);r.end(data);});}
 await admin.query(`UPDATE events SET status='published' WHERE id=$1`,[event]);await admin.query(`INSERT INTO site_publications(organization_id,event_id,snapshot,revision,published_at) VALUES($1,$2,$3,1,now())`,[org,event,{event:{id:event,nameEs:'Evento de prueba',nameEn:'Test event',timezone:'America/Havana'},content:siteContents.a1,revision:1,publishedAt:new Date().toISOString()}]);
 const source=await PDFDocument.create();source.addPage().drawText('FINAL TEST PAPER');source.addPage().drawText('SECOND PAGE');const file=Buffer.from(await source.save()),metadata=await app.get(ManuscriptsService).validate(file,'test-final.pdf'),track=randomUUID(),type=randomUUID();
 const content={title:'Versión científica de prueba',abstract:'Este resumen describe un estudio ficticio preparado para comprobar la publicación editorial de un evento científico. No representa resultados de investigación reales.',keywords:['ciencia','prueba'],language:'es',trackId:track,contributionTypeId:type,call:{revision:1,publishedAt:new Date().toISOString(),timezone:'America/Havana',content:{tracks:[{id:track,nameEs:'Ciencia abierta',nameEn:'Open science'}],contributionTypes:[]}},authors:[{id:randomUUID(),personId:owner,fullName:'Autora de prueba',orcid:'0000-0002-1825-0097',orcidVerified:true,email:'PRIVATE_EMAIL@example.test',corresponding:true,affiliations:[{institution:'Institución de prueba',countryCode:'CU'}]}],manuscript:metadata,reviewResponse:{summary:'PRIVATE_REVIEW_RESPONSE',replies:[]}};
 await admin.query(`INSERT INTO author_works(id,organization_id,event_id,owner_id,title,language,track_id,contribution_type_id,call_snapshot,status) VALUES($1,$2,$3,$4,$5,'es',$6,$7,$8,'accepted')`,[work,org,event,owner,content.title,track,type,content.call]);
 await admin.query('INSERT INTO work_files(id,organization_id,event_id,work_id,owner_id,metadata,data) VALUES($1,$2,$3,$4,$5,$6,$7)',[metadata.id,org,event,work,owner,metadata,file]);await admin.query(`INSERT INTO work_versions(id,organization_id,event_id,work_id,owner_id,number,kind,content,file_id) VALUES($1,$2,$3,$4,$5,1,'final',$6,$7)`,[version,org,event,work,owner,content,metadata.id]);
 const reason='Operación controlada de demostración.',gallery=`/events/${event}/gallery`,payments=`/events/${event}/payments`,registration=randomUUID(),cash=randomUUID(),transfer=randomUUID(),enzona=randomUUID(),fee=randomUUID(),otherFee=randomUUID(),chargeId=randomUUID();
 const ok=(r,status=200)=>assert.equal(r.status,status,JSON.stringify(r.body));
 await admin.query(`INSERT INTO registration_entries(id,organization_id,event_id,person_id,name,affiliations,category,modality,status,policy) VALUES($1,$2,$3,$4,$5,'[]',$6,'in_person','confirmed','{}')`,[registration,org,event,owner,'=IMPORTXML("unsafe")',{id:randomUUID(),nameEs:'Participante',nameEn:'Participant',active:true}]);
 let permissionRevision=0,release;
 const permission={authorized:true,license:'CC-BY-4.0',showDownload:true,thumbnail:null,altText:'',attested:true,reason};
 await t.test('gallery requires explicit owner consent and staff approval',async()=>{
  ok(await call(gallery,{user:'admin'}),200);ok(await call(gallery+'/mine/'+work,{method:'PUT',body:{...permission,revision:0}}),404);
  ok(await call(gallery+'/mine/'+work,{user:'outsider',method:'PUT',body:{...permission,attested:false,revision:0}}),409);
  ok(await call(gallery+'/mine/'+work,{user:'outsider',method:'PUT',body:{...permission,revision:0}}));permissionRevision=1;
  ok(await call(gallery+'/'+work+'/publish',{method:'POST',body:{revision:1,requestId:randomUUID(),reason}}),409);
  ok(await call(gallery+'/'+work+'/approval',{method:'PUT',body:{revision:1,approved:true,note:'PRIVATE_GALLERY_NOTE',reason}}));permissionRevision=2;
  const own=await call(gallery+'/mine',{user:'outsider'});ok(own);assert(!own.text.includes('PRIVATE_GALLERY_NOTE'));
 });
 await t.test('gallery preserves safe public metadata and an independent PDF',async()=>{
  release=randomUUID();const request={revision:permissionRevision,requestId:release,reason};ok(await call(gallery+'/'+work+'/publish',{method:'POST',body:request}));ok(await call(gallery+'/'+work+'/publish',{method:'POST',body:request}));
  const publicRoot=`/public/events/${event}/gallery`,list=await call(publicRoot,{user:null});ok(list);assert.equal(list.body.data.length,1);assert(!list.text.includes('PRIVATE_EMAIL'));assert(!list.text.includes('PRIVATE_REVIEW_RESPONSE'));assert(!list.text.includes('personId'));assert.equal(list.body.data[0].content.authors[0].name,'Autora de prueba');
  const pdf=await call(publicRoot+'/'+release+'/view',{user:null});ok(pdf);assert.deepEqual(pdf.bytes,file);assert(pdf.headers['content-disposition'].startsWith('inline'));
  ok(await call(publicRoot+'/'+release,{user:null,host:fixture.hosts.b1}),404);
  await assert.rejects(admin.query(`UPDATE gallery_releases SET pdf=$1 WHERE id=$2`,[Buffer.from('broken'),release]),{code:'42501'});
 });
 await t.test('revocation removes gallery content and retains a public tombstone',async()=>{
  ok(await call(gallery+'/mine/'+work,{user:'outsider',method:'PUT',body:{...permission,authorized:false,revision:permissionRevision}}));permissionRevision++;
  const root=`/public/events/${event}/gallery`;assert.equal((await call(root,{user:null})).body.data.length,0);const tombstone=await call(root+'/'+release,{user:null});ok(tombstone);assert.equal(tombstone.body.poster,null);assert.equal(tombstone.body.withdrawn,true);ok(await call(root+'/'+release+'/pdf',{user:null}),410);
 });
 const settings={enabled:true,instructions:'Datos de prueba, no realizar transferencias reales.',methods:[{id:cash,name:'Efectivo',kind:'cash',currencies:['CUP','USD','EUR'],active:true,checkoutUrl:'',instructions:'Caja del evento',fields:[]},{id:transfer,name:'Transfermóvil',kind:'gateway',currencies:['CUP'],active:true,checkoutUrl:'',instructions:'Solo demostración',fields:[{label:'Comercio',value:'Institución de prueba'}]},{id:enzona,name:'Enzona',kind:'gateway',currencies:['CUP'],active:true,checkoutUrl:'https://example.org/test-checkout',instructions:'Solo demostración',fields:[]}],fees:[{id:fee,name:'Inscripción de prueba',description:'No realizar pagos reales.',active:true,prices:[{currency:'CUP',amount:'1250.25'},{currency:'USD',amount:'50.10'},{currency:'EUR',amount:'45.20'}]},{id:otherFee,name:'Taller opcional',description:'No realizar pagos reales.',active:true,prices:[{currency:'CUP',amount:'100.15'}]}]};
 await t.test('finance enforces organizer access, disabled default and safe public configuration',async()=>{
  ok(await call(payments,{user:'outsider'}),404);ok(await call(payments,{user:'admin'}),200);
  ok(await call(payments+'/mine',{user:'outsider'}));assert.equal((await call(payments+'/mine',{user:'outsider'})).body.settings.enabled,false);
  ok(await call(payments+'/mine',{method:'POST',user:'outsider',body:{requestId:chargeId,registrationId:registration,feeId:fee,currency:'CUP',reason}}),409);
  const bad=structuredClone(settings);bad.methods[0].fields=[{label:'Client secret',value:'PRIVATE_KEY'}];ok(await call(payments+'/settings',{method:'PUT',body:{revision:0,content:bad,reason}}),400);
  ok(await call(payments+'/settings',{method:'PUT',body:{revision:0,content:settings,reason}}));
 });
 await t.test('charges freeze exact decimal price, reject duplicate charges and retain currency',async()=>{
  const req={requestId:chargeId,registrationId:registration,feeId:fee,currency:'CUP',reason};ok(await call(payments+'/mine',{method:'POST',user:'outsider',body:req}));ok(await call(payments+'/mine',{method:'POST',user:'outsider',body:req}));
  ok(await call(payments+'/mine',{method:'POST',user:'outsider',body:{...req,requestId:randomUUID()}}),409);
  const updated=structuredClone(settings);updated.fees[0].prices[0].amount='2000.00';ok(await call(payments+'/settings',{method:'PUT',body:{revision:1,content:updated,reason}}));
  const own=await call(payments+'/mine',{user:'outsider'});assert.equal(own.body.charges[0].amount,'1250.25');assert.equal(own.body.charges[0].currency,'CUP');
  ok(await call(payments+'/charges/'+chargeId+'/decision',{method:'POST',user:'outsider',body:{revision:1,state:'paid',methodId:cash,reference:'FAKE',reason}}),404);
  await assert.rejects(admin.query(`UPDATE payment_charges SET snapshot=jsonb_set(snapshot,'{amount}','"0.01"'),revision=revision+1 WHERE id=$1`,[chargeId]),{code:'42501'});
 });
 await t.test('reported gateway payments require staff verification; cash cannot be self-confirmed',async()=>{
  ok(await call(payments+'/mine/'+chargeId+'/report',{method:'POST',user:'outsider',body:{revision:1,methodId:cash,reference:'CASH-1',report:'Pago en caja',reason}}),409);
  ok(await call(payments+'/mine/'+chargeId+'/report',{method:'POST',user:'outsider',body:{revision:1,methodId:transfer,reference:'TX-1',report:'Pago de prueba comunicado',reason}}));
  const mine=await call(payments+'/mine',{user:'outsider'});assert.equal(mine.body.charges[0].state,'reported');
  ok(await call(payments+'/charges/'+chargeId+'/decision',{method:'POST',body:{revision:2,state:'paid',methodId:transfer,reference:'TX-1',reason}}));
  const w=await call(payments);ok(w);assert.equal(w.body.totals.find(t=>t.currency==='CUP').paid,'1250.25');assert.equal(w.body.totals.find(t=>t.currency==='USD').paid,'0.00');
  const notes=await admin.query(`SELECT kind FROM event_notifications WHERE event_id=$1 AND kind='payment.reported'`,[event]);assert(notes.rows.length>0);
 });
 await t.test('cash receipt references cannot be reused; refunds retain original transaction history',async()=>{
  const other=randomUUID();ok(await call(payments+'/charges',{method:'POST',body:{requestId:other,registrationId:registration,feeId:otherFee,currency:'CUP',reason}}));
  ok(await call(payments+'/charges/'+other+'/decision',{method:'POST',body:{revision:1,state:'paid',methodId:transfer,reference:'TX-1',reason}}),409);
  ok(await call(payments+'/charges/'+other+'/decision',{method:'POST',body:{revision:1,state:'paid',methodId:cash,reference:'CAJA-001',reason}}));
  ok(await call(payments+'/charges/'+chargeId+'/decision',{method:'POST',body:{revision:3,state:'refunded',methodId:null,reference:'',reason:'Reembolso total confirmado, referencia REF-001.'}}));
  const w=await call(payments);ok(w);const total=w.body.totals.find(t=>t.currency==='CUP');assert.equal(total.paid,'100.15');assert.equal(total.refunded,'1250.25');
  const logs=await admin.query(`SELECT details FROM payment_history WHERE charge_id=$1 ORDER BY created_at`,[chargeId]);assert.equal(logs.rows.at(-1).details.settlement.reference,'TX-1');
  await assert.rejects(admin.query(`DELETE FROM payment_history WHERE charge_id=$1`,[chargeId]),{code:'42501'});
 });
 await t.test('reports aggregate without private reviews, export escaped CSV and enforce scope',async()=>{
  const root=`/events/${event}/reports`,r=await call(root);ok(r);assert(r.body.groups.some(g=>g.id==='payments'));assert(!r.text.includes('PRIVATE_'));
  ok(await call(root,{user:'outsider'}),404);ok(await call(root,{user:'admin'}),200);ok(await call(root,{host:fixture.hosts.b1}),404);
  const csv=await call(root+'/export?dataset=registrations');ok(csv);assert(csv.body.csv.startsWith('\uFEFF'.replace('\\uFEFF','\uFEFF'))||csv.body.csv.charCodeAt(0)===0xFEFF);assert(csv.body.csv.includes("'=IMPORTXML"));
  assert.equal((await admin.query(`SELECT count(*)::integer n FROM audit_entries WHERE event_id=$1 AND action='reports.exported'`,[event])).rows[0].n,1);
  ok(await call(root+'/export?dataset=private_reviews'),400);
 });
});
