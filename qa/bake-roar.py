"""Bake an original, replaceable creature voice. No external recordings are used."""
from pathlib import Path
import math,random,wave,struct,json,hashlib
R=Path(__file__).resolve().parent.parent
out=R/'game/assets';out.mkdir(exist_ok=True)
rate=24000;duration=3.1;N=int(rate*duration);rng=random.Random(812)
voice=[];phase=0;low=0
for i in range(N):
 t=i/rate;f=t/duration
 pitch=73+34*math.sin(min(1,t/.45)*math.pi*.6)-25*f+4*math.sin(t*31)+rng.random()*3
 phase+=2*math.pi*pitch/rate
 # Three chest/roar formants and subharmonics retain growl on tablet speakers.
 value=0
 for h in range(1,21):
  hz=h*pitch
  amp=(.65*math.exp(-((hz-320)/170)**2)+.8*math.exp(-((hz-840)/290)**2)+.2*math.exp(-((hz-1650)/420)**2))/math.sqrt(h)
  value+=math.sin(phase*h+math.sin(t*19)*.16)*amp
 noise=rng.random()*2-1;low=.94*low+.06*noise
 rough=(value*.5+low*2+noise*.09)*(.73+.27*math.sin(t*43)**2)
 env=min(1,t/.14)*min(1,(duration-t)/.75)*(.45+.55*math.sin(min(1,t/.65)*math.pi/2))
 rough=math.tanh(rough*1.5)*env
 voice.append(rough)
# Short cave reflections are part of the asset, not browser scheduling.
sound=voice[:]
for delay,gain in [(.09,.23),(.17,.13),(.29,.075)]:
 offset=int(delay*rate)
 for i in range(offset,N):sound[i]+=voice[i-offset]*gain
peak=max(abs(v) for v in sound);sound=[v/peak*.88 for v in sound]
raw=struct.pack('<'+'h'*N,*(int(v*32767) for v in sound))
f=out/'guardian-roar.wav'
with wave.open(str(f),'wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(rate);w.writeframes(raw)
report={'file':'game/assets/guardian-roar.wav','origin':'Original procedural formant/subharmonic/noise synthesis. No stock samples. Replaceable classroom audio placeholder.','duration_s':duration,'sample_rate':rate,'peak':max(abs(v) for v in sound),'rms':math.sqrt(sum(v*v for v in sound)/N),'sha256':hashlib.sha256(f.read_bytes()).hexdigest(),'generator':'qa/bake-roar.py'}
(R/'data/audio-provenance.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report))
