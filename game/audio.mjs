/** Original sound design: replaceable WAV guardian voice plus synthesized score/foley. */
export class Soundscape {
 constructor(){this.ctx=null;this.sound=true;this.music=true;this.nextBeat=0;this.beat=0;this.lastStep=0;this.roarBuffer=null;this.roarPromise=null;this.duckUntil=0;this.playedRoars=0;this.active=new Set();this.wasPaused=false;}
 async unlock(){if(!this.ctx){const C=window.AudioContext||window.webkitAudioContext;if(!C)return;this.ctx=new C();const master=this.ctx.createGain();master.gain.value=.40;const limiter=this.ctx.createDynamicsCompressor();limiter.threshold.value=-12;limiter.ratio.value=5;master.connect(limiter);limiter.connect(this.ctx.destination);this.master=master;this.roarPromise=fetch(new URL('./assets/guardian-roar.wav',import.meta.url)).then(r=>{if(!r.ok)throw Error('roar file');return r.arrayBuffer();}).then(b=>this.ctx.decodeAudioData(b)).then(b=>this.roarBuffer=b).catch(()=>null);}if(this.ctx.state==='suspended')await this.ctx.resume();}
 track(s){this.active.add(s);s.onended=()=>this.active.delete(s);return s;}
 tone(freq,duration=.18,type='sine',vol=.1,end=freq){const c=this.ctx;if(!c||c.state!=='running')return;const o=this.track(c.createOscillator()),g=c.createGain();o.type=type;o.frequency.setValueAtTime(freq,c.currentTime);o.frequency.exponentialRampToValueAtTime(Math.max(20,end),c.currentTime+duration);g.gain.setValueAtTime(.0001,c.currentTime);g.gain.exponentialRampToValueAtTime(Math.max(.0002,vol),c.currentTime+.012);g.gain.exponentialRampToValueAtTime(.0001,c.currentTime+duration);o.connect(g);g.connect(this.master);o.start();o.stop(c.currentTime+duration+.02);}
 noise(duration=.12,vol=.1,cutoff=800){const c=this.ctx;if(!c||c.state!=='running')return;const buf=c.createBuffer(1,Math.ceil(c.sampleRate*duration),c.sampleRate),data=buf.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.pow(1-i/data.length,1.7);const s=this.track(c.createBufferSource()),f=c.createBiquadFilter(),g=c.createGain();s.buffer=buf;f.type='lowpass';f.frequency.value=cutoff;g.gain.value=vol;s.connect(f);f.connect(g);g.connect(this.master);s.start();}
 roar(){if(!this.ctx||!this.sound)return;this.duckUntil=this.ctx.currentTime+3.2;this.playedRoars++;if(this.roarBuffer){for(const [offset,rate,gain] of [[0,1,.72],[.08,.78,.22],[.15,1.13,.14]]){const s=this.track(this.ctx.createBufferSource()),g=this.ctx.createGain();s.buffer=this.roarBuffer;s.playbackRate.value=rate;g.gain.value=gain;s.connect(g);g.connect(this.master);s.start(this.ctx.currentTime+offset);}}else{this.tone(125,1.8,'sawtooth',.28,45);this.tone(74,2.3,'triangle',.26,30);this.noise(1.8,.3,1300);}}
 effect(type,e={}){if(!this.sound)return;
  if(['begin','roar','enrage'].includes(type)||(type==='bossAttack'&&e.attack==='roar'))this.roar();
  else if(type==='railFire'){this.tone(e.charged?95:480,e.charged?.42:.15,'sawtooth',e.charged?.18:.10,e.charged?890:65);this.noise(e.charged?.28:.10,e.charged?.26:.13,2300);}
  else if(type==='railHit'||type==='bossHit'||type==='rockHit'){this.noise(.14,.18,1200);this.tone(135,.16,'triangle',.13,43);}
  else if(type==='hurt'){this.tone(200,.23,'triangle',.22,73);this.noise(.12,.15,800);}
  else if(type==='lift'||type==='gravity'){this.tone(140,.48,'sine',.16,550);this.tone(221,.40,'sine',.07,680);}
  else if(type==='throw'||type==='dash'){this.noise(.25,.23,2100);this.tone(470,.2,'sine',.09,120);}
  else if(type==='slamLaunch'||type==='bossLeap'){this.tone(120,.45,'sawtooth',.12,740);this.noise(.3,.20,1400);}
  else if(type==='slamImpact'||type==='bossImpact'){this.tone(92,.7,'triangle',.45,26);this.noise(.60,.50,1600);this.tone(175,.3,'sawtooth',.18,45);}
  else if(type==='snakeHiss')this.noise(1.5,.30,6800);
  else if(type==='bite'){this.noise(.35,.38,2200);this.tone(150,.35,'sawtooth',.22,37);}
  else if(type==='gulp'){this.tone(94,.52,'triangle',.24,43);this.noise(.28,.12,320);}
  else if(type==='footstep')this.noise(.09,.09,450);
  else if(type==='reward'||type==='purchase'||type==='won'){[330,440,554,660].forEach((n,i)=>setTimeout(()=>{if(this.sound)this.tone(n,.28,'sine',.10);},i*85));}
  else if(type==='warning')this.tone(220,.2,'sine',.12,330);
  else if(type==='bossAttack'){this.noise(.40,.26,850);this.tone(78,.35,'triangle',.20,28);}
 }
 update(state,moving){if(!this.ctx)return;if(state.paused){if(!this.wasPaused){for(const s of this.active)try{s.stop();}catch{}this.active.clear();}this.wasPaused=true;return;}this.wasPaused=false;const now=this.ctx.currentTime;
  if(this.sound&&moving&&now-this.lastStep>.3){this.lastStep=now;this.noise(.07,.07,450);}
  if(this.music&&['beach','fight','intro','loot'].includes(state.phase)&&now>=this.nextBeat){const battle=state.phase==='fight',ducken=now<this.duckUntil?.25:1,pattern=[110,110,130.81,98,110,164.81,146.83,98];this.nextBeat=now+(battle?.29:.58);const note=pattern[this.beat++%8];this.tone(note,battle?.24:.55,'triangle',(battle?.11:.055)*ducken);if(battle){this.tone(note*2,.13,'sine',.035*ducken);if(this.beat%2===0)this.noise(.055,.055*ducken,700);if(this.beat%4===0)this.tone(72,.18,'sine',.15*ducken,28);}if(this.beat%8===0){for(const r of [2,2.5,3])this.tone(note*r,1.4,'sine',.016*ducken);}}
 }
 diagnostics(){return {context:this.ctx?.state||'locked',roarLoaded:!!this.roarBuffer,roarDuration:this.roarBuffer?.duration||0,playedRoars:this.playedRoars,sound:this.sound,music:this.music};}
}
