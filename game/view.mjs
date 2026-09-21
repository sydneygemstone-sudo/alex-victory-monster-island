/** Visual foundation: the frozen Web 6Pro classroom build. Rules live in core.mjs. */
export function createView(canvas){
 const THREE=window.THREE;if(!THREE)throw new Error('3D engine missing');
 const TAU=Math.PI*2,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.10;
 const scene=new THREE.Scene();scene.background=new THREE.Color('#9bcbd0');scene.fog=new THREE.Fog('#9bcbd0',65,135);
 const camera=new THREE.PerspectiveCamera(54,1,.2,200);camera.position.set(18,12,30);const cameraTarget=new THREE.Vector3(0,2,-7);
 scene.add(new THREE.HemisphereLight('#e9fbef','#4d6971',2.3));const sun=new THREE.DirectionalLight('#fff0d1',3.2);sun.position.set(-25,42,20);sun.castShadow=true;
 sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-40,right:40,top:38,bottom:-45,near:1,far:115});sun.shadow.normalBias=.065;sun.shadow.bias=-.0003;scene.add(sun);sun.target.position.set(0,0,-10);scene.add(sun.target);
const matCache=new Map();function mat(c,em=0){const key=c+':'+em;if(!matCache.has(key))matCache.set(key,new THREE.MeshStandardMaterial({color:c,roughness:.85,metalness:0,flatShading:true,emissive:em?c:0,emissiveIntensity:em}));return matCache.get(key);}
const geo={box:new THREE.BoxGeometry(1,1,1),sphere:new THREE.IcosahedronGeometry(1,1),rock:new THREE.DodecahedronGeometry(1,0),cone:new THREE.ConeGeometry(1,1,6),cyl:new THREE.CylinderGeometry(1,1,1,8),gem:new THREE.OctahedronGeometry(1),ring:new THREE.RingGeometry(.86,1,64)};
function mesh(g,c,p,s,parent=scene){const m=new THREE.Mesh(g,typeof c==='string'?mat(c):c);if(p)m.position.set(...p);if(s)m.scale.set(...s);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function group(p,parent=scene){const g=new THREE.Group();g.position.set(...p);parent.add(g);return g;}
function ring(x,z,r,color,opacity=.5,parent=scene){const m=mesh(geo.ring,new THREE.MeshBasicMaterial({color,transparent:true,opacity,side:THREE.DoubleSide,depthWrite:false}),[x,.22,z],[r,r,r],parent);m.rotation.x=-Math.PI/2;m.castShadow=false;m.receiveShadow=false;return m;}
function cylinderBetween(a,b,r,color,parent=scene){const d=new THREE.Vector3().subVectors(b,a),m=mesh(geo.cyl,color,[0,0,0],[r,d.length(),r],parent);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return m;}
let seed=724;function rand(){seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;}const rnd=(a,b)=>a+(b-a)*rand();
const colliders=[],palmLeaves=[],floatCrystals=[],surf=[],projectiles=[],particles=[],fields=[],floatTexts=[],effects=[],telegraphs=[];const terrain=group([0,0,0]);
// Ocean and a faceted island, all generated locally.
const water=mesh(new THREE.PlaneGeometry(300,300),new THREE.MeshStandardMaterial({color:'#298d9f',roughness:.35,metalness:.12}),[0,-.68,0]);water.rotation.x=-Math.PI/2;water.receiveShadow=true;
mesh(new THREE.CylinderGeometry(39,42,3,30), '#987b55',[0,-1.75,-7],[.86,1,1.06],terrain);
mesh(new THREE.CylinderGeometry(38.9,39, .22,30),'#e9d29d',[0,-.12,-7],[.86,1,1.06],terrain);
mesh(new THREE.CylinderGeometry(24,26,.36,20),'#688e65',[0,-.145,-31],[1.12,1,.79],terrain);
// Narrow beach path and green moss islands at the sides.
for(let i=0;i<24;i++){let z=-27+i*2.25;mesh(geo.rock,'#e3c895',[Math.sin(i*.9)*.8,.10,z],[3.7,.035,1.8],terrain);}
for(let i=0;i<19;i++){let x=i%2?-rnd(14,27):rnd(14,27),z=rnd(-32,16);mesh(geo.rock,['#94aa69','#aab67a','#819e67'][i%3],[x,.05,z],[rnd(3,6),.15,rnd(3,6)],terrain);}
for(let i=0;i<25;i++){let x=rnd(-46,46),z=rnd(24,46);const m=mesh(geo.box,new THREE.MeshBasicMaterial({color:'#c9ebe0',transparent:true,opacity:.45}),[x,-.55,z],[rnd(1,6),.02,.12]);m.castShadow=false;surf.push({m,x,z,s:rnd(.5,1.2)});}
function palm(x,z,scale=1){const g=group([x,0,z],terrain);g.position.x=Math.sign(x)*Math.max(Math.abs(x),20.8);g.scale.setScalar(scale);const lean=rnd(-.7,.7);for(let i=0;i<5;i++)mesh(geo.cyl,i%2?'#8e6c48':'#a58252',[lean*i*.15,i*.72+.35,0],[.23-i*.014,.78,.23-i*.014],g);const top=group([lean*.6,3.8,0],g);for(let i=0;i<7;i++){const a=i/7*TAU;const leaf=mesh(geo.sphere,['#386a55','#54875c','#79a05d'][i%3],[Math.cos(a)*1.28,.13,Math.sin(a)*1.28],[1.85,.13,.48],top);leaf.rotation.y=-a;leaf.rotation.z=.1;palmLeaves.push({m:leaf,z:leaf.rotation.z,k:rnd(0,6)});}for(let i=0;i<3;i++)mesh(geo.sphere,'#826143',[.3*Math.cos(i*2),3.5,.3*Math.sin(i*2)],[.2,.24,.2],g);colliders.push({x,z,r:.6*scale});}
for(const [x,z,s] of [[-11,13,1.5],[13,15,1.3],[-17,0,1.6],[18,1,1.8],[-16,-12,1.35],[17,-15,1.7],[-24,7,1.9],[24,10,1.7],[-23,-24,1.6],[22,-27,1.8],[-13,-34,1.9],[13,-34,1.7]])palm(x,z,s);
function rock(x,z,r=1,c='#6a8582',y=0){const m=mesh(geo.rock,c,[x,y+r*.5,z],[r,r*.9,r*.8],terrain);m.rotation.set(rnd(-.2,.2),rnd(0,6),rnd(-.1,.1));return m;}
for(let i=0;i<45;i++){const side=i%2?-1:1,x=side*rnd(20,32),z=rnd(-35,21),r=rnd(.7,2.7);rock(x,z,r);}
for(let i=0;i<0;i++){const x=rnd(-21,21),z=rnd(-15,22);if(Math.abs(x)<5)continue;const r=rnd(.18,.55);rock(x,z,r,'#b29d75');}
// Cave: a rock arch rather than a full interior level.
for(const side of [-1,1])for(let j=0;j<4;j++){const x=side*(6.8+j*2.0);const r=3.0+j*.6;rock(x,-28-rnd(0,3),r,'#526e6d',j*.2);rock(x,-28,2.1,'#597978',3.2+j*.4);}
for(let i=0;i<7;i++){let x=(i-3)*1.7;rock(x,-28,2.0,'#68837b',7.0-Math.abs(i-3)*.2);}
const caveDark=mesh(geo.box,new THREE.MeshBasicMaterial({color:'#153c39'}),[0,3.8,-29.5],[10,8.5,.25]);caveDark.castShadow=false;
const gate=group([0,0,-27.8]);for(let i=-2;i<=2;i++){const b=mesh(geo.box,new THREE.MeshBasicMaterial({color:'#78d4cf',transparent:true,opacity:.23,depthWrite:false}),[i*1.8,3.4,0],[.065,6.6,.08],gate);b.castShadow=false;}ring(0,-26,4.5,'#84e8e3',.45);
const gateEmblem=mesh(new THREE.TorusGeometry(.9,.05,5,36),mat('#baeddc',.3),[0,6.9,-27.45],null);gateEmblem.castShadow=false;for(let i=0;i<4;i++){const c=mesh(geo.gem,mat('#a3ffed',.55),[0,0,0],[.23,.42,.23],gateEmblem);const a=i*Math.PI/2;c.position.set(Math.sin(a)*1.2,Math.cos(a)*1.2,0);}
// Crystals on the sides make the cave readable, without implying collectable loot.
for(const [x,z] of [[-6,-25],[6,-25],[-9,-20],[9,-21]]){rock(x,z,1.0,'#647781');for(let j=0;j<3;j++){const c=mesh(geo.gem,mat(j%2?'#73cfdf':'#b3f4e8',.3),[x+(j-1)*.45,1.1+rand()*.3,z],[.3,.8+rand()*.4,.3]);c.rotation.z=(j-1)*.25;floatCrystals.push(c);}}
// Distant rainforest, volcano and castle silhouettes: landmarks only.
for(let i=0;i<34;i++){let x=rnd(-33,33),z=rnd(-65,-39),h=rnd(4,8);mesh(geo.cyl,'#4d7761',[x,h*.3,z],[.3,h*.6,.3]);mesh(geo.sphere,['#3d7566','#4c8b70','#67997b'][i%3],[x,h*.7,z],[rnd(2,4),h*.45,rnd(2,4)]);}
mesh(new THREE.ConeGeometry(15,21,9),'#728e8b',[-27,6,-68]);mesh(new THREE.ConeGeometry(4.3,5,9),'#c59b77',[-27,16.2,-68]);
for(let i=0;i<4;i++)mesh(geo.sphere,new THREE.MeshBasicMaterial({color:'#d4d4bd',transparent:true,opacity:.45}),[-27+i*.9,19+i*2,-68],[1+i*.55,1.6+i*.4,1.4+i*.4]);
const castle=group([20,4,-66]);for(const x of [-5,5]){mesh(geo.cyl,'#73968f',[x,5,0],[1.8,10,1.8],castle);mesh(geo.cone,'#57767a',[x,11,0],[2.4,3,2.4],castle);}mesh(geo.box,'#849f92',[0,4,0],[10,7,3],castle);
// Expedition boat on the beach.
const boat=group([-8,-.1,22],terrain);boat.rotation.y=-.4;mesh(new THREE.CylinderGeometry(1,1,.85,6),'#795538',[0,.3,0],[1.8,1,3.7],boat);mesh(geo.box,'#b58a52',[0,.74,0],[2.1,.22,4.7],boat);for(const s of [-1,1])mesh(geo.box,'#684a35',[s*1.13,1.03,0],[.22,.7,4.8],boat);mesh(geo.cyl,'#beaa73',[0,3.0,0],[.09,5.2,.09],boat);const sail=mesh(new THREE.PlaneGeometry(2.7,3.4),new THREE.MeshStandardMaterial({color:'#fff1cb',side:THREE.DoubleSide}),[1.18,3.47,0],null,boat);sail.rotation.y=.16;mesh(geo.box,'#174b5b',[1.2,3.45,.05],[.13,1.5,.05],boat);mesh(geo.box,'#174b5b',[1.2,3.45,.055],[1.1,.13,.05],boat);colliders.push({x:-8,z:22,r:2.7});
// Trail dots and a moving directional beacon.
const trail=[];for(let z=15;z>-24;z-=3){const t=mesh(geo.gem,mat('#f4d486',.4),[0,.16,z],[.15,.22,.15]);t.castShadow=false;trail.push(t);}
const beacon=group([0,3,-25]);mesh(geo.cone,mat('#ffde8b',.4),[0,0,0],[.5,.8,.5],beacon).rotation.z=Math.PI;const beaconRing=ring(0,-25,1.5,'#f3d387',.6);
function makeHero(type){const g=group([0,0,18]);const skin='#e5b48d',cloth=type==='alex'?'#256475':'#64558d',gold='#e8c780';const body=group([0,0,0],g);mesh(geo.cyl,cloth,[0,1.12,0],[.44,.9,.34],body);mesh(geo.box,'#203b49',[0,.78,.01],[.73,.16,.61],body);mesh(geo.box,gold,[0,.79,.34],[.16,.13,.045],body);mesh(geo.sphere,skin,[0,1.99,.02],[.36,.41,.33],body);mesh(geo.sphere,'#352d33',[0,2.17,-.03],[.38,.3,.33],body);for(const s of [-1,1])mesh(geo.sphere,'#263a41',[s*.13,2.02,.324],[.035,.045,.02],body);mesh(geo.box,skin,[0,1.79,.07],[.2,.25,.25],body);
const arms=[],legs=[];for(const s of [-1,1]){const arm=group([s*.47,1.48,0],body);mesh(geo.cyl,cloth,[0,-.25,0],[.13,.5,.13],arm);mesh(geo.sphere,skin,[0,-.55,.035],[.14,.16,.14],arm);arms.push(arm);const leg=group([s*.22,.7,0],body);mesh(geo.cyl,'#263f49',[0,-.27,0],[.14,.53,.15],leg);mesh(geo.box,'#24343b',[0,-.58,.065],[.29,.24,.48],leg);legs.push(leg);}
let focus;if(type==='alex'){mesh(geo.box,'#bdad79',[0,2.2,.31],[.68,.16,.1],body);for(const s of [-1,1])mesh(geo.cyl,mat('#90eaf0',.25),[s*.19,2.18,.36],[.12,.06,.12],body).rotation.x=Math.PI/2;mesh(geo.box,'#8c7554',[0,1.3,-.4],[.67,.64,.35],body);for(const s of [-1,1])mesh(geo.cyl,mat('#82dfdb',.7),[s*.21,1.33,-.61],[.105,.55,.105],body);focus=mesh(geo.box,'#b59b64',[0,-.56,.28],[.26,.23,.58],arms[1]);mesh(geo.cyl,mat('#a6ffff',1),[0,-.56,.65],[.12,.12,.12],arms[1]).rotation.x=Math.PI/2;
}else{mesh(new THREE.ConeGeometry(.63,.8,7),'#79659f',[0,2.55,-.04],null,body);mesh(geo.cyl,'#aa8bb6',[0,2.21,0],[.61,.08,.55],body);mesh(new THREE.ConeGeometry(.57,1.2,8,1,true),'#6c5a95',[0,.98,-.04],null,body);focus=mesh(geo.gem,mat('#d7bdff',.8),[.02,-.55,.26],[.18,.25,.18],arms[1]);for(let i=0;i<3;i++){let c=mesh(geo.rock,mat('#ada5d6',.05),[0,1,0],[.17,.23,.18],body);c.userData.orbit=i;floatCrystals.push(c);}}
const aura=ring(0,18,.8,type==='alex'?'#9df6ed':'#d5baff',.24);return{g,body,arms,legs,focus,aura,type};}
const heroes=[makeHero('alex'),makeHero('victory')];
// A large, readable three-headed animal guardian, with a shared body and distinct heads.
const bossRoot=group([0,0,-18]);const bossBody=group([0,0,0],bossRoot);const bossMats=[];function bm(c){const m=mat(c).clone();bossMats.push(m);return m;}const shell=bm('#345b65'),armor=bm('#6d9293'),dark=bm('#203d49'),gold=bm('#ceae70');
mesh(geo.sphere,shell,[0,2.65,-.5],[2.4,2.0,3.25],bossBody);mesh(geo.sphere,armor,[0,3.55,-.65],[2.1,.95,2.85],bossBody);for(let i=0;i<5;i++){mesh(geo.cone,gold,[0,4.37,-2.2+i*.78],[.36,.68,.38],bossBody);}
const bossLegs=[];for(const s of [-1,1])for(const z of [-2,1.15]){const l=group([s*1.82,2,z],bossBody);mesh(geo.cyl,shell,[0,-.8,0],[.6,2,.66],l);mesh(geo.sphere,armor,[0,-1.52,.2],[.78,.5,.94],l);for(let j=0;j<3;j++)mesh(geo.cone,'#ece3bf',[(j-1)*.33,-1.55,.91],[.14,.47,.16],l).rotation.x=Math.PI/2;bossLegs.push(l);}
const heads=[];for(let i=0;i<3;i++){const h=group([(i-1)*1.68,3.75+(i===1?.62:0),1.7],bossBody);mesh(geo.sphere,shell,[0,0,0],[.88,1.01,1.05],h);mesh(geo.sphere,armor,[0,-.24,.8],[.69,.52,.94],h);mesh(geo.box,dark,[0,-.11,1.4],[.63,.23,.46],h);mesh(geo.sphere,'#142f3a',[0,-.04,1.55],[.23,.18,.17],h);for(const s of [-1,1]){mesh(geo.cone,armor,[s*.6,.91,-.2],[.33,.98,.39],h).rotation.z=-s*.24;mesh(geo.sphere,mat('#c4fff2',.9),[s*.53,.19,.83],[.24,.14,.1],h);const brow=mesh(geo.box,gold,[s*.5,.39,.8],[.53,.12,.16],h);brow.rotation.z=s*.15;mesh(geo.cone,'#f8ebcd',[s*.42,-.47,1.21],[.13,.47,.13],h).rotation.z=Math.PI;}
mesh(geo.gem,mat('#78e5e4',.45),[0,.67,.68],[.22,.32,.11],h);heads.push(h);}
const tail=mesh(geo.cone,shell,[0,2.52,-4.6],[.46,3.7,.45],bossBody);tail.rotation.x=-Math.PI/2;const bossAura=ring(0,-18,4.0,'#edc787',.25);const boundary=ring(0,-18,15.5,'#e9c78e',.14);const boss={x:0,z:-18,hp:780,maxHp:780,state:'idle',cooldown:2,stun:0,windup:0,enraged:false,flash:0,deadTime:0,attackType:''};
// A small chest reward, not the final 100-crystal castle treasure.
const chest=group([0,0,-25]);chest.visible=false;mesh(geo.box,'#7b5138',[0,.53,0],[1.65,.9,1.15],chest);const lid=group([0,.98,-.5],chest);mesh(geo.box,'#a67945',[0,.08,.5],[1.75,.25,1.25],lid);for(const s of [-1,1])mesh(geo.box,'#dbba70',[s*.57,.6,.61],[.13,.9,.06],chest);mesh(geo.box,'#f3d18d',[0,.78,.64],[.27,.28,.08],chest);const chestGem=mesh(geo.gem,mat('#8feef5',.7),[0,1.85,0],[.33,.6,.33],chest);let chestCollected=false,crystalCount=0,stats={dodges:0,hits:0};

 // Static terrain batches share geometry/materials: fewer draw calls, no copied game library.
 terrain.updateMatrixWorld(true);const batches=new Map();terrain.traverse(o=>{if(!o.isMesh)return;const k=o.geometry.uuid+o.material.uuid;if(!batches.has(k))batches.set(k,[]);batches.get(k).push(o);});
 for(const batch of batches.values()){if(batch.length<3)continue;const first=batch[0],inst=new THREE.InstancedMesh(first.geometry,first.material,batch.length);batch.forEach((o,i)=>{inst.setMatrixAt(i,o.matrixWorld);o.visible=false;});inst.castShadow=true;inst.receiveShadow=true;inst.instanceMatrix.needsUpdate=true;scene.add(inst);}
 // Ground ammunition is separate from decorative terrain; every rock has server-owned identity.
 const ammo=Array.from({length:13},()=>mesh(geo.rock,mat('#a3a9c8',.05),[0,0,0],[.6,.58,.58]));
 const ammoRings=ammo.map(()=>ring(0,0,.82,'#d1b4ff',.65));
 const missiles=Array.from({length:24},()=>mesh(geo.gem,mat('#ffc67b',.8),[0,0,0],[.34,.34,.55]));missiles.forEach(m=>m.visible=false);
 const dangerMat=new THREE.MeshBasicMaterial({color:'#e96651',transparent:true,opacity:.34,side:THREE.DoubleSide,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-3});
 const marks=Array.from({length:3},()=>{const m=mesh(new THREE.CircleGeometry(1,64),dangerMat,[0,.27,0]);m.rotation.x=-Math.PI/2;m.castShadow=false;return m;});
 const lanes=Array.from({length:2},()=>{const m=mesh(geo.box,dangerMat,[0,.3,0]);m.castShadow=false;return m;});
 const barrier=group([0,.15,3.9]);for(let i=-19;i<=19;i+=2){mesh(geo.gem,mat('#63c9d1',.4),[i,.5,0],[.16,1.3,.16],barrier);}barrier.visible=false;
 const machine=group([4,0,-24]);mesh(geo.cyl,'#294b5a',[0,.7,0],[.85,1.4,.85],machine);mesh(geo.cyl,'#ceb782',[0,1.3,0],[1,.16,1],machine);mesh(geo.gem,mat('#b0eeeb',.5),[0,2.1,0],[.5,.75,.5],machine);
 // Pale fantasy-beast bones; no human remains, blood or jump scares.
 for(let i=0;i<7;i++){const g=group([(i%2?-1:1)*(15+rand()*2),.24,-5-i*2.5],terrain);const b=mesh(geo.cyl,'#dedbc0',[0,0,0],[.085,1.2,.085],g);b.rotation.z=Math.PI/2;for(const x of [-.6,.6])mesh(geo.sphere,'#dedbc0',[x,0,0],[.16,.13,.18],g);}
 const snake=group([0,.3,-4]);for(let i=0;i<9;i++)mesh(geo.sphere,'#758e61',[Math.sin(i*.6)*.3,.3,i*.35],[.25,.22,.32],snake);
 for(let i=0;i<5;i++){const x=(i-2)*.35;const neck=mesh(geo.cyl,'#8caa69',[x,.72,-.32],[.10,.9,.1],snake);neck.rotation.z=-(i-2)*.18;mesh(geo.sphere,'#a6be78',[x*1.2,1.25,-.35],[.2,.25,.3],snake);}
 const dust=group([0,1,-14]);for(let i=0;i<12;i++)mesh(geo.sphere,new THREE.MeshBasicMaterial({color:'#d8c49a',transparent:true,opacity:.7}),[Math.sin(i)*2,rand()*2,Math.cos(i)*2],[.7,.7,.7],dust);
 const fx=[];let lastEvent=0,hitTime=-100,lastPhase='',lastT=-1;
 function transient(m,life,scale=1){m.castShadow=false;fx.push({m,life,max:life,scale});}
 function pulseAt(x,z,color,size){const m=ring(x,z,.1,color,.8);transient(m,.48,size);}
 function effectsFor(e,s){const p=s.players[e.player]||s.players[0];
  if(e.type==='bolt'||e.type==='beam'){const start=new THREE.Vector3(e.x,1.5,e.z),end=new THREE.Vector3(e.bx,3,e.bz);const pts=[];for(let i=0;i<=12;i++){const v=start.clone().lerp(end,i/12);if(i&&i<12)v.x+=Math.sin(i*5+e.id)*.3;pts.push(v);}const m=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:'#c3ffff',transparent:true,opacity:1}));scene.add(m);transient(m,e.type==='beam'?.35:.18);pulseAt(e.bx,e.bz,'#9affff',e.type==='beam'?5:2);}
  if(e.type==='gravity')pulseAt(e.x,e.z,'#c9acff',6);
  if(e.type==='rockHit')pulseAt(e.x,e.z,'#c9acff',3);
  if(e.type==='bossHit')hitTime=s.t;
  if(e.type==='dash'||e.type==='anchor')pulseAt(p.x,p.z,e.type==='anchor'?'#ffc96f':'#c4e5f5',e.type==='anchor'?3:1.5);
 }
 function resize(){const w=canvas.clientWidth||innerWidth,h=canvas.clientHeight||innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}resize();addEventListener('resize',resize);
 function update(s,id=0,menu=false,dt=1/60,reduced=false){
  const t=s.t,p=s.players[id]||s.players[0],b=s.boss;
  if(t<lastT){lastEvent=0;hitTime=-100;}lastT=t;
  for(const e of s.events)if(e.id>lastEvent){effectsFor(e,s);lastEvent=e.id;}
  const active=['fight','intro'].includes(s.phase);barrier.visible=active;
  const shown=new Set();for(const pl of s.players){const h=heroes[pl.hero==='alex'?0:1];shown.add(h);h.g.visible=true;h.g.position.lerp(new THREE.Vector3(pl.x,pl.dash>0?.18:0,pl.z),Math.min(1,dt*18));
   const a=Math.atan2(pl.dx,pl.dz);h.g.rotation.y+=Math.atan2(Math.sin(a-h.g.rotation.y),Math.cos(a-h.g.rotation.y))*Math.min(1,dt*12);
   const moved=h.last?Math.hypot(pl.x-h.last.x,pl.z-h.last.z):0;h.last={x:pl.x,z:pl.z};h.body.position.y=reduced?0:(moved>.005?Math.abs(Math.sin(t*13))*.08:Math.sin(t*2)*.025);
   h.legs.forEach((l,i)=>l.rotation.x=moved>.005?Math.sin(t*13+i*Math.PI)*.5:0);h.arms.forEach((l,i)=>l.rotation.x=pl.holding!==null?-1.1:moved>.005?-Math.sin(t*13+i*Math.PI)*.4:0);
   h.aura.visible=pl.hp>0;h.aura.position.set(pl.x,.23,pl.z);h.aura.scale.setScalar(pl.anchor>0?1.7:.9);h.aura.material.color.set(pl.anchor>0?'#ffd17c':pl.hero==='alex'?'#9ae7e9':'#ceb3ff');h.g.rotation.z=pl.hp<=0?Math.PI*.48:0;
  }heroes.forEach(h=>{if(!shown.has(h)){h.g.visible=false;h.aura.visible=false;}});
  bossRoot.position.lerp(new THREE.Vector3(b.x,0,b.z),Math.min(1,dt*20));bossRoot.visible=b.hp>0;const a=Math.atan2(p.x-b.x,p.z-b.z);bossRoot.rotation.y+=Math.atan2(Math.sin(a-bossRoot.rotation.y),Math.cos(a-bossRoot.rotation.y))*Math.min(1,dt*5);
  bossBody.position.y=(b.stun>0?.65:0)+(reduced?0:Math.sin(t*2)*.10);bossBody.rotation.z=b.stun>0?Math.sin(t*7)*.035:0;
  heads.forEach((h,i)=>{h.rotation.x=b.windup>0?-.22:Math.sin(t*1.6+i)*.04;});bossLegs.forEach((l,i)=>l.rotation.x=active&&!b.windup&&!b.stun?Math.sin(t*5+i*Math.PI)*.17:0);tail.rotation.z=Math.sin(t*2)*.1;
  bossMats.forEach(m=>{m.emissive.set(t-hitTime<.13?'#b3ffff':b.enraged?'#8a4129':'#000000');m.emissiveIntensity=t-hitTime<.13?.5:b.enraged?.22:0;});
  bossAura.visible=b.hp>0;bossAura.position.set(b.x,.22,b.z);boundary.visible=s.phase==='beach';boundary.position.set(0,.24,-17);boundary.scale.setScalar(18);
  gate.visible=b.hp>0;caveDark.visible=b.hp>0;chest.visible=['loot','shop','won'].includes(s.phase);machine.visible=chest.visible;lid.rotation.x=s.rewarded?-1.1:0;
  beacon.visible=s.phase==='beach'||s.phase==='loot';beaconRing.visible=beacon.visible;beacon.position.y=3.1+Math.sin(t*2)*.2;chestGem.rotation.y=t;
  trail.forEach(m=>m.visible=s.phase==='beach');
  for(const r of s.rocks){const m=ammo[r.id];m.visible=r.status!=='cooldown';m.position.set(r.x,r.y+.12,r.z);m.rotation.y=r.status==='ground'?r.id:t*3;ammoRings[r.id].visible=p.hero==='victory'&&r.status==='ground'&&Math.hypot(p.x-r.x,p.z-r.z)<7.5;ammoRings[r.id].position.set(r.x,.23,r.z);}
  missiles.forEach((m,i)=>{const q=s.shots[i];m.visible=!!q;if(q){m.position.set(q.x,1,q.z);m.rotation.y=Math.atan2(q.vx,q.vz);}});
  marks.forEach(m=>m.visible=false);lanes.forEach(m=>m.visible=false);
  if(b.windup>0){dangerMat.opacity=reduced?.35:.30+Math.sin(t*9)*.08;
   if(b.attack==='stomp'){b.targets.forEach((a,i)=>{const m=marks[i];if(m){m.visible=true;m.position.set(a.x,.26,a.z);m.scale.setScalar(a.r);}});}
   if(b.attack==='roar'){const m=marks[0];m.visible=true;m.position.set(b.x,.26,b.z);m.scale.setScalar(18);}
   if(b.attack==='charge'||b.attack==='breath'){b.targets.forEach((a,i)=>{const m=lanes[i];if(!m)return;const d=Math.hypot(a.x-b.x,a.z-b.z);m.visible=true;m.position.set((a.x+b.x)/2,.30,(a.z+b.z)/2);m.scale.set(b.attack==='charge'?6:5,.025,d);m.rotation.y=Math.atan2(a.x-b.x,a.z-b.z);});}
  }
  snake.visible=s.phase==='intro'&&s.intro>1.2;dust.visible=s.phase==='intro'&&s.intro<=1.4;
  if(s.phase==='intro'){snake.position.set(Math.sin(t*4)*.3,.2,-4-(4.4-s.intro)*3.1);snake.scale.setScalar(s.intro<1.7?Math.max(.1,(s.intro-1.2)*2):1);dust.scale.setScalar(1+(1.4-s.intro)*.6);}
  if(lastPhase!==s.phase){lastPhase=s.phase;if(menu){camera.position.set(20,12,21);cameraTarget.set(0,3,-14);}}
  let targetPos,look;if(menu||s.phase==='intro'){targetPos=new THREE.Vector3(17,9,10);look=new THREE.Vector3(0,3,-14);}
  else{const fighters=active?[...s.players.filter(q=>q.hp>0),b]:[p];const xs=fighters.map(q=>q.x),zs=fighters.map(q=>q.z);const minx=Math.min(...xs),maxx=Math.max(...xs),minz=Math.min(...zs),maxz=Math.max(...zs);const spanx=maxx-minx,spanz=maxz-minz,cx=(maxx+minx)*.5;
   const back=Math.max(14+spanz*.35,(spanx+12)/(2*Math.tan(54*Math.PI/360)*camera.aspect));targetPos=new THREE.Vector3(cx,9.6+back*.12,maxz+back);look=new THREE.Vector3(cx,2.2,(maxz+minz)*.5-2);}
  camera.position.lerp(targetPos,1-Math.exp(-dt*4));cameraTarget.lerp(look,1-Math.exp(-dt*5));camera.lookAt(cameraTarget);
  if(!s.paused){for(let i=fx.length-1;i>=0;i--){const f=fx[i];f.life-=dt;f.m.material.opacity=Math.max(0,f.life/f.max);if(f.scale>1)f.m.scale.setScalar(.2+(1-f.life/f.max)*f.scale);if(f.life<=0){scene.remove(f.m);if(f.m.isLine)f.m.geometry.dispose();f.m.material.dispose();fx.splice(i,1);}}}
  renderer.render(scene,camera);
 }
 return {update,resize,diagnostics:()=>({calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries})};
}
