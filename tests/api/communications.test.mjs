import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import http from 'node:http';
import net from 'node:net';
import test from 'node:test';
import {Pool} from 'pg';
import {createApplication} from '../../apps/api/dist/application.js';
import {loadConfig} from '../../apps/api/dist/config.js';
import {DatabaseService} from '../../apps/api/dist/database/database.service.js';
import {MailWorker} from '../../apps/api/dist/communications/mail.worker.js';
import {renderNotificationMail} from '../../apps/api/dist/communications/templates.js';
import {fixture} from '../../scripts/demo-fixtures.mjs';

// A local SMTP sink: test messages never leave the temporary test process.
async function smtpSink(){
 const messages=[],sockets=new Set();let rejection=0;
 const server=net.createServer(socket=>{sockets.add(socket);socket.on('close',()=>sockets.delete(socket));socket.on('error',()=>{});socket.write('220 localhost test SMTP\r\n');let buffer='',data=false,message='';
  socket.on('data',chunk=>{buffer+=chunk.toString();let at;while((at=buffer.indexOf('\r\n'))>=0){const line=buffer.slice(0,at);buffer=buffer.slice(at+2);
   if(data){if(line==='.'){data=false;messages.push(message);message='';socket.write('250 accepted\r\n');}else message+=line+'\n';continue;}
   if(/^EHLO|^HELO/.test(line))socket.write('250-localhost\r\n250 8BITMIME\r\n');
   else if(/^MAIL/.test(line))socket.write('250 ok\r\n');
   else if(/^RCPT/.test(line))socket.write(rejection?`${rejection} test rejection\r\n`:'250 ok\r\n');
   else if(line==='DATA'){data=true;socket.write('354 continue\r\n');}
   else if(line==='QUIT'){socket.end('221 bye\r\n');}
   else socket.write('250 ok\r\n');
  }});
 });await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 return {port:server.address().port,messages,reject:code=>{rejection=code;},close:async()=>{for(const s of sockets)s.destroy();await new Promise(resolve=>server.close(resolve));}};
}

test('communications: durable inbox, scoped permissions and SMTP recovery',async t=>{
 const admin=new Pool({connectionString:process.env.SEP_TEST_ADMIN_URL}),runtime=new Pool({connectionString:process.env.DATABASE_URL,max:1});
 const config=loadConfig(),tokens=JSON.parse(process.env.SEP_TEST_TOKENS),{app}=await createApplication({...config,mail:undefined});
 await app.get(DatabaseService).verifyRuntime();await app.listen(0,'127.0.0.1');
 const port=app.getHttpServer().address().port,event=fixture.events.a1,org=fixture.organizations.a,owner=fixture.people.outsider,work=randomUUID();
 t.after(async()=>{await app.close();await admin.end();await runtime.end();});
 async function call(path,{user='mixed',method='GET',body,host=fixture.hosts.a1}={}){return new Promise((resolve,reject)=>{const data=body===undefined?undefined:JSON.stringify(body);const r=http.request({hostname:'127.0.0.1',port,path:'/api/v1'+path,method,headers:{host,...(user?{authorization:'Bearer '+tokens[user]}:{}),...(data?{'content-type':'application/json','content-length':Buffer.byteLength(data)}:{})}},res=>{let text='';res.on('data',c=>{text+=c;});res.on('end',()=>resolve({status:res.statusCode,body:JSON.parse(text)}));});r.on('error',reject);r.end(data);});}
 const root=`/events/${event}`,announcement={id:randomUUID(),messageEs:'Comunicado de prueba <seguro> & privado.',messageEn:'Test announcement <safe> & private.',audience:'registrants',category:'operational'};
 await admin.query(`INSERT INTO author_works(id,organization_id,event_id,owner_id,title,language,track_id,contribution_type_id,call_snapshot,status) VALUES($1,$2,$3,$4,'Trabajo de prueba','es',$5,$6,'{}','accepted')`,[work,org,event,owner,randomUUID(),randomUUID()]);
 await admin.query(`INSERT INTO registration_entries(id,organization_id,event_id,person_id,name,affiliations,category,modality,status,policy) VALUES($1,$2,$3,$4,'Autor de prueba','[]','{}','in_person','confirmed','{}')`,[randomUUID(),org,event,owner]);
 await t.test('announcements create one personal notice and outbox entry, with idempotent resubmission',async()=>{
  assert.equal((await call(root+'/communications/announcements',{method:'POST',body:announcement})).status,200);
  assert.equal((await call(root+'/communications/announcements',{method:'POST',body:announcement})).status,200);
  const list=await call(root+'/notifications',{user:'outsider'});assert.equal(list.status,200);assert.equal(list.body.total,1);assert.equal(list.body.unread,1);assert.equal(list.body.data[0].message,announcement.messageEs);
  const outbox=await call(root+'/communications/deliveries');assert.equal(outbox.status,200);assert.equal(outbox.body.total,1);assert.equal(outbox.body.data[0].personName,'Demo outsider');assert.equal(outbox.body.mailAvailable,false);
  assert.equal((await call(root+'/communications/announcements',{method:'POST',body:{...announcement,messageEs:'Un texto distinto para el mismo identificador'}})).status,409);
 });
 await t.test('read state survives reload, remains personal and cannot cross events',async()=>{
  const list=await call(root+'/notifications',{user:'outsider'}),id=list.body.data[0].id;
  assert.equal((await call(root+'/notifications/'+id+'/read',{user:'outsider',method:'POST',body:{read:true}})).status,200);
  assert.equal((await call(root+'/notifications',{user:'outsider'})).body.unread,0);
  assert.equal((await call(root+'/notifications/'+id+'/read',{user:'reviewer',method:'POST',body:{read:true}})).status,404);
  assert.equal((await call(root+'/notifications',{user:'reviewer'})).body.total,0);
  assert.equal((await call(root+'/notifications',{user:'outsider',host:fixture.hosts.b1})).status,404);
  assert.equal((await call(root+'/notifications',{user:null})).status,401);
  assert.equal((await call(root+'/communications/deliveries',{user:'outsider'})).status,404);
  assert.equal((await call(root+'/communications/templates',{user:'outsider'})).status,404);
  assert.equal((await call(root+'/communications/deliveries',{user:'admin'})).status,200);
  assert.equal((await call(root+'/notifications/'+id+'/read',{user:'outsider',method:'POST',body:{read:false}})).status,200);
  assert.equal((await call(root+'/notifications?filter=unread',{user:'outsider'})).body.total,1);
 });
 await t.test('notice and queue roll back with business action; committed decisions reach the author',async()=>{
  const client=await runtime.connect(),id=randomUUID();try{
   await client.query('BEGIN');await client.query(`SELECT set_config('sep.organization_id',$1,true),set_config('sep.event_id',$2,true),set_config('sep.person_id',$3,true)`,[org,event,fixture.people.mixed]);
   await client.query(`INSERT INTO audit_entries(id,organization_id,event_id,person_id,action,resource_id,request_id) VALUES($1,$2,$3,$4,'work.decision',$5,$6)`,[id,org,event,fixture.people.mixed,work,randomUUID()]);
   assert.equal((await admin.query('SELECT count(*)::int n FROM event_notifications WHERE source_key=$1',['audit:'+id])).rows[0].n,0);
   await client.query('ROLLBACK');assert.equal((await admin.query('SELECT count(*)::int n FROM mail_deliveries')).rows[0].n,1);
   await client.query('BEGIN');await client.query(`SELECT set_config('sep.organization_id',$1,true),set_config('sep.event_id',$2,true),set_config('sep.person_id',$3,true)`,[org,event,fixture.people.mixed]);
   await client.query(`INSERT INTO audit_entries(id,organization_id,event_id,person_id,action,resource_id,request_id) VALUES($1,$2,$3,$4,'work.decision',$5,$6)`,[id,org,event,fixture.people.mixed,work,randomUUID()]);await client.query('COMMIT');
   const list=await call(root+'/notifications',{user:'outsider'});assert.equal(list.body.total,2);assert(list.body.data.some(v=>v.kind==='work.decision'&&v.resourceId===work));
  }finally{await client.query('ROLLBACK');client.release();}
 });
 await t.test('preferences use optimistic revisions; optional email defaults to off',async()=>{
  const before=await call(root+'/notifications/preferences',{user:'outsider'});assert.equal(before.body.optionalEmail,false);assert.equal(before.body.verifiedEmail,null);
  const body={revision:0,emailEnabled:true,optionalEmail:false,locale:'en'};
  assert.equal((await call(root+'/notifications/preferences',{user:'outsider',method:'PUT',body})).status,200);
  assert.equal((await call(root+'/notifications/preferences',{user:'outsider',method:'PUT',body})).status,409);
  assert.equal((await call(root+'/notifications/preferences',{user:'reviewer'})).body.revision,0);
 });
 const sink=await smtpSink(),worker=new MailWorker(app.get(DatabaseService),{...config,mail:{host:'127.0.0.1',port:sink.port,secure:false,localPlaintext:true,from:'sep@example.test',adminOrigin:'http://127.0.0.1:6789',messageDomain:'example.test'}});
 t.after(async()=>{await worker.onModuleDestroy();await sink.close();});
 await t.test('no verified address blocks delivery without losing the in-app notice',async()=>{
  await worker.tick();assert.equal(sink.messages.length,0);
  const list=(await call(root+'/communications/deliveries')).body;assert.equal(list.counts.blocked,2);assert.equal((await call(root+'/notifications',{user:'outsider'})).body.total,2);
  const attempts=await call(root+'/communications/deliveries/'+list.data[0].id+'/attempts');assert.equal(attempts.body.data[0].errorCode,'no_verified_email');
 });
 await t.test('verified address, manual retry, safe bilingual template and delivered history',async()=>{
  await app.get(DatabaseService).rememberVerifiedEmail(owner,'author@example.test');
  const deliveries=(await call(root+'/communications/deliveries')).body.data;
  for(const d of deliveries)assert.equal((await call(root+'/communications/deliveries/'+d.id+'/retry',{method:'POST',body:{}})).status,200);
  await worker.tick();assert.equal(sink.messages.length,2);
  const list=(await call(root+'/communications/deliveries')).body;assert.equal(list.counts.sent,2);assert(list.data.every(d=>d.recipient==='author@example.test'&&d.attempts===1));
  assert.equal((await call(root+'/communications/deliveries/'+list.data[0].id+'/retry',{method:'POST',body:{}})).status,409);
  const rendered=renderNotificationMail({kind:'announcement',locale:'en',eventName:'Science',message:'<script>&',url:'https://example.test/?a=1&b=2'});assert(rendered.html.includes('&lt;script&gt;&amp;'));assert(!rendered.html.includes('<script>'));assert(rendered.text.includes('Open in SEP'));
 });
 await t.test('optional messages stay in the inbox but do not send without opt-in',async()=>{
  assert.equal((await call(root+'/communications/announcements',{method:'POST',body:{...announcement,id:randomUUID(),category:'optional'}})).status,200);
  await worker.tick();assert.equal(sink.messages.length,2);assert.equal((await call(root+'/communications/deliveries')).body.counts.suppressed,1);assert.equal((await call(root+'/notifications',{user:'outsider'})).body.total,3);
 });
 await t.test('program publication reaches registered people, presenters and moderators without duplicates',async()=>{
  const snapshot={sessions:[{moderatorIds:[fixture.people.reviewer],slots:[{presenterPersonId:owner}]}],activities:[{coordinatorIds:[fixture.people.reviewer2]}]};
  await admin.query('INSERT INTO program_publications(organization_id,event_id,snapshot,revision) VALUES($1,$2,$3,1)',[org,event,snapshot]);
  const client=await runtime.connect();try{await client.query('BEGIN');await client.query(`SELECT set_config('sep.organization_id',$1,true),set_config('sep.event_id',$2,true),set_config('sep.person_id',$3,true)`,[org,event,fixture.people.mixed]);await client.query(`INSERT INTO audit_entries(id,organization_id,event_id,person_id,action,resource_id,request_id) VALUES($1,$2,$3,$4,'program.published',$3,$5)`,[randomUUID(),org,event,fixture.people.mixed,randomUUID()]);await client.query('COMMIT');}finally{client.release();}
  const result=await admin.query(`SELECT person_id,count(*)::int n FROM event_notifications WHERE kind='program.published' GROUP BY person_id`);assert.equal(result.rows.length,3);assert(result.rows.every(r=>r.n===1));
  await worker.tick();
  const change=await admin.connect();try{await change.query('BEGIN');await change.query(`SELECT set_config('sep.organization_id',$1,true),set_config('sep.event_id',$2,true)`,[org,event]);await change.query(`UPDATE program_publications SET snapshot='{"sessions":[],"activities":[]}',revision=2,published_at=clock_timestamp() WHERE organization_id=$1 AND event_id=$2`,[org,event]);await change.query(`INSERT INTO audit_entries(id,organization_id,event_id,person_id,action,resource_id,request_id) VALUES($1,$2,$3,$4,'program.published',$3,$5)`,[randomUUID(),org,event,fixture.people.mixed,randomUUID()]);await change.query('COMMIT');}finally{await change.query('ROLLBACK');change.release();}
  const changes=await admin.query(`SELECT person_id,count(*)::int n FROM event_notifications WHERE kind='program.published' GROUP BY person_id`);assert.equal(changes.rows.length,3);assert(changes.rows.every(r=>r.n===2));await worker.tick();
 });
 await t.test('transient SMTP errors retry, leases prevent duplicate claims, permanent errors stop',async()=>{
  const acceptedBefore=sink.messages.length;const create=()=>call(root+'/communications/announcements',{method:'POST',body:{...announcement,id:randomUUID()}});
  await create();sink.reject(451);await worker.tick();let rows=(await call(root+'/communications/deliveries')).body.data;let d=rows.find(v=>v.status==='retry');assert(d);assert.equal(d.attempts,1);assert.equal(d.errorCode,'smtp_temporary');
  await worker.tick();assert.equal((await call(root+'/communications/deliveries')).body.data.find(v=>v.id===d.id).attempts,1);
  await admin.query(`UPDATE mail_deliveries SET next_attempt_at=now()-interval '1 second' WHERE id=$1`,[d.id]);
  const [a,b]=await Promise.all([runtime.query('SELECT sep_mail_claim() v'),runtime.query('SELECT sep_mail_claim() v')]);const claimed=[a.rows[0].v,b.rows[0].v].filter(Boolean);assert.equal(claimed.length,1);assert.equal(claimed[0].id,d.id);
  assert.equal((await runtime.query(`SELECT sep_mail_finish($1,$2,'sent',NULL) ok`,[d.id,randomUUID()])).rows[0].ok,false);
  await runtime.query(`SELECT sep_mail_finish($1,$2,'retry','smtp_temporary')`,[d.id,claimed[0].lease]);
  await admin.query(`UPDATE mail_deliveries SET next_attempt_at=now()-interval '1 second' WHERE id=$1`,[d.id]);sink.reject(0);await worker.tick();assert.equal(sink.messages.length,acceptedBefore+1);
  await create();sink.reject(550);await worker.tick();d=(await call(root+'/communications/deliveries')).body.data.find(v=>v.status==='failed');assert(d);assert.equal(d.errorCode,'smtp_permanent');
  assert.equal((await call(root+'/communications/deliveries/'+d.id+'/attempts',{user:'outsider'})).status,404);
  await create();sink.reject(451);await worker.tick();const limited=(await call(root+'/communications/deliveries')).body.data.find(v=>v.status==='retry');assert(limited);
  await admin.query(`UPDATE mail_deliveries SET attempts=4,next_attempt_at=now()-interval '1 second' WHERE id=$1`,[limited.id]);await worker.tick();const exhausted=(await call(root+'/communications/deliveries')).body.data.find(v=>v.id===limited.id);assert.equal(exhausted.status,'failed');assert.equal(exhausted.attempts,5);
  await create();const lease=(await runtime.query('SELECT sep_mail_claim() v')).rows[0].v;assert(lease&&!lease.skipped);
  await admin.query(`UPDATE mail_deliveries SET lease_until=now()-interval '1 second' WHERE id=$1`,[lease.id]);sink.reject(0);await worker.tick();assert.equal((await call(root+'/communications/deliveries')).body.data.find(v=>v.id===lease.id).status,'sent');
  assert.equal((await runtime.query(`SELECT sep_mail_finish($1,$2,'failed','smtp_permanent') ok`,[lease.id,lease.lease])).rows[0].ok,false);
 });
});
