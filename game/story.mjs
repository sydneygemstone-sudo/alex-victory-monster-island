/** Shared, deterministic prologue timeline. No input or damage is accepted during it. */
export const STORY_DURATION=36;
export const SHOTS=[
 {start:0,end:5,key:'storyBoat',eye:[-17,5.8,32],to:[-8,1.6,21],eyeEnd:[-12,4.3,28],toEnd:[-5,1.4,16]},
 {start:5,end:10,key:'storyWalk',eye:[-11,3.8,20],to:[-5,1.5,10],eyeEnd:[-12,4.2,10],toEnd:[-6,1.7,0]},
 {start:10,end:14,key:'storyHide',eye:[-9,2.9,5],to:[0,3,-17],eyeEnd:[-7,2.5,2],toEnd:[0,3.5,-17]},
 {start:14,end:19,key:'storySnake',eye:[9,3.2,-2],to:[7,2.1,-12],eyeEnd:[7,3.2,-6],toEnd:[3,2.2,-12]},
 {start:19,end:23,key:'storyRoar',eye:[3,2.3,-7],to:[0,4,-16],eyeEnd:[1,2.1,-6],toEnd:[0,4.3,-16]},
 {start:23,end:27,key:'storyDefy',eye:[4,2.7,-15],to:[2,2.7,-10],eyeEnd:[5,3.8,-17],toEnd:[2,2.8,-10]},
 {start:27,end:31.5,key:'storyEat',eye:[9,4.4,-5],to:[0,3,-13],eyeEnd:[6,3.8,-8],toEnd:[0,3.4,-14]},
 {start:31.5,end:36,key:'storyReady',eye:[-10,2.1,-1],to:[-7,1.3,1],eyeEnd:[-8,7.5,14],toEnd:[-6,2,-5]}
];
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
export const smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
export const mix=(a,b,v)=>a+(b-a)*v;
export function storyFrame(t){const index=Math.max(0,SHOTS.findIndex(s=>t<s.end));const shot=SHOTS[t>=STORY_DURATION?SHOTS.length-1:index];const f=smooth((t-shot.start)/(shot.end-shot.start));return {index:SHOTS.indexOf(shot),key:shot.key,eye:shot.eye.map((v,i)=>mix(v,shot.eyeEnd[i],f)),look:shot.to.map((v,i)=>mix(v,shot.toEnd[i],f)),progress:clamp(t/STORY_DURATION)};}
export function explorerPose(t,index=0){let x=-8+index*.85,z=22+index*.2,y=.85,heading=2.8,crouch=0,walk=0;
 if(t<5){const f=smooth((t-.9)/3.6);x=mix(x,-4+index*.9,f);z=mix(z,15+index*.5,f);y=mix(.85,0,f)+Math.sin(f*Math.PI)*.45;heading=2.7;walk=f>0&&f<1?1:0;}
 else if(t<10){const f=smooth((t-5)/5);x=mix(-4+index*.9,-7+index*1.5,f);z=mix(15+index*.5,1+index*.6,f);y=0;heading=3.3;walk=1;}
 else{x=-7+index*1.5;z=1+index*.6;y=0;heading=2.8;crouch=t<32? smooth((t-10)/1.2):1-smooth((t-32)/2.5);}
 return {x,y,z,heading,crouch,walk};}
