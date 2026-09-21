/** Original procedural combat cinematography. Shared-state input; no gameplay mutation. */
import {storyFrame,explorerPose,smooth,mix} from './story.mjs';
export function createPolish(T,scene,camera,heroes,bossRoot,bossBody,heads){
 const sphere=new T.IcosahedronGeometry(1,2),box=new T.BoxGeometry(1,1,1),gem=new T.OctahedronGeometry(1),cone=new T.ConeGeometry(1,1,8),cylinder=new T.CylinderGeometry(1,1,1,12),ringGeo=new T.RingGeometry(.92,1,72);
 const materials=new Map();const material=(c,light=false)=>{const key=c+light;if(!materials.has(key))materials.set(key,light?new T.MeshBasicMaterial({color:c}):new T.MeshStandardMaterial({color:c,roughness:.55,metalness:.15,flatShading:true}));return materials.get(key);};
 function group(parent=scene){const g=new T.Group();parent.add(g);return g;}
 function mesh(g,c,pos,scale,parent=scene,light=false){const m=new T.Mesh(g,material(c,light));m.position.set(...pos);m.scale.set(...scale);m.castShadow=!light;m.receiveShadow=!light;parent.add(m);return m;}
 function line(a,b,r,c,parent){const d=new T.Vector3().subVectors(b,a);const m=mesh(cylinder,c,[0,0,0],[r,d.length(),r],parent);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());return m;}
 const rail=group(heroes[0].body);rail.position.set(.56,1.31,.44);
 mesh(box,'#153d50',[0,0,.35],[.50,.40,1.12],rail);mesh(box,'#cfa861',[0,.18,.25],[.48,.07,1.0],rail);
 for(const x of [-.23,.23]){mesh(box,'#b4c8c5',[x,0,1.02],[.105,.22,1.16],rail);mesh(box,'#8bffff',[x,.03,1.05],[.038,.045,1.18],rail,true);}
 for(let i=0;i<4;i++){const m=mesh(cylinder,'#dfb66e',[0,0,.1+i*.29],[.29,.07,.29],rail);m.rotation.x=Math.PI/2;}
 mesh(box,'#203241',[0,-.35,.15],[.18,.48,.28],rail);mesh(gem,'#adffff',[0,0,1.62],[.12,.12,.2],rail,true);
 // Cover is deliberately below the observers' sightline. A plank connects the boat to shore.
 mesh(sphere,'#647e79',[-6.5,.92,-1.6],[2.15,1.38,1.0]);mesh(box,'#b28b59',[-5.4,.32,18.2],[1.25,.18,4.1]).rotation.y=-.46;
 const shots=Array.from({length:36},()=>{const g=group();mesh(sphere,'#e9ffff',[0,0,0],[.16,.16,.53],g,true);mesh(cone,'#e8b364',[0,0,.58],[.16,.45,.16],g).rotation.x=Math.PI/2;const tail=mesh(cone,'#65eaff',[0,0,-.85],[.19,1.7,.19],g,true);tail.rotation.x=-Math.PI/2;g.visible=false;return g;});
 const aim=group();const aimRing=mesh(ringGeo,'#ffd78c',[0,.30,0],[6.8,6.8,6.8],aim,true);aimRing.rotation.x=-Math.PI/2;
 const inner=mesh(ringGeo,'#fff1ba',[0,.31,0],[3.2,3.2,3.2],aim,true);inner.rotation.x=-Math.PI/2;
 for(const angle of [0,Math.PI/2])mesh(box,'#fff0bd',[0,.32,0],[.10,.03,1.35],aim,true).rotation.y=angle;
 const aimPillar=mesh(cylinder,'#ffe3a0',[0,1.1,0],[.035,2.1,.035],aim,true);aim.visible=false;
 const fx=[];let kick=0,lastEvent=0,lastT=-1,lastShot=-1,dashClock=0;
 function ephemeral(g,life,fn){scene.add(g);fx.push({g,life,max:life,fn});}
 function fadeMaterial(color,opacity=1){return new T.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,side:T.DoubleSide});}
 function wave(x,z,color,radius,life=.65){const m=new T.Mesh(ringGeo,fadeMaterial(color,.85));m.rotation.x=-Math.PI/2;m.position.set(x,.32,z);ephemeral(m,life,(m,f)=>{m.scale.setScalar(.2+radius*f);m.material.opacity=(1-f)*.9;});}
 function burst(x,y,z,color,count=18,strength=1){for(let i=0;i<count;i++){const m=new T.Mesh(i%3?gem:sphere,fadeMaterial(color));m.position.set(x,y,z);m.scale.setScalar((.08+Math.random()*.12)*strength);const a=Math.random()*Math.PI*2,v=new T.Vector3(Math.cos(a)*(2+Math.random()*4),2+Math.random()*5,Math.sin(a)*(2+Math.random()*4)).multiplyScalar(strength);ephemeral(m,.7+Math.random()*.4,(m,f,dt)=>{v.y-=dt*15;m.position.addScaledVector(v,dt);m.rotation.x+=dt*7;m.material.opacity=1-f;});}}
 function flash(x,y,z,color,large=false){const g=new T.Mesh(sphere,fadeMaterial(color,.95));g.position.set(x,y,z);ephemeral(g,.15,(m,f)=>{m.scale.set(.5*(1-f),.5*(1-f),(large?2.1:.9)*(1-f));m.material.opacity=1-f;});}
 function crack(x,z){for(let i=0;i<10;i++){const a=i*Math.PI/5,pts=[];for(let j=0;j<5;j++){const r=.5+j*1.2;pts.push(new T.Vector3(x+Math.cos(a+j%2*.1)*r,.28,z+Math.sin(a+j%2*.1)*r));}const m=new T.Line(new T.BufferGeometry().setFromPoints(pts),new T.LineBasicMaterial({color:'#744927',transparent:true,opacity:1}));ephemeral(m,2.6,(m,f)=>m.material.opacity=1-f);}}
 function event(e,s){const p=s.players[e.player]||s.players[0];
  if(e.type==='railFire'){const q=heroes[p.hero==='alex'?0:1];q.recoil=.17;flash(e.x,1.6,e.z,e.charged?'#fff7bb':'#baffff',e.charged);burst(e.x,1.6,e.z,'#94f9ff',e.charged?12:5,.35);if(e.charged)kick=Math.max(kick,.12);}
  if(e.type==='railHit'){burst(e.x,2.1,e.z,e.charged?'#ffce77':'#a8ffff',e.charged?30:12,e.charged?1.1:.55);wave(e.x,e.z,'#93f9ff',e.charged?4:1.6);if(e.charged)kick=.22;}
  if(e.type==='dash'){wave(p.x,p.z,'#a3f6ff',2.8,.35);burst(p.x,.4,p.z,'#c2f9ff',10,.45);}
  if(e.type==='slamLaunch'){wave(e.x,e.z,'#ffe29d',3,.6);burst(e.x,.3,e.z,'#efd9a7',16,.65);}
  if(e.type==='slamImpact'){kick=.7;for(const [c,r,l] of [['#fff6d6',7,.55],['#ffa947',9,.85],['#e6c496',11,1.1]])wave(e.x,e.z,c,r,l);burst(e.x,.7,e.z,'#b8a588',32,1.5);crack(e.x,e.z);flash(e.x,.4,e.z,'#fff2c8',true);}
  if(e.type==='roar'){kick=.32;for(let i=0;i<3;i++){const m=new T.Mesh(ringGeo,fadeMaterial('#c3f1df',.5));m.position.set(s.boss.x,4.2,s.boss.z+3.6);ephemeral(m,1.15,(m,f)=>{m.scale.setScalar(.5+f*6);m.position.z+=.035;m.material.opacity=.4*(1-f);});}}
  if(e.type==='bossLeap'){wave(e.x,e.z,'#f3ae77',4,.65);burst(e.x,.4,e.z,'#ceb897',18,.9);}
  if(e.type==='bossImpact'){kick=Math.max(kick,.55);wave(e.x,e.z,'#ffd7b6',e.radius+1,.55);wave(e.x,e.z,'#f09752',e.radius+3,.85);burst(e.x,.6,e.z,'#b8a085',26,1.2);crack(e.x,e.z);}
  if(e.type==='bossAttack'&&e.attack==='charge'){wave(e.x,e.z,'#f6ad6f',4,.45);burst(e.x,.6,e.z,'#f1c694',22,.8);kick=Math.max(kick,.18);}
  if(e.type==='bossAttack'&&e.attack==='roar')event({...e,type:'roar'},s);
  if(e.type==='bite'){kick=.40;burst(1,3,-11,'#dac495',26,.8);}
 }
 // Five independent heads with articulated necks, lips, eyes, horns and fangs.
 const serpent=group(),segments=[],necks=[],snakeHeads=[];
 for(let i=0;i<26;i++){const m=mesh(sphere,i%2?'#607d4d':'#769550',[0,0,0],[.38,.36,.43],serpent);segments.push(m);if(i<17){const sc=mesh(cone,'#bdab6a',[0,.32,0],[.11,.27,.11],m);}}
 for(let h=0;h<5;h++){const parts=[];for(let j=0;j<8;j++)parts.push(mesh(sphere,'#87a661',[0,0,0],[.14,.19,.14],serpent));necks.push(parts);const head=group(serpent);mesh(sphere,'#a4b978',[0,0,0],[.26,.22,.40],head);mesh(sphere,'#303524',[0,-.09,.29],[.19,.07,.23],head);const lower=mesh(sphere,'#70854b',[0,-.15,.25],[.22,.08,.35],head);head.userData.lower=lower;
 for(const side of [-1,1]){mesh(sphere,'#ffde78',[side*.18,.08,.19],[.05,.056,.09],head,true);mesh(cone,'#e2d49b',[side*.17,.22,-.13],[.06,.35,.06],head).rotation.z=-side*.4;mesh(cone,'#fff2cf',[side*.13,-.13,.43],[.045,.18,.045],head).rotation.x=Math.PI;}
 mesh(box,'#dc8f77',[0,-.14,.61],[.045,.022,.34],head);snakeHeads.push(head);}
 const jaws=heads.map(h=>{const jaw=group(h);jaw.position.set(0,-.45,.48);mesh(sphere,'#203a37',[0,.02,.65],[.54,.17,.74],jaw);mesh(sphere,'#6f9390',[0,-.12,.65],[.67,.22,.86],jaw);for(let i=0;i<8;i++){const a=i/7*Math.PI;mesh(cone,'#fff0cd',[Math.cos(a)*.50,.14,.7+Math.sin(a)*.61],[.10,.40,.10],jaw);}return jaw;});
 function cinema(s,dt,reduced){if(!s.cinematic){serpent.visible=false;jaws.forEach(j=>j.rotation.x=0);return null;}const t=s.storyClock||0;
  heroes.forEach((h,i)=>{const a=explorerPose(t,i);h.g.visible=true;h.g.position.set(a.x,a.y,a.z);h.g.rotation.y=a.heading;h.body.position.y=-a.crouch*.46;h.body.rotation.x=a.crouch*.22;h.arms.forEach((m,j)=>m.rotation.x=a.walk?Math.sin(t*12+j*Math.PI)*.55:-.6*a.crouch);h.legs.forEach((m,j)=>m.rotation.x=a.walk?Math.sin(t*12+j*Math.PI)*.55:-.65*a.crouch);h.aura.visible=false;});
  const walk=smooth((t-14)/5),defy=smooth((t-23)/1.5)*(1-smooth((t-26)/1.3)),eat=smooth((t-28.1)/2.8),lunge=smooth((t-27)/1.1)*(1-smooth((t-31)/1.5));
  serpent.visible=t>=13.5&&t<31;serpent.position.set(mix(12,1.6,walk),0,-10.5);serpent.rotation.y=Math.PI;
  const swallow=new T.Vector3(-.4,3.9,1.5);
  segments.forEach((m,i)=>{const f=smooth((eat-(1-i/26)*.20)/.80),z=-i*.30,x=Math.sin(i*.48-t*4)*.26;const natural=new T.Vector3(x,.38,z);natural.lerp(swallow,f);m.position.copy(natural);m.visible=eat<.20+i/26*.72;m.scale.setScalar(Math.max(.02,1-f*.92));m.scale.multiply(new T.Vector3(.38,.36,.43));});
  for(let h=0;h<5;h++){const spread=(h-2)*.50;const tip=new T.Vector3(spread+Math.sin(t*2+h)*.08,1.4+(h===2?.48:0)+defy*.68,1.15+Math.cos(h)*.14+defy*.28);const base=new T.Vector3((h-2)*.1,.48,-.25);necks[h].forEach((m,j)=>{const f=j/7;const a=base.clone().lerp(tip,f);a.x+=Math.sin(f*Math.PI)*spread*.25;a.z-=Math.sin(f*Math.PI)*.22;a.lerp(swallow,eat);m.position.copy(a);m.visible=eat<.72;});const head=snakeHeads[h];head.visible=eat<.69;head.position.copy(tip).lerp(swallow,eat);head.scale.setScalar(Math.max(.02,1-eat));head.rotation.y=defy*Math.sin(t*5+h)*.35;head.userData.lower.position.y=-.15-defy*.17;}
  bossRoot.position.set(0,Math.sin(lunge*Math.PI)*.32,-17+lunge*2.35);bossRoot.rotation.y=Math.atan2(1.6,7);bossBody.rotation.x=-lunge*.13;
  const roar=smooth((t-19)/.45)*(1-smooth((t-22.3)/.7)),gape=Math.max(roar,eat>0&&eat<.93?.88:0,lunge*.8);
  heads.forEach((h,i)=>{h.rotation.x=-gape*.32+Math.sin(t*1.8+i)*.03;jaws[i].rotation.x=gape*.70;});
  if(roar>.7&&!reduced)kick=Math.max(kick,.045);const frame=storyFrame(t);if(frame.index!==lastShot){lastShot=frame.index;camera.position.set(...frame.eye);}return frame;
 }
 function update(s,id,dt,reduced){if(s.t<lastT){lastEvent=0;lastShot=-1;for(const f of fx){scene.remove(f.g);f.g.material?.dispose();}fx.length=0;}lastT=s.t;
  for(const e of s.events)if(e.id>lastEvent){if(s.t-e.t<.6)event(e,s);lastEvent=e.id;}
  shots.forEach((m,i)=>{const q=s.playerShots?.[i];m.visible=!!q;if(q){m.position.set(q.x,1.55,q.z);m.rotation.y=Math.atan2(q.vx,q.vz);m.scale.setScalar(q.charged?2.1:1.25);}});
  const p=s.players[id]||s.players[0];aim.visible=!!p.aim;if(p.aim){aim.position.set(p.aim.x,0,p.aim.z);aimRing.rotation.z=s.t*.6;inner.rotation.z=-s.t;aimPillar.scale.y=.8+Math.sin(s.t*5)*.15;}
  dashClock+=s.paused?0:dt;if(dashClock>.065){dashClock=0;if(s.boss.charge>0){burst(s.boss.x,.4,s.boss.z,'#c5ab88',4,.7);wave(s.boss.x,s.boss.z,'#efc898',2.4,.24);}for(const p of s.players){if(p.dash>0||p.slam){const m=new T.Mesh(sphere,fadeMaterial(p.slam?'#ffdba0':'#95ecff',.45));m.position.set(p.x,1+(p.y||0),p.z);m.scale.set(p.slam?.55:.35,1.2,p.slam?.55:.8);ephemeral(m,.32,(m,f)=>{m.material.opacity=.42*(1-f);m.scale.multiplyScalar(.985);});}}}
  for(const h of heroes){h.recoil=Math.max(0,(h.recoil||0)-dt);if(h===heroes[0])rail.position.z=.44-h.recoil*.9;if(!s.cinematic)h.body.rotation.x=0;}
  if(!s.paused)for(let i=fx.length-1;i>=0;i--){const f=fx[i];f.life-=dt;f.fn(f.g,1-f.life/f.max,dt);if(f.life<=0){scene.remove(f.g);f.g.material?.dispose();if(f.g.isLine)f.g.geometry.dispose();fx.splice(i,1);}}
  kick=Math.max(0,kick-dt*1.45);if(kick&&!reduced&&!s.paused){camera.position.x+=(Math.random()-.5)*kick;camera.position.y+=(Math.random()-.5)*kick;}
  const shot=cinema(s,dt,reduced);if(!shot){const b=s.boss;const yelling=b.windup>0&&b.attack==='roar';jaws.forEach(j=>j.rotation.x=yelling?.65:0);if(b.charge>0){bossBody.rotation.x=-.22;bossBody.rotation.z=Math.sin(s.t*30)*.035;}}return shot;
 }
 const ray=new T.Raycaster(),plane=new T.Plane(new T.Vector3(0,1,0),0);
 return {update,project:(x,y,z)=>{const v=new T.Vector3(x,y,z).project(camera);return {x:(v.x*.5+.5)*innerWidth,y:(-.5*v.y+.5)*innerHeight,visible:v.z<1&&v.z>-1};},ground:(x,y)=>{ray.setFromCamera(new T.Vector2(x/innerWidth*2-1,1-y/innerHeight*2),camera);const hit=new T.Vector3();return ray.ray.intersectPlane(plane,hit)?{x:hit.x,z:hit.z}:null;},count:()=>fx.length};
}
