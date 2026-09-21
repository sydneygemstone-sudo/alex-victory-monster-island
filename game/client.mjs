import {World,SHOP,cleanProgress,VERSION} from './core.mjs';
import {createView} from './view.mjs';
import {Soundscape} from './audio.mjs';
import {LANGS,TEXT,t,initialLang} from './i18n.mjs';
const $=id=>document.getElementById(id),api=new URL('../api/',location.href),SAVE='island-v2-progress';
let lang=initialLang(),hero='alex',world=new World(),state=world.snapshot(),playing=false,view,id=0,network=null,stream=null,seq=0,netReady=false,busy=false,overlayStamp='',lastEvent=0,lastTime=0,reduced=false;
const sound=new Soundscape(),keys=new Set(),joy={id:null,x:0,z:0},held=new Set();let sendChain=Promise.resolve(),inputPending=false,lastInputAt=0,saveStamp='';
function tr(k){return t(k,lang);}
function stored(){try{return cleanProgress(JSON.parse(localStorage.getItem(SAVE)||'{}'));}catch{return cleanProgress({});}}
function save(){if(!network&&world&&['shop','won'].includes(state.phase)){try{const next=JSON.stringify(world.progress());if(next!==saveStamp){localStorage.setItem(SAVE,next);saveStamp=next;}}catch{}}}
function localized(){document.documentElement.lang=lang;document.title=tr('title');$('lang').value=lang;document.querySelectorAll('[data-t]').forEach(el=>el.textContent=tr(el.dataset.t));$('hubLink').href='../?lang='+lang;$('reviewLink').href='../review.html?lang='+lang;$('roomCode').setAttribute('aria-label',tr('room'));overlayStamp='';try{localStorage.setItem('island-language',lang);}catch{}refresh();}
function toast(key){$('toast').textContent=tr(key);$('toast').classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').classList.remove('show'),2400);}
function clearInput(){keys.clear();joy.id=null;joy.x=joy.z=0;held.clear();$('knob').style.transform='';if(!network&&world)world.setInput(0,{});}
function currentInput(){let x=joy.x+(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0),z=joy.z+(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-(keys.has('KeyW')||keys.has('ArrowUp')?1:0),len=Math.hypot(x,z);if(len>1){x/=len;z/=len;}return {x,z,attack:held.size>0||keys.has('KeyE')||keys.has('KeyJ')};}
async function post(endpoint,data){const res=await fetch(new URL(endpoint,api),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const result=await res.json();if(!res.ok)throw new Error(result.error||'networkError');return result;}
function send(action){if(!network||!netReady)return;const connection=network,packet={...connection,seq:++seq,input:currentInput(),...(action?{action}:{})};sendChain=sendChain.catch(()=>{}).then(async()=>{if(network!==connection)return;await post('input',packet);}).catch(e=>{if(e.message==='hostOnly')toast('hostOnly');else if(playing)toast('networkError');});return sendChain;}
function command(action){if(!playing)return;void sound.unlock().catch(()=>{});if(network)send(action);else{world.command(0,action);state=world.snapshot();save();refresh();}}
function leave(){if(stream)stream.close();stream=null;network=null;netReady=false;seq=0;try{sessionStorage.removeItem('island-room');}catch{}clearInput();}
function showMenu(){leave();playing=false;world=new World({heroes:[hero]});state=world.snapshot();id=0;lastEvent=0;lastTime=0;overlayStamp='';$('lobby').hidden=true;refresh();}
function startSolo(){leave();playing=true;id=0;world=new World({heroes:[hero],progress:stored()});state=world.snapshot();lastEvent=0;lastTime=0;overlayStamp='';clearInput();void sound.unlock().catch(()=>{});refresh();}
function connect(session){network=session;id=session.id;seq=Math.max(seq,Math.floor(Date.now()));netReady=false;playing=false;world=null;$('menu').hidden=true;$('lobby').hidden=false;$('roomLabel').textContent=session.room;
 try{sessionStorage.setItem('island-room',JSON.stringify(session));}catch{}
 stream=new EventSource(new URL('events?room='+encodeURIComponent(session.room)+'&token='+encodeURIComponent(session.token),api));
 stream.onmessage=e=>{let packet;try{packet=JSON.parse(e.data);}catch{return;}netReady=true;$('lobbyText').textContent=tr(packet.players.length===2&&packet.players.every(p=>p.connected)?'connected':'waiting');$('launch').hidden=id!==0||packet.players.length!==2||packet.players.some(p=>!p.connected);
  if(packet.state){if(!state.paused&&packet.state.paused)clearInput();if(packet.state.t<state.t){lastEvent=0;lastTime=0;clearInput();}state=packet.state;hero=state.players[id]?.hero||hero;playing=true;$('lobby').hidden=true;refresh();}
 };
 stream.onerror=()=>{netReady=false;if(playing){state.paused=true;clearInput();toast('netPaused');refresh();}};
}
async function lobby(which){if(busy)return;busy=true;void sound.unlock().catch(()=>{});try{leave();const packet=await post(which==='host'?'rooms':'join',which==='host'?{hero}:{room:$('roomCode').value.trim()});connect(packet);}catch(e){toast(TEXT[e.message]?e.message:'networkError');}finally{busy=false;}}
$('solo').onclick=startSolo;$('host').onclick=()=>lobby('host');$('join').onclick=()=>lobby('join');$('leaveLobby').onclick=showMenu;$('launch').onclick=async()=>{try{await post('launch',{...network,seq:++seq});void sound.unlock();}catch(e){toast(TEXT[e.message]?e.message:'networkError');}};
for(const name of ['alex','victory'])$('pick'+name[0].toUpperCase()+name.slice(1)).onclick=()=>{hero=name;world=new World({heroes:[hero]});state=world.snapshot();document.querySelectorAll('.hero').forEach(b=>{const on=b.id.toLowerCase().includes(name);b.classList.toggle('selected',on);b.setAttribute('aria-pressed',String(on));});};
$('lang').onchange=()=>{lang=$('lang').value;localized();};$('pause').onclick=()=>{clearInput();command('pauseOn');};$('resume').onclick=()=>command('resume');$('skip').onclick=()=>command('skip');$('rematch').onclick=()=>command('rematch');$('finish').onclick=()=>command('finish');$('returnMenu').onclick=showMenu;
$('retry').onclick=async()=>{if(network){try{await post('launch',{...network,seq:++seq});}catch(e){toast(TEXT[e.message]?e.message:'networkError');}}else startSolo();};
$('music').onchange=()=>sound.music=$('music').checked;$('sound').onchange=()=>sound.sound=$('sound').checked;$('motion').onchange=()=>reduced=$('motion').checked;
$('resetSave').onclick=()=>{if(confirm(tr('resetConfirm'))){try{localStorage.removeItem(SAVE);}catch{}showMenu();}};
function refresh(){const p=state.players[id]||state.players[0],b=state.boss;$('menu').hidden=playing||!!network;$('hud').hidden=!playing;$('pause').hidden=!playing;$('controls').hidden=!playing||state.paused||!['beach','fight','loot'].includes(state.phase);$('caption').hidden=!playing||state.phase!=='intro';
 $('heroName').textContent=p.hero.toUpperCase();$('health').textContent=Math.ceil(p.hp)+' / '+p.maxHP;$('healthFill').style.width=p.hp/p.maxHP*100+'%';$('wallet').textContent='◇ '+p.coins+' '+tr('coins');$('bossFill').style.width=Math.max(0,b.hp/b.maxHP*100)+'%';$('challenge').textContent=tr('round')+' '+state.round+' · '+Math.ceil(b.hp)+' / '+b.maxHP+(state.coop?' · 2P':'');
 $('bossHUD').hidden=!playing||state.phase==='beach'&&Math.hypot(p.x,p.z+17)>24;const other=state.players.find(q=>q.id!==id);$('partner').textContent=other?other.hero.toUpperCase()+' '+Math.ceil(other.hp)+' / '+other.maxHP:'';
 let goal=state.phase;if(state.phase==='beach'&&Math.hypot(p.x,p.z+17)<22)goal='watch';if(state.phase==='fight'&&b.windup>0)goal=b.attack;if(p.hp<=0&&state.phase==='fight')goal='spectator';$('quest').textContent=tr(goal==='intro'?'introCaption':goal);
 $('attackLabel').textContent=p.hero==='alex'?tr('attack'):p.holding!==null?tr(state.rocks[p.holding]?.status==='lifting'?'lifting':'throw'):tr('lift');$('attack').querySelector('.symbol').textContent=p.hero==='alex'?'ϟ':'◈';$('specialLabel').textContent=tr(p.hero==='alex'?'special':'gravity');
 for(const k of ['attack','special','dash','anchor'])$(k+'CD').textContent=k==='anchor'&&!p.anchorUnlocked?tr('locked'):p[k+'CD']>.08?Math.ceil(p[k+'CD'])+'s':'';
 $('anchor').disabled=!p.anchorUnlocked||p.hp<=0;
 const modal=playing&&(state.paused||['shop','won','dead'].includes(state.phase));$('overlay').hidden=!modal;if(!modal)return;
 const kind=state.paused?'paused':state.phase,stamp=kind+lang+p.coins+JSON.stringify(p.upgrades)+JSON.stringify(state.players.map(q=>q.connected))+id;if(stamp===overlayStamp)return;overlayStamp=stamp;
 $('overTitle').textContent=tr(kind==='paused'?'breathe':kind);$('overText').textContent=tr(kind==='paused'?(state.players.some(q=>!q.connected)||!netReady&&network?'netPaused':'keyboard'):kind==='shop'?'shopText':kind==='dead'?'deadText':'wonText');
 for(const [btn,visible] of [['resume',kind==='paused'],['retry',kind==='dead'&&(!network||id===0)],['rematch',kind==='shop'&&(!network||id===0)],['finish',kind==='shop'&&(!network||id===0)],['returnMenu',true]])$(btn).hidden=!visible;
 $('resume').disabled=!!network&&(!netReady||state.players.some(q=>!q.connected));$('resetSave').hidden=!!network;$('shopItems').hidden=kind!=='shop';
 if(kind==='shop'){$('shopItems').replaceChildren();for(const [key,item] of Object.entries(SHOP)){const level=p.upgrades[key],cost=item.cost+level*2,card=document.createElement('article');card.className='upgrade';const title=document.createElement('h3'),desc=document.createElement('p'),rank=document.createElement('small'),button=document.createElement('button');title.textContent=tr(key);desc.textContent=tr(key+'Desc');rank.textContent=tr('level')+' '+level+' / '+item.max;button.textContent=level===item.max?tr('max'):tr('buy')+' · ◇ '+cost;button.disabled=level===item.max||p.coins<cost;button.onclick=()=>command('buy:'+key);card.append(title,desc,rank,button);$('shopItems').append(card);}}
}
const stick=$('joystick');function movePointer(e){const r=stick.getBoundingClientRect(),max=r.width*.32;let x=(e.clientX-r.x-r.width/2)/max,z=(e.clientY-r.y-r.height/2)/max,d=Math.hypot(x,z);if(d>1){x/=d;z/=d;}joy.x=x;joy.z=z;$('knob').style.transform=`translate(${x*max}px,${z*max}px)`;}
stick.addEventListener('pointerdown',e=>{if(joy.id!==null||!playing)return;joy.id=e.pointerId;stick.setPointerCapture(e.pointerId);movePointer(e);e.preventDefault();});stick.addEventListener('pointermove',e=>{if(e.pointerId===joy.id){movePointer(e);e.preventDefault();}});
for(const type of ['pointerup','pointercancel','lostpointercapture'])stick.addEventListener(type,e=>{if(joy.id===e.pointerId){joy.id=null;joy.x=joy.z=0;$('knob').style.transform='';}});
$('attack').addEventListener('pointerdown',e=>{if(!playing)return;held.add(e.pointerId);$('attack').setPointerCapture(e.pointerId);command('attack');e.preventDefault();});for(const type of ['pointerup','pointercancel','lostpointercapture'])$('attack').addEventListener(type,e=>held.delete(e.pointerId));
for(const action of ['special','dash','anchor'])$(action).addEventListener('pointerdown',e=>{e.preventDefault();command(action);});
addEventListener('keydown',e=>{if(['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;if(!playing)return;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();keys.add(e.code);if(e.repeat)return;const actions={KeyE:'attack',KeyJ:'attack',KeyQ:'special',Space:'dash',KeyR:'anchor',Escape:state.paused?'resume':'pauseOn'};if(actions[e.code])command(actions[e.code]);});addEventListener('keyup',e=>keys.delete(e.code));
function loseFocus(){clearInput();if(playing&&!state.paused&&['beach','fight','intro','loot'].includes(state.phase))command('pauseOn');if(network&&netReady)send();}
addEventListener('blur',loseFocus);document.addEventListener('visibilitychange',()=>{if(document.hidden)loseFocus();});document.addEventListener('contextmenu',e=>e.preventDefault());for(const ev of ['gesturestart','gesturechange','gestureend','dblclick'])document.addEventListener(ev,e=>e.preventDefault(),{passive:false});
// Prevent page zoom only on the dedicated game surface, not the accessible hub.
document.addEventListener('touchmove',e=>{if(e.touches.length>1||!e.target.closest('.panel'))e.preventDefault();},{passive:false});
$('world').addEventListener('webglcontextlost',e=>{e.preventDefault();loseFocus();$('fatal').hidden=false;$('errorDetail').textContent=tr('error');});
try{view=createView($('world'));}catch(e){$('fatal').hidden=false;$('errorDetail').textContent=e.message;}
localized();fetch(new URL('info',api)).then(r=>r.ok?r.json():Promise.reject()).then(info=>{if(info.mode==='lan'){$('lanNote').textContent=tr('roomHint');$('host').disabled=$('join').disabled=false;}}).catch(()=>{$('host').disabled=$('join').disabled=true;});
try{const session=JSON.parse(sessionStorage.getItem('island-room')||'null');if(session?.token&&session?.room)connect(session);}catch{}
let last=performance.now(),acc=0;function frame(now){requestAnimationFrame(frame);const dt=Math.min(.10,(now-last)/1000);last=now;
 if(playing&&!network){world.setInput(0,currentInput());acc+=dt;while(acc>=1/60){world.step(1/60);acc-=1/60;}state=world.snapshot();save();}
 if(playing&&network&&netReady&&!inputPending&&now-lastInputAt>50){lastInputAt=now;inputPending=true;Promise.resolve(send()).finally(()=>inputPending=false);}
 if(state.t<lastTime)lastEvent=0;lastTime=state.t;
 for(const e of state.events)if(e.id>lastEvent){sound.effect(e.type);if(['noRock','approach','insufficient','enrage'].includes(e.type)&&(e.player===undefined||e.player===id))toast(e.type);if(e.type==='warning')toast(e.attack);lastEvent=e.id;}
 if(playing){const i=currentInput();sound.update(state,Math.hypot(i.x,i.z)>.1&&state.phase==='fight');refresh();}
 if(view)view.update(state,id,!playing,Math.min(dt,.05),reduced);
}requestAnimationFrame(frame);
window.islandDiagnostics=Object.freeze({version:VERSION,snapshot:()=>({state:structuredClone(state),network:!!network,connected:netReady,graphics:view?.diagnostics()})});
