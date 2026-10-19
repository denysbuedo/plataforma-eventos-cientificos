import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {mkdtemp} from 'node:fs/promises';
import {resolve} from 'node:path';
import {Pool} from 'pg';
import {createApplication} from '../../apps/api/dist/application.js';
import {loadConfig} from '../../apps/api/dist/config.js';
import {DatabaseService} from '../../apps/api/dist/database/database.service.js';
import {fixture} from '../../scripts/demo-fixtures.mjs';
test('local registration, verified identity, recovery and revocable sessions',async t=>{
 const directory=await mkdtemp(resolve('.local/local-auth-mail-'));
 const base=loadConfig(),config={...base,authMode:'oidc',tokens:new Map(),oidc:{issuer:'https://identity.example.test',audience:'sep-api',jwksUrl:'https://identity.example.test/keys',roleClientId:'sep-test',allowedClientRoles:['ROLE_USER']},localAuth:{origin:'http://127.0.0.1:6789',previewDirectory:directory}};
 const admin=new Pool({connectionString:process.env.SEP_TEST_ADMIN_URL}),runtime=new Pool({connectionString:base.databaseUrl});
 const {app}=await createApplication(config);t.after(async()=>{await app.close();await admin.end();await runtime.end();});await app.get(DatabaseService).verifyRuntime();await app.listen(0,'127.0.0.1');const port=app.getHttpServer().address().port;
 const password='Una frase privada para esta prueba 46',nextPassword='Una frase diferente para la cuenta 91',email='persona.local@example.test';let session,person,verification;
 async function call(path,{body,token,method=body?'POST':'GET'}={}){return new Promise((resolve,reject)=>{const data=body?JSON.stringify(body):null;const r=http.request({hostname:'127.0.0.1',port,path:'/api/v1/'+path,method,headers:{host:fixture.hosts.orgA,...(token?{authorization:'Bearer '+token}:{}),...(data?{'content-type':'application/json','content-length':Buffer.byteLength(data)}:{})}},res=>{let text='';res.setEncoding('utf8');res.on('data',c=>text+=c);res.on('end',()=>resolve({status:res.statusCode,body:JSON.parse(text)}));});r.on('error',reject);r.end(data);});}
 const post=(action,body)=>call('auth/local/'+action,{body}),ok=(r,status=201)=>assert.equal(r.status,status,JSON.stringify(r.body));
 const ticket=async result=>{ok(result);const mail=await call('auth/local/mail/'+result.body.previewId);ok(mail,200);return new URLSearchParams(new URL(mail.body.url).hash.slice(1)).get('token');};
 await t.test('new accounts need email verification and their passwords are hashed',async()=>{
  ok(await post('register',{name:'Persona de prueba',email,password:'corta'}),400);
  const result=await post('register',{name:'Persona de prueba',email,password});verification=await ticket(result);
  const rows=(await admin.query('SELECT * FROM local_accounts WHERE email=$1',[email])).rows;assert.equal(rows.length,1);assert.match(rows[0].password_hash,/^scrypt\$/);assert(!rows[0].password_hash.includes(password));person=rows[0].person_id;
  ok(await post('login',{email,password}),403);ok(await post('login',{email,password:'contraseña incorrecta'}),401);
  ok(await post('verify',{token:verification}));ok(await post('verify',{token:verification}),400);
  const logged=await post('login',{email:email.toUpperCase(),password});ok(logged);session=logged.body.accessToken;assert.match(session,/^sep_local\./);
  const me=await call('me',{token:session});ok(me,200);assert.equal(me.body.person.email,email);assert.equal(me.body.person.id,person);
 });
 await t.test('registration grants no organization or event roles and cannot read credential tables',async()=>{
  const access=await call('me/access',{token:session});ok(access,200);assert.equal(access.body.organizationAdmin,false);assert.equal(access.body.events.length,0);
  assert([403,404].includes((await call('organization/access',{token:session})).status));
  assert.equal((await admin.query('SELECT count(*)::int AS n FROM memberships WHERE person_id=$1',[person])).rows[0].n,0);
  await assert.rejects(runtime.query('SELECT * FROM local_accounts'),{code:'42501'});await assert.rejects(runtime.query('SELECT * FROM local_sessions'),{code:'42501'});
 });
 await t.test('duplicate verified registration cannot replace a password or create another identity',async()=>{
  const duplicate=await post('register',{name:'Otro nombre',email,password:nextPassword});ok(duplicate);assert.equal(duplicate.body.previewId,undefined);
  assert.equal((await admin.query('SELECT count(*)::int AS n FROM local_accounts WHERE email=$1',[email])).rows[0].n,1);
  ok(await post('login',{email,password:nextPassword}),401);ok(await post('login',{email,password}));
 });
 await t.test('pending registrations bind verification to the password chosen in that request',async()=>{
  const other='pendiente@example.test';const first=await ticket(await post('register',{name:'Primer intento',email:other,password}));const second=await ticket(await post('register',{name:'Solicitud propia',email:other,password:nextPassword}));
  ok(await post('verify',{token:second}));ok(await post('verify',{token:first}),400);ok(await post('login',{email:other,password}),401);ok(await post('login',{email:other,password:nextPassword}));
 });
 await t.test('reset links are single use and reset immediately revokes previous sessions',async()=>{
  const unknown=await post('request-mail',{email:'nadie@example.test',purpose:'reset'});ok(unknown);assert.equal(unknown.body.ok,true);assert.equal(unknown.body.previewId,undefined);
  const reset=await ticket(await post('request-mail',{email,purpose:'reset'}));ok(await post('reset',{token:reset,password:nextPassword}));ok(await post('reset',{token:reset,password:nextPassword}),400);
  ok(await call('me',{token:session}),401);ok(await post('login',{email,password}),401);const logged=await post('login',{email,password:nextPassword});ok(logged);session=logged.body.accessToken;
 });
 await t.test('expired tickets, expired sessions and disabled accounts are rejected',async()=>{
  const reset=await ticket(await post('request-mail',{email,purpose:'reset'}));await admin.query("UPDATE local_challenges SET expires_at=now()-interval '1 minute' WHERE person_id=$1",[person]);ok(await post('reset',{token:reset,password}),400);
  await admin.query('UPDATE local_accounts SET active=false WHERE person_id=$1',[person]);ok(await call('me',{token:session}),401);await admin.query('UPDATE local_accounts SET active=true WHERE person_id=$1',[person]);ok(await call('me',{token:session}),200);
  await admin.query("UPDATE local_sessions SET expires_at=now()-interval '1 minute' WHERE person_id=$1",[person]);ok(await call('me',{token:session}),401);
 });
 await t.test('logout invalidates the actual API session and forged tokens fail',async()=>{
  const logged=await post('login',{email,password:nextPassword});ok(logged);session=logged.body.accessToken;ok(await call('auth/local/logout',{method:'POST',token:session}));ok(await call('me',{token:session}),401);ok(await call('me',{token:'sep_local.'+'a'.repeat(43)}),401);
 });
 await t.test('repeated authentication attempts are throttled',async()=>{
  for(let i=0;i<10;i++)ok(await post('login',{email:'inexistente@example.test',password}),401);ok(await post('login',{email:'inexistente@example.test',password}),429);
 });
 await t.test('local accounts can only accept invitations addressed to their verified email',async()=>{
  const signed=await post('login',{email,password:nextPassword});ok(signed);const token=signed.body.accessToken,raw='a'.repeat(43),{createHash,randomUUID}=await import('node:crypto');
  const id=randomUUID();await admin.query(`INSERT INTO organization_invitations(id,organization_id,name,email,token_hash,created_by,expires_at) VALUES($1,$2,'Invitación de prueba','another@example.test',$3,$4,now()+interval '1 day')`,[id,fixture.organizations.a,createHash('sha256').update(raw).digest('hex'),fixture.people.admin]);
  ok(await call('invitations/accept',{token,body:{token:raw}}),403);
  await admin.query('UPDATE organization_invitations SET email=$1 WHERE id=$2',[email,id]);ok(await call('invitations/accept',{token,body:{token:raw}}),201);
 });
 await t.test('test mail transport is rejected outside local development',()=>{
  assert.throws(()=>loadConfig({...process.env,NODE_ENV:'production',AUTH_MODE:'oidc',DEV_AUTH_TOKENS_JSON:'{}',OIDC_ISSUER:config.oidc.issuer,OIDC_AUDIENCE:'sep-api',OIDC_JWKS_URL:config.oidc.jwksUrl,OIDC_ROLE_CLIENT_ID:'sep-test',OIDC_ALLOWED_CLIENT_ROLES:'ROLE_USER',SEP_LOCAL_LOGIN_ENABLED:'1',SEP_ADMIN_ORIGIN:'https://sep.example.test',SEP_LOCAL_AUTH_MAIL_DIRECTORY:directory}));
 });
});
