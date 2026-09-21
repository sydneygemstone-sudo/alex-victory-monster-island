/** Original synthesized sound design. No samples, external music, microphone or fees. */
export class Soundscape {
 constructor(){this.ctx=null;this.sound=true;this.music=true;this.nextBeat=0;this.beat=0;this.lastStep=0;}
 async unlock(){if(!this.ctx){const C=window.AudioContext||window.webkitAudioContext;if(!C)return;this.ctx=new C();const master=this.ctx.createGain();master.gain.value=.24;const limiter=this.ctx.createDynamicsCompressor();limiter.threshold.value=-18;limiter.ratio.value=8;master.connect(limiter);limiter.connect(this.ctx.destination);this.master=master;}if(this.ctx.state==='suspended')await this.ctx.resume();}
 tone(freq,duration=.18,type='sine',vol=.1,end=freq){const c=this.ctx;if(!c||c.state!=='running')return;const o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(freq,c.currentTime);o.frequency.exponentialRampToValueAtTime(Math.max(20,end),c.currentTime+duration);g.gain.setValueAtTime(.0001,c.currentTime);g.gain.exponentialRampToValueAtTime(Math.max(.0002,vol),c.currentTime+.012);g.gain.exponentialRampToValueAtTime(.0001,c.currentTime+duration);o.connect(g);g.connect(this.master);o.start();o.stop(c.currentTime+duration+.02);}
 noise(duration=.12,vol=.1,cutoff=800){const c=this.ctx;if(!c||c.state!=='running')return;const buf=c.createBuffer(1,Math.ceil(c.sampleRate*duration),c.sampleRate),data=buf.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.pow(1-i/data.length,2);const s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();s.buffer=buf;f.type='lowpass';f.frequency.value=cutoff;g.gain.value=vol;s.connect(f);f.connect(g);g.connect(this.master);s.start();}
 effect(type){if(!this.sound)return;
  if(['begin','roar','enrage'].includes(type)){this.tone(95,.9,'sawtooth',.22,39);this.tone(73,1.1,'triangle',.19,32);this.noise(.65,.2,420);}
  else if(['bolt','beam'].includes(type)){this.tone(type==='beam'?170:800,type==='beam'?.4:.12,'sawtooth',.08,type==='beam'?1100:160);this.noise(.06,.05,2800);}
  else if(type==='bossHit'||type==='rockHit'){this.noise(.10,.14,650);this.tone(125,.1,'triangle',.12,50);}
  else if(type==='hurt'){this.tone(185,.18,'triangle',.16,73);this.noise(.1,.09,500);}
  else if(type==='lift'||type==='gravity'){this.tone(150,.45,'sine',.14,530);this.tone(221,.4,'sine',.06,660);}
  else if(type==='throw'||type==='dash'){this.noise(.18,.09,1500);this.tone(340,.15,'sine',.04,170);}
  else if(type==='reward'||type==='purchase'||type==='won'){[330,440,554,660].forEach((n,i)=>setTimeout(()=>{if(this.sound)this.tone(n,.28,'sine',.09);},i*75));}
  else if(type==='anchor'){this.tone(80,.35,'triangle',.22,32);this.noise(.25,.11,300);}
  else if(type==='warning'){this.tone(220,.2,'sine',.1,330);}
  else if(type==='bossAttack'){this.noise(.4,.2,530);this.tone(78,.35,'triangle',.15,28);}
 }
 update(state,moving){if(!this.ctx||state.paused)return;const now=this.ctx.currentTime;
  if(this.sound&&moving&&now-this.lastStep>.3){this.lastStep=now;this.noise(.06,.055,300);}
  if(this.music&&['beach','fight','intro','loot'].includes(state.phase)&&now>=this.nextBeat){const battle=state.phase==='fight',pattern=[110,110,130.81,98,110,164.81,146.83,98];this.nextBeat=now+(battle?.29:.58);const note=pattern[this.beat++%8];this.tone(note,battle?.22:.50,'triangle',battle?.075:.035);if(battle&&this.beat%2===0){this.tone(note*2,.12,'sine',.025);this.noise(.045,.028,500);}if(this.beat%8===0)this.tone(note*4,.9,'sine',.018);}
 }
}
