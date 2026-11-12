import assert from 'node:assert/strict';

const origin=process.env.OGASTV_TEST_ORIGIN||'http://localhost:3000';
// The smoke test runs against the optimized production Next.js server, so the
// origin check intentionally expects OgasTV's HTTPS domain even on localhost.
const publicOrigin=process.env.OGASTV_PUBLIC_ORIGIN||'https://ogastvafrica.ng';
async function jsonFetch(path,options){
  const response=await fetch(origin+path,options);
  const body=await response.json().catch(()=>({}));
  return {response,body};
}
const login=await jsonFetch('/api/staff-users/login',{
  method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({email:'ops@inspirarestudio.com',password:'local-test-password-very-long-2026'})
});
assert.equal(login.response.status,200,'Disposable newsroom staff must be able to sign in');
assert.equal(typeof login.body.token,'string','Newsroom login must return JWT');
const authHeaders={'Content-Type':'application/json','Origin':origin,Authorization:'JWT '+login.body.token};
function publish(data,headers=authHeaders){
  return jsonFetch('/api/ogas-live/youtube',{
    method:'POST',headers,body:JSON.stringify(data)
  });
}
const sampleId='AbC012_xY-z';
let result=await publish({action:'start',title:'Test Youtube newsroom event',youtubeUrl:'https://youtube.com/live/'+sampleId},
  {'Content-Type':'application/json',Origin:publicOrigin});
assert.equal(result.response.status,403,'Public reader must not publish YouTube events');

result=await publish({action:'start',title:'Test YouTube newsroom event',youtubeUrl:'https://evil.example/live/'+sampleId});
assert.equal(result.response.status,400,'Untrusted YouTube URL must be rejected: '+JSON.stringify(result.body));

result=await publish({action:'start',title:'Test YouTube newsroom event',youtubeUrl:'https://youtube.com/live/'+sampleId,
  description:'Temporary integration smoke test'});
assert.equal(result.response.status,201,'Authorized staff must be able to publish: '+JSON.stringify(result.body));
const eventId=Number(result.body.eventId);
assert.ok(Number.isSafeInteger(eventId)&&eventId>0,'Published event needs an ID');

const live=await jsonFetch('/api/ogas-live/status?eventId='+eventId);
assert.equal(live.response.status,200);
assert.equal(live.body.state,'live','Public status must show published YouTube stream as live');
assert.ok(Date.parse(live.body.actualStart),'Stream start timestamp must be recorded');
assert.equal(JSON.stringify(live.body).includes(sampleId),false,'Public status should reveal no video or private session details');

const conflict=await publish({action:'start',title:'Second concurrent YouTube event',youtubeUrl:sampleId});
assert.equal(conflict.response.status,409,'Do not silently replace an active OgasTV event');

const end=await publish({action:'end',eventId});
assert.equal(end.response.status,200,'Original broadcaster should end their event');
assert.ok(Date.parse(end.body.actualEnd),'End timestamp must be recorded');

const ended=await jsonFetch('/api/ogas-live/status?eventId='+eventId);
assert.equal(ended.body.state,'ended','Existing viewers should receive ended state');
assert.equal(ended.body.actualEnd,end.body.actualEnd,'End time must match saved timestamp');
console.log('YouTube Live integration smoke passed: auth, validation, publish, conflict, end & viewer status');
