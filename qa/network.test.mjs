import test from 'node:test';import assert from 'node:assert/strict';import {once} from 'node:events';import {setTimeout as delay} from 'node:timers/promises';import {createIslandServer} from '../server.mjs';
test('two independent HTTP/SSE clients share a server-authoritative co-op run',async()=>{const app=createIslandServer();app.server.listen(0,'127.0.0.1');await once(app.server,'listening');const base='http://127.0.0.1:'+app.server.address().port;const aborters=[];let errors=[];
 const post=async(endpoint,value)=>{const r=await fetch(base+'/api/'+endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(value)});return {status:r.status,...await r.json()};};
 async function client(session){const abort=new AbortController();aborters.push(abort);const result={last:null};const res=await fetch(base+'/api/events?room='+session.room+'&token='+session.token,{signal:abort.signal});assert.equal(res.status,200);let buffer='';(async()=>{try{for await(const bytes of res.body){buffer+=new TextDecoder().decode(bytes);let i;while((i=buffer.indexOf('\n\n'))>=0){const chunk=buffer.slice(0,i);buffer=buffer.slice(i+2);if(chunk.startsWith('data: '))result.last=JSON.parse(chunk.slice(6));}}}catch(e){if(e.name!=='AbortError')errors.push(e.message);}})();return result;}
 try{
  const host=await post('rooms',{hero:'alex'}),one=await client(host);assert.equal(host.status,201);
  const guest=await post('join',{room:host.room}),two=await client(guest);assert.equal(guest.status,201);
  assert.equal((await post('join',{room:host.room})).status,409);
  assert.equal((await post('launch',{...guest,seq:1})).status,403);
  assert.equal((await post('launch',{...host,seq:1})).status,200);
  await delay(130);assert.equal(one.last.state.boss.maxHP,1920);assert.equal(two.last.state.boss.maxHP,1920);assert.deepEqual(one.last.state.players.map(p=>p.hero),['alex','victory']);
  const oldx=one.last.state.players[0].x;
  assert.equal((await post('input',{...host,seq:2,input:{x:1,z:0,hp:9999}})).status,200);await delay(150);assert.ok(one.last.state.players[0].x>oldx);assert.equal(one.last.state.players[0].hp,120);
  assert.equal((await post('input',{...host,seq:2,input:{x:-1}})).accepted,false);
  assert.equal((await post('input',{...host,token:'wrong',seq:3})).status,403);
  aborters[1].abort();await delay(120);assert.equal(one.last.state.paused,true);assert.equal(one.last.state.players[1].connected,false);const frozen=one.last.state.t;await delay(100);assert.equal(one.last.state.t,frozen);
  const again=await client(guest);await post('input',{...host,seq:3,input:{},action:'pause'});await delay(130);assert.equal(again.last.state.paused,false);
  const bad=await fetch(base+'/api/input',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://untrusted.example'},body:JSON.stringify({...host,seq:4})});assert.equal(bad.status,403);
  assert.equal((await fetch(base+'/.env')).status,403);assert.equal((await fetch(base+'/server.mjs')).status,403);assert.equal(errors.length,0);
 }finally{aborters.forEach(a=>a.abort());await app.close();}
});
