/** Monster Island 2.0.0 — deterministic authoritative rules.
 * No DOM, renderer, storage or networking. Shared by solo and LAN server.
 * Classroom concepts: Alex & Victory. Direct integration: ChatGPT.
 */
import {STORY_DURATION,explorerPose} from './story.mjs';
export const VERSION = '2.1.0';
export const RULES = Object.freeze({bossHP:960,playerHP:120,speed:7.4,coopHP:2,maxPlayers:2,step:1/60,arena:{x:19,minZ:-25,maxZ:3.8}});
export const SHOP = Object.freeze({power:{cost:5,max:3},health:{cost:5,max:3},cooldown:{cost:6,max:2}});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const finite=(v,f=0)=>Number.isFinite(v)?v:f;
const smoothLeap=f=>{f=clamp(f/.82,0,1);return f*f*(3-2*f);};
export function segmentDistance(p,a,b){const dx=b.x-a.x,dz=b.z-a.z,l=dx*dx+dz*dz,t=l?clamp(((p.x-a.x)*dx+(p.z-a.z)*dz)/l,0,1):0;return Math.hypot(p.x-a.x-t*dx,p.z-a.z-t*dz);}
export function cleanProgress(raw){const p=raw&&typeof raw==='object'?raw:{};const u={};for(const k of Object.keys(SHOP))u[k]=clamp(Math.floor(finite(p.upgrades?.[k])),0,SHOP[k].max);return {coins:clamp(Math.floor(finite(p.coins)),0,500),clears:clamp(Math.floor(finite(p.clears)),0,5),upgrades:u,anchorUnlocked:p.anchorUnlocked===true};}
export function makeRocks(){return Array.from({length:13},(_,i)=>({id:i,x:(i%2?-1:1)*(4+(i%4)*2.9),z:6-Math.floor(i/2)*4.7,homeX:(i%2?-1:1)*(4+(i%4)*2.9),homeZ:6-Math.floor(i/2)*4.7,y:.4,status:'ground',owner:null,timer:0,vx:0,vz:0,damage:0}));}
export class World {
 constructor({heroes=['alex'],progress={},intro=true}={}){
  if(!Array.isArray(heroes)||!heroes.length||heroes.length>2)throw new Error('One or two explorers required');
  const save=cleanProgress(progress);this.input={};this.serial=0;this.introEnabled=intro;
  this.s={version:VERSION,t:0,phase:'beach',paused:false,round:Math.min(5,save.clears+1),clears:save.clears,rewarded:false,intro:0,coop:heroes.length===2,events:[],shots:[],playerShots:[],cinematic:false,rocks:makeRocks(),players:heroes.map((hero,id)=>({id,hero:hero==='victory'?'victory':'alex',x:heroes.length===2?(id?2:-2):0,z:18,hp:RULES.playerHP+save.upgrades.health*20,maxHP:RULES.playerHP+save.upgrades.health*20,coins:heroes.length===1?save.coins:0,upgrades:heroes.length===1?{...save.upgrades}:{power:0,health:0,cooldown:0},anchorUnlocked:heroes.length===1&&save.anchorUnlocked,attackCD:0,specialCD:0,dashCD:0,anchorCD:0,anchor:0,dash:0,inv:0,dx:0,dz:-1,holding:null,connected:true,score:0,y:0,aim:null,slam:null}))};
  if(this.s.coop){this.s.round=1;this.s.clears=0;for(const p of this.s.players)p.hp=p.maxHP=RULES.playerHP;}
  this.resetBoss();
 }
 resetBoss(){this.s.boss={x:0,z:-17,hp:Math.round(RULES.bossHP*Math.pow(1.28,this.s.round-1))*(this.s.coop?2:1),maxHP:Math.round(RULES.bossHP*Math.pow(1.28,this.s.round-1))*(this.s.coop?2:1),state:'idle',attack:'',y:0,leap:null,windup:0,cooldown:2,stun:0,charge:0,count:0,targets:[],vx:0,vz:0,enraged:false};}
 event(type,data={}){this.s.events.push({id:++this.serial,type,t:this.s.t,...data});if(this.s.events.length>64)this.s.events.splice(0,this.s.events.length-64);}
 setInput(id,value={}){if(!this.s.players[id])return;if(this.s.paused){this.input[id]={x:0,z:0,attack:false};return;}let x=clamp(finite(value.x),-1,1),z=clamp(finite(value.z),-1,1),d=Math.hypot(x,z);if(d>1){x/=d;z/=d;}this.input[id]={x,z,attack:value.attack===true};
  const p=this.s.players[id];if(p.aim&&value.aim&&Number.isFinite(value.aim.x)&&Number.isFinite(value.aim.z)){let dx=value.aim.x-p.x,dz=value.aim.z-p.z,d=Math.hypot(dx,dz);if(d>14){dx=dx/d*14;dz=dz/d*14;}p.aim={x:clamp(p.x+dx,-18,18),z:clamp(p.z+dz,-24,3)};}}
 setConnected(id,connected){const p=this.s.players[id];if(!p)return;p.connected=!!connected;this.setInput(id,{});if(!connected){this.s.paused=true;this.event('disconnect',{player:id});}}
 pause(on){if(!on&&this.s.players.some(p=>!p.connected))return false;this.s.paused=!!on;this.input={};return true;}
 begin(){if(this.s.phase!=='beach')return;for(const p of this.s.players){p.x=clamp(p.x,-8,8);p.z=Math.min(1,p.z);}this.s.phase=this.introEnabled&&this.s.round===1?'intro':'fight';this.s.intro=4.4;this.s.boss.state='fight';this.event('begin');}
 startCinematic(){if(this.s.phase!=='beach')return;this.s.phase='intro';this.s.intro=STORY_DURATION;this.s.cinematic=true;this.introEnabled=false;this.s.storyClock=0;this.event('cinemaStart');}
 finishCinematic(){this.s.phase='beach';this.s.cinematic=false;this.s.intro=0;this.s.storyClock=STORY_DURATION;this.s.boss.state='watch';for(const p of this.s.players){const a=explorerPose(STORY_DURATION,p.id);p.x=a.x;p.z=a.z;p.y=0;}this.input={};this.event('cinemaEnd');}
 target(){return this.s.players.filter(p=>p.hp>0).sort((a,b)=>distance(a,this.s.boss)-distance(b,this.s.boss))[0];}
 price(p,key){return SHOP[key]?SHOP[key].cost+2*p.upgrades[key]:Infinity;}
 command(id,action){const p=this.s.players[id];if(!p||typeof action!=='string')return false;
  if(action==='pause')return this.pause(!this.s.paused);if(action==='pauseOn')return this.pause(true);if(action==='resume')return this.pause(false);
  if(action==='skip'&&this.s.phase==='intro'){if(this.s.cinematic)this.finishCinematic();else this.s.phase='fight';return true;}
  if(this.s.paused)return false;
  if(action.startsWith('buy:')){
   const key=action.slice(4),item=SHOP[key];if(this.s.phase!=='shop'||!item||p.upgrades[key]>=item.max)return false;
   const cost=this.price(p,key);if(p.coins<cost){this.event('insufficient',{player:id});return false;}
   p.coins-=cost;p.upgrades[key]++;if(key==='health'){p.maxHP=RULES.playerHP+20*p.upgrades.health;p.hp=p.maxHP;}this.event('purchase',{player:id,key,cost});return true;
  }
  if(action==='rematch'&&this.s.phase==='shop'){
   this.s.round=Math.min(6,this.s.round+1);this.s.phase='beach';this.s.rewarded=false;this.s.shots=[];this.s.playerShots=[];this.s.rocks=makeRocks();this.resetBoss();
   for(const p of this.s.players){p.hp=p.maxHP;p.x=p.id?2:-2;p.z=1;p.holding=null;p.inv=1;p.aim=null;p.slam=null;p.y=0;for(const k of ['attackCD','specialCD','dashCD','anchorCD','dash','anchor'])p[k]=0;}this.begin();return true;
  }
  if(action==='finish'&&this.s.phase==='shop'){this.s.phase='won';this.event('won');return true;}
  if(!['beach','fight'].includes(this.s.phase)||p.hp<=0)return false;
  const factor=1-p.upgrades.cooldown*.1;
  if(p.slam)return false;
  if(action==='cancelAim'){p.aim=null;return true;}
  if(action==='slam'&&p.aim&&p.anchorUnlocked&&p.anchorCD<=0){const target={...p.aim};p.aim=null;p.slam={sx:p.x,sz:p.z,x:target.x,z:target.z,t:0,duration:1.1};p.anchorCD=8*factor;p.inv=1.3;p.anchor=1.3;p.dash=0;this.event('slamLaunch',{player:id,x:p.x,z:p.z,tx:target.x,tz:target.z});return true;}
  if(action==='dash'&&p.dashCD<=0){const d=this.input[id]||{};if(Math.hypot(d.x||0,d.z||0)>.1){p.dx=d.x;p.dz=d.z;}p.dash=.25;p.dashCD=2.6*factor;p.inv=Math.max(.5,p.inv);this.event('dash',{player:id});return true;}
  if(action==='anchor'&&p.anchorUnlocked&&p.anchorCD<=0){if(p.aim){p.aim=null;return true;}const b=this.s.boss,d=distance(p,b)||1;const reach=Math.min(12,d);p.aim={x:clamp(p.x+(b.x-p.x)/d*reach,-18,18),z:clamp(p.z+(b.z-p.z)/d*reach,-24,3)};this.event('aim',{player:id});return true;}
  if(p.aim)return false;
  if(action==='attack')return this.attack(p);
  if(action==='special'&&p.specialCD<=0&&this.s.phase==='fight'){
   if(distance(p,this.s.boss)>28)return false;p.specialCD=(p.hero==='alex'?6:8)*factor;
   if(p.hero==='alex'){this.fireSlug(p,true);}
   else{this.s.boss.stun=2.0;this.s.boss.leap=null;this.s.boss.y=0;if(this.s.boss.windup>0){this.s.boss.windup=0;this.s.boss.targets=[];this.s.boss.cooldown=1.5;}this.damageBoss(70*(1+.15*p.upgrades.power),id);this.event('gravity',{player:id,x:this.s.boss.x,z:this.s.boss.z});}
   return true;
  }return false;
 }
 attack(p){if(p.attackCD>0||p.aim||p.slam)return false;const s=this.s,b=s.boss,damageScale=1+.15*p.upgrades.power;
  if(p.hero==='victory'){
   if(p.holding!==null){const r=s.rocks[p.holding];if(!r||r.status!=='held')return false;
    if(s.phase!=='fight'){this.event('approach',{player:p.id});return false;}
    const d=distance(p,b)||1;r.status='flying';r.x=p.x;r.z=p.z;r.y=2.5;r.vx=(b.x-p.x)/d*23;r.vz=(b.z-p.z)/d*23;r.timer=2.4;r.damage=74*damageScale;p.holding=null;p.attackCD=.45;this.event('throw',{player:p.id});return true;
   }
   const near=s.rocks.filter(r=>r.status==='ground'&&distance(p,r)<7.5).sort((a,b)=>distance(p,a)-distance(p,b))[0];
   if(!near){this.event('noRock',{player:p.id});return false;}
   near.status='lifting';near.owner=p.id;near.timer=.38;p.holding=near.id;p.attackCD=.12;this.event('lift',{player:p.id,rock:near.id});return true;
  }
  if(s.phase!=='fight'||distance(p,b)>26){this.event('approach',{player:p.id});return false;}
  p.attackCD=.5*(1-.1*p.upgrades.cooldown);this.fireSlug(p,false);return true;
 }
 fireSlug(p,charged){const b=this.s.boss,d=distance(p,b)||1,vx=(b.x-p.x)/d,vz=(b.z-p.z)/d,speed=charged?34:27;
  p.dx=vx;p.dz=vz;const shot={id:++this.serial,owner:p.id,x:p.x+vx*.8,z:p.z+vz*.8,vx:vx*speed,vz:vz*speed,life:1.4,charged,damage:(charged?130:30)*(1+.15*p.upgrades.power)};
  this.s.playerShots.push(shot);this.event('railFire',{player:p.id,x:shot.x,z:shot.z,dx:vx,dz:vz,charged});
 }
 damageBoss(amount,id){const b=this.s.boss;if(this.s.phase!=='fight'||b.hp<=0)return;b.hp=Math.max(0,b.hp-amount);this.s.players[id].score+=amount;this.event('bossHit',{amount:Math.round(amount),player:id,x:b.x,y:4.4,z:b.z,hp:Math.max(0,Math.ceil(b.hp)),maxHP:b.maxHP});
  if(b.hp<=0){b.state='defeated';b.leap=null;b.y=0;b.targets=[];b.windup=0;b.charge=0;this.s.shots=[];this.s.phase='loot';this.event('bossDown');}
  else if(!b.enraged&&b.hp/b.maxHP<.45){b.enraged=true;this.event('enrage');}
 }
 damagePlayer(p,amount,knock=null){if(this.s.phase!=='fight'||p.hp<=0||p.inv>0)return;amount=Math.round(amount*(p.anchor>0?.45:1));p.hp=Math.max(0,p.hp-amount);p.inv=.65;this.event('hurt',{player:p.id,amount,x:p.x,y:2.5,z:p.z});
  if(knock&&p.anchor<=0){p.x=clamp(p.x+knock.x,-19,19);p.z=clamp(p.z+knock.z,-25,3.8);}
  if(p.hp<=0&&p.holding!==null){const r=this.s.rocks[p.holding];r.status='cooldown';r.timer=3;r.owner=null;p.holding=null;}
  if(this.s.players.every(p=>p.hp<=0)){this.s.phase='dead';this.input={};this.event('dead');}
 }
 grant(){if(this.s.phase!=='loot'||this.s.rewarded)return false;this.s.rewarded=true;this.s.clears=Math.max(this.s.clears,this.s.round);for(const p of this.s.players){p.coins+=12+(this.s.round-1)*3;p.anchorUnlocked=true;p.hp=p.maxHP;}this.s.phase='shop';this.input={};this.event('reward',{amount:12+(this.s.round-1)*3});return true;}
 progress(id=0){const p=this.s.players[id];return cleanProgress({coins:p.coins,upgrades:p.upgrades,clears:this.s.clears,anchorUnlocked:p.anchorUnlocked});}
 step(seconds=RULES.step){const dt=clamp(finite(seconds),0,.05),s=this.s,b=s.boss;if(s.paused||['shop','won','dead'].includes(s.phase))return;s.t+=dt;
  if(s.phase==='intro'){s.intro-=dt;if(s.cinematic){const before=s.storyClock||0;s.storyClock=STORY_DURATION-s.intro;for(const p of s.players){const pose=explorerPose(s.storyClock,p.id);p.x=pose.x;p.z=pose.z;p.y=pose.y;}for(const [at,event] of [[1.6,'footstep'],[6,'footstep'],[19.3,'roar'],[24,'snakeHiss'],[28.2,'bite'],[30,'gulp']])if(before<at&&s.storyClock>=at)this.event(event);if(s.intro<=0)this.finishCinematic();}else if(s.intro<=0){s.phase='fight';this.event('roar');}return;}
  for(const p of s.players){for(const k of ['attackCD','specialCD','dashCD','anchorCD','anchor','inv'])p[k]=Math.max(0,p[k]-dt);if(p.hp<=0)continue;
   if(p.slam){const a=p.slam;a.t+=dt;const f=clamp(a.t/a.duration,0,1),horizontal=Math.min(1,f/.8);p.x=a.sx+(a.x-a.sx)*horizontal;p.z=a.sz+(a.z-a.sz)*horizontal;p.y=Math.sin(Math.pow(f,.72)*Math.PI)*7;
    if(f>=1){p.x=a.x;p.z=a.z;p.y=0;p.slam=null;p.inv=.35;const d=distance(p,b),damage=Math.round(260*(1+.15*p.upgrades.power)*(d<3.2?1:.62));if(d<6.8){this.damageBoss(damage,p.id);b.stun=Math.max(b.stun,.7);}this.event('slamImpact',{player:p.id,x:p.x,z:p.z,radius:6.8,hit:d<6.8,damage:d<6.8?damage:0});}continue;}
   const i=this.input[p.id]||{x:0,z:0};let x=i.x,z=i.z;if(p.aim){p.aim.x=clamp(p.aim.x+x*11*dt,-18,18);p.aim.z=clamp(p.aim.z+z*11*dt,-24,3);const d=distance(p,p.aim);if(d>14){p.aim.x=p.x+(p.aim.x-p.x)/d*14;p.aim.z=p.z+(p.aim.z-p.z)/d*14;}x=0;z=0;}
   if(p.dash>0){p.dash=Math.max(0,p.dash-dt);x=p.dx;z=p.dz;}else if(Math.hypot(x,z)>.1){p.dx=x;p.dz=z;}
   const speed=p.dash>0?23:RULES.speed*(p.anchor>0?.48:1);p.x+=x*speed*dt;p.z+=z*speed*dt;
   p.x=clamp(p.x,-19,19);p.z=clamp(p.z,-25,s.phase==='fight'?3.8:23);
   if(b.hp>0&&distance(p,b)<3.2){const d=distance(p,b)||.001;p.x=b.x+(p.x-b.x)/d*3.2;p.z=b.z+(p.z-b.z)/d*3.2;}p.x=clamp(p.x,-19,19);p.z=clamp(p.z,-25,s.phase==='fight'?3.8:23);
   if(s.phase==='beach'&&distance(p,{x:0,z:-17})<14)this.begin();
   if(p.hero==='alex'&&i.attack&&s.phase==='fight')this.attack(p);
   if(s.phase==='loot'&&distance(p,{x:0,z:-24.5})<3.6)this.grant();
  }
  for(const r of s.rocks){
   if(r.status==='lifting'){r.timer-=dt;r.y=2.5*(1-Math.max(0,r.timer)/.38);if(r.timer<=0)r.status='held';}
   if(r.status==='held'){const p=s.players[r.owner];r.x=p.x+.8;r.z=p.z;r.y=2.5;}
   if(r.status==='flying'){const old={x:r.x,z:r.z};r.x+=r.vx*dt;r.z+=r.vz*dt;r.timer-=dt;
    if(b.hp>0&&segmentDistance(b,old,r)<3){this.damageBoss(r.damage,r.owner);r.status='cooldown';r.timer=3.5;this.event('rockHit',{x:r.x,z:r.z});}
    else if(r.timer<=0){r.status='cooldown';r.timer=2.5;}}
   else if(r.status==='cooldown'){r.timer-=dt;if(r.timer<=0){Object.assign(r,{x:r.homeX,z:r.homeZ,y:.4,status:'ground',owner:null});}}
  }
  if(s.phase!=='fight'){s.playerShots=[];return;}
  for(let n=s.playerShots.length-1;n>=0;n--){const q=s.playerShots[n],old={x:q.x,z:q.z};q.x+=q.vx*dt;q.z+=q.vz*dt;q.life-=dt;
   if(b.hp>0&&segmentDistance(b,old,q)<3.0){this.damageBoss(q.damage,q.owner);q.life=0;this.event('railHit',{player:q.owner,x:q.x,z:q.z,charged:q.charged});}
   if(q.life<=0)s.playerShots.splice(n,1);
  }
  if(s.phase!=='fight')return;
  for(let n=s.shots.length-1;n>=0;n--){const q=s.shots[n],old={x:q.x,z:q.z};q.x+=q.vx*dt;q.z+=q.vz*dt;q.life-=dt;
   for(const p of s.players){if(p.hp>0&&segmentDistance(p,old,q)<1.05){this.damagePlayer(p,18);q.life=0;break;}}
   if(q.life<=0||Math.abs(q.x)>32||q.z>20||q.z<-35)s.shots.splice(n,1);
  }
  if(s.phase!=='fight')return;
  if(b.leap){const a=b.leap;a.t+=dt;const f=clamp(a.t/a.duration,0,1);b.x=a.sx+(a.x-a.sx)*smoothLeap(f);b.z=a.sz+(a.z-a.sz)*smoothLeap(f);b.y=Math.sin(Math.pow(f,.8)*Math.PI)*6;
   if(f>=1){b.y=0;b.leap=null;for(const target of b.targets){for(const p of s.players)if(distance(p,target)<target.r+.4)this.damagePlayer(p,38);this.event('bossImpact',{x:target.x,z:target.z,radius:target.r});}b.targets=[];b.cooldown=1.7;}return;}
  if(b.stun>0){b.stun=Math.max(0,b.stun-dt);return;}
  if(b.charge>0){const old={x:b.x,z:b.z};b.charge-=dt;b.x=clamp(b.x+b.vx*dt,-16,16);b.z=clamp(b.z+b.vz*dt,-23,1.5);
   for(const p of s.players)if(segmentDistance(p,old,b)<3)this.damagePlayer(p,31,{x:b.vx*.1,z:b.vz*.1});return;}
  if(b.windup>0){b.windup-=dt;if(b.windup<=0)this.releaseBossAttack();return;}
  const target=this.target();if(!target)return;const d=distance(target,b);
  if(d>6.2){const v=(b.enraged?3.6:2.8)*dt;b.x+=(target.x-b.x)/d*v;b.z+=(target.z-b.z)/d*v;}
  b.cooldown-=dt;if(b.cooldown<=0)this.prepareBossAttack();
 }
 prepareBossAttack(){const s=this.s,b=s.boss;b.attack=['stomp','breath','charge','roar'][b.count++%4];b.windup=({stomp:1.45,breath:1.2,charge:1.5,roar:1.7}[b.attack])*(b.enraged?.85:1);b.cooldown=b.enraged?1.35:1.9;
  const players=s.players.filter(p=>p.hp>0);b.targets=players.map(p=>({x:p.x,z:p.z,player:p.id}));
  if(b.attack==='stomp')b.targets=players.map(p=>({x:p.x,z:p.z,r:s.coop?3.6:4.3,player:p.id}));
  this.event('warning',{attack:b.attack});
 }
 releaseBossAttack(){const s=this.s,b=s.boss;this.event('bossAttack',{attack:b.attack,x:b.x,z:b.z});
  if(b.attack==='stomp'){const target=b.targets[0];if(target){b.leap={sx:b.x,sz:b.z,x:clamp(target.x,-16,16),z:clamp(target.z,-23,1.5),t:0,duration:.85};this.event('bossLeap',{x:b.x,z:b.z,tx:target.x,tz:target.z});}return;}
  if(b.attack==='breath'){for(const t of b.targets){const angle=Math.atan2(t.x-b.x,t.z-b.z);for(let n=-2;n<=2;n++){const a=angle+n*.16;s.shots.push({id:++this.serial,x:b.x+Math.sin(a)*3,z:b.z+Math.cos(a)*3,vx:Math.sin(a)*11,vz:Math.cos(a)*11,life:4});}}}
  if(b.attack==='charge'){const t=b.targets[b.count%b.targets.length];if(t){const d=distance(t,b)||1;b.vx=(t.x-b.x)/d*23;b.vz=(t.z-b.z)/d*23;b.charge=.65;}}
  if(b.attack==='roar'){for(const p of s.players)if(distance(p,b)<18)this.damagePlayer(p,23,{x:(p.x-b.x)*.2,z:(p.z-b.z)*.2});}
  b.targets=[];
 }
 snapshot(){return JSON.parse(JSON.stringify(this.s));}
}
