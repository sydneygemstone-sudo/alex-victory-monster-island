/** CPU-only scene construction check using real Three.js geometry, not a browser/WebGL test. */
import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
import {World} from '../game/core.mjs';import {createView} from '../game/view.mjs';
const vendor=new URL('../game/vendor/three.min.js',import.meta.url),out=new URL('./scene-check.json',import.meta.url);
if(!fs.existsSync(vendor)){console.log('SKIPPED: vendored engine not yet copied');process.exit(0);}
const sandbox={console:{warn:()=>{},log:()=>{},error:console.error}};vm.createContext(sandbox);vm.runInContext(fs.readFileSync(vendor,'utf8'),sandbox);const THREE=sandbox.THREE;
let rendered=0,objects=0;class CPUOnlyRenderer{constructor(){this.shadowMap={};this.info={render:{calls:0,triangles:0},memory:{geometries:0}};}setPixelRatio(){}setSize(){}render(scene,camera){scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);scene.traverse(o=>{if(o.isMesh){assert.ok(o.geometry?.attributes.position);for(const n of o.matrixWorld.elements)assert.ok(Number.isFinite(n));}});rendered++;objects=scene.children.length;}}
THREE.WebGLRenderer=CPUOnlyRenderer;globalThis.window={THREE};globalThis.devicePixelRatio=1;globalThis.innerWidth=1180;globalThis.innerHeight=820;globalThis.addEventListener=()=>{};
const view=createView({clientWidth:1180,clientHeight:820}),w=new World({heroes:['alex','victory']});view.update(w.snapshot(),0,true);w.begin();for(let i=0;i<300;i++){w.step();view.update(w.snapshot(),i%2,false);}
w.command(0,'special');w.s.players[1].x=4;w.s.players[1].z=6;w.command(1,'attack');for(let i=0;i<60;i++){w.step();view.update(w.snapshot(),1,false);}
w.command(1,'attack');w.command(1,'special');view.update(w.snapshot(),1,false);for(const phase of ['fight','loot','shop','won','dead']){w.s.phase=phase;view.update(w.snapshot(),0,false);}w.pause(true);view.update(w.snapshot(),0,false);
const result={passed:true,method:'CPU-only real Three.js geometry and finite world transforms; WebGLRenderer stubbed, no pixel, performance, audio or touch claim',updates:rendered,sceneObjects:objects};fs.writeFileSync(out,JSON.stringify(result,null,2));console.log(JSON.stringify(result));
