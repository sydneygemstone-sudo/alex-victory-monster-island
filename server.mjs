/** Local-only co-op server. Run `node server.mjs`; no external dependencies. */
import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {randomBytes} from 'node:crypto';
import os from 'node:os';
import {World,VERSION} from './game/core.mjs';
const ROOT=path.dirname(fileURLToPath(import.meta.url));
const TYPES={'.wav':'audio/wav','.mp3':'audio/mpeg','.ogg':'audio/ogg','.html':'text/html','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.md':'text/plain','.zip':'application/zip','.txt':'text/plain','.webmanifest':'application/manifest+json'};
function json(res,status,body){if(res.writableEnded)return;res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(body));}
async function body(req){let text='';for await(const c of req){text+=c;if(text.length>4096)throw new Error('payload');}return JSON.parse(text||'{}');}
export function createIslandServer({root=ROOT}={}){
 const rooms=new Map();const broadcast=room=>{const packet=JSON.stringify({version:VERSION,room:room.code,started:!!room.world,players:room.members.map(m=>({id:m.id,hero:m.hero,connected:!!m.res})),state:room.world?.snapshot()||null});for(const m of room.members){if(m.res&&!m.res.destroyed){if(m.res.writableLength>1000000){m.res.destroy();continue;}m.res.write('data: '+packet+'\n\n');}}};
 function credentials(data){const r=rooms.get(String(data.room||'').toUpperCase());const m=r?.members.find(m=>m.token===data.token);return [r,m];}
 const server=http.createServer(async(req,res)=>{try{
  const url=new URL(req.url,'http://localhost');const route=url.pathname;
  if(route==='/api/info')return json(res,200,{version:VERSION,mode:'lan',maxPlayers:2,transport:'SSE snapshots + validated HTTP input',bossHPMultiplier:2});
  if(route.startsWith('/api/')){
   if(req.method==='POST'){
    const origin=req.headers.origin;if(origin&&new URL(origin).host!==req.headers.host)return json(res,403,{error:'origin'});
    if(!(req.headers['content-type']||'').startsWith('application/json'))return json(res,415,{error:'json required'});
    const d=await body(req);
    if(route==='/api/rooms'){
     if(rooms.size>=16)return json(res,429,{error:'room limit'});
     let code;do{code=randomBytes(3).toString('hex').toUpperCase();}while(rooms.has(code));
     const m={id:0,hero:d.hero==='victory'?'victory':'alex',token:randomBytes(18).toString('hex'),res:null,seq:-1,bucket:0,bucketT:Date.now()};
     rooms.set(code,{code,members:[m],world:null,lastActive:Date.now()});return json(res,201,{room:code,token:m.token,id:0});
    }
    if(route==='/api/join'){
     const r=rooms.get(String(d.room||'').toUpperCase());if(!r||r.members.length>=2)return json(res,409,{error:'roomFull'});
     const m={id:1,hero:r.members[0].hero==='alex'?'victory':'alex',token:randomBytes(18).toString('hex'),res:null,seq:-1,bucket:0,bucketT:Date.now()};r.members.push(m);r.lastActive=Date.now();broadcast(r);return json(res,201,{room:r.code,token:m.token,id:1});
    }
    const [r,m]=credentials(d);if(!r||!m)return json(res,403,{error:'credentials'});
    if(Date.now()-m.bucketT>1000){m.bucket=0;m.bucketT=Date.now();}if(++m.bucket>65)return json(res,429,{error:'input rate'});
    if(!Number.isSafeInteger(d.seq)||d.seq<=m.seq)return json(res,200,{accepted:false,reason:'duplicate sequence'});m.seq=d.seq;r.lastActive=Date.now();
    if(route==='/api/input'){
     if(!r.world||!m.res)return json(res,409,{error:'not connected'});
     m.inputT=Date.now();if(m.res&&!r.world.s.players[m.id].connected)r.world.setConnected(m.id,true);r.world.setInput(m.id,d.input||{});if(d.action){if(['rematch','finish'].includes(d.action)&&m.id!==0)return json(res,403,{error:'hostOnly'});r.world.command(m.id,d.action);}return json(res,200,{accepted:true});
    }
    if(route==='/api/launch'){
     if(m.id!==0)return json(res,403,{error:'hostOnly'});
     if(r.members.length!==2||r.members.some(x=>!x.res))return json(res,409,{error:'waiting'});
     if(r.world&&!['dead','won'].includes(r.world.s.phase))return json(res,409,{error:'already started'});
     r.world=new World({heroes:r.members.map(m=>m.hero)});r.world.startCinematic();for(const member of r.members)member.inputT=Date.now();broadcast(r);return json(res,200,{accepted:true});
    }
    return json(res,404,{error:'unknown route'});
   }
   if(route==='/api/events'&&req.method==='GET'){
    const [r,m]=credentials(Object.fromEntries(url.searchParams));if(!r||!m)return json(res,403,{error:'credentials'});
    if(m.res)m.res.end();res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache, no-transform','Connection':'keep-alive','X-Content-Type-Options':'nosniff'});res.write(': island connected\n\n');m.res=res;r.lastActive=Date.now();if(r.world)r.world.setConnected(m.id,true);broadcast(r);
    req.on('close',()=>{if(m.res===res){m.res=null;r.world?.setConnected(m.id,false);broadcast(r);}});return;
   }return json(res,404,{error:'unknown route'});
  }
  if(!['GET','HEAD'].includes(req.method))return json(res,405,{error:'method'});
  let decoded;try{decoded=decodeURIComponent(route);}catch{return json(res,400,{error:'path'});}
  if(decoded.includes('..')||decoded.includes('\\')||decoded.split('/').some(p=>p.startsWith('.')&&p!=='.nojekyll')||decoded==='/server.mjs'||decoded.startsWith('/qa/'))return json(res,403,{error:'private path'});
  const f=path.resolve(root,'.'+(decoded.endsWith('/')?decoded+'index.html':decoded));if(!f.startsWith(path.resolve(root)+path.sep))return json(res,403,{error:'path'});
  const ext=path.extname(f),type=TYPES[ext];if(!type)return json(res,403,{error:'file type'});
  const info=await stat(f);if(!info.isFile())return json(res,404,{error:'not found'});res.writeHead(200,{'Content-Type':type+(type.startsWith('text/')?'; charset=utf-8':''),'Content-Length':info.size,'X-Content-Type-Options':'nosniff','Cache-Control':'no-cache'});if(req.method==='HEAD')res.end();else res.end(await readFile(f));
 }catch(e){json(res,e.code==='ENOENT'?404:400,{error:e.code==='ENOENT'?'not found':'bad request'});}});
 let ticks=0;const timer=setInterval(()=>{ticks++;for(const [code,r] of rooms){if(r.world)for(const m of r.members){if(Date.now()-(m.inputT||Date.now())>2000)r.world.setInput(m.id,{});if(Date.now()-(m.inputT||Date.now())>6000&&r.world.s.players[m.id].connected)r.world.setConnected(m.id,false);}r.world?.step(1/60);if(ticks%3===0)broadcast(r);if(Date.now()-r.lastActive>30*60*1000&&r.members.every(m=>!m.res)){rooms.delete(code);}}},1000/60);timer.unref();
 return {server,rooms,close:()=>new Promise(resolve=>{clearInterval(timer);for(const r of rooms.values())for(const m of r.members)m.res?.end();server.close(resolve);server.closeAllConnections?.();})};
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){const app=createIslandServer();const port=Number(process.env.PORT)||8896;app.server.listen(port,'0.0.0.0',()=>{console.log('Monster Island '+VERSION+' — local co-op');console.log('Computer: http://127.0.0.1:'+port+'/');for(const entries of Object.values(os.networkInterfaces()))for(const a of entries||[])if(a.family==='IPv4'&&!a.internal)console.log('Same-Wi-Fi iPad: http://'+a.address+':'+port+'/game/');console.log('No public tunnel opened. Keep this terminal running.');});}
