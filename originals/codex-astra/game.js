import * as THREE from './vendor/three.module.js';
import { createGame, step, RULES, HEROES } from './combat.js';

const element = id => document.getElementById(id);
const canvas = element('world');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
} catch (error) {
  element('load-error').hidden = false;
  throw error;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#b6e0dd');
scene.fog = new THREE.Fog('#b6e0dd', 48, 110);
const camera = new THREE.PerspectiveCamera(57, innerWidth / innerHeight, 0.1, 180);
scene.add(new THREE.HemisphereLight('#f8efd8', '#619080', 2.8));
const sun = new THREE.DirectionalLight('#fff0cf', 3.3);
sun.position.set(-20, 35, 20);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -35, right: 35, top: 30, bottom: -35, near: 1, far: 95 });
sun.shadow.normalBias = 0.045;
scene.add(sun);
const material = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.87, ...extra });
const sand = material('#e6c891');
const stone = material('#777d70');
const darkStone = material('#526462');
const foliage = material('#448a66');
const leafLight = material('#7eac71');
const bark = material('#916b46');
const gold = material('#ffc864', { emissive: '#8b4b08', emissiveIntensity: 0.3 });
const teal = material('#54e8e6', { emissive: '#26a5bf', emissiveIntensity: 1.2 });
const purple = material('#d2a5ff', { emissive: '#774cc5', emissiveIntensity: 0.8 });
const ivory = material('#fff0cc');
const skin = material('#dca97b');
const dark = material('#223840');
const guardianMat = material('#62616c');
const guardianFace = material('#817884');
const noseMat = material('#29383e');
const guardianEyes = material('#ffd77a', { emissive: '#ed8c22', emissiveIntensity: 0.8 });
const meshes = [];

function mesh(geometry, surface, parent, position, scale) {
  const object = new THREE.Mesh(geometry, surface);
  if (position) object.position.set(...position);
  if (scale) object.scale.set(...scale);
  object.castShadow = true;
  object.receiveShadow = true;
  parent.add(object);
  return object;
}
const box = (parent, surface, position, scale) => mesh(new THREE.BoxGeometry(1, 1, 1), surface, parent, position, scale);
const rock = (parent, surface, position, scale) => mesh(new THREE.IcosahedronGeometry(1, 0), surface, parent, position, scale);
const sphere = (parent, surface, position, scale) => mesh(new THREE.SphereGeometry(1, 10, 8), surface, parent, position, scale);
const cylinder = (parent, surface, position, radiusTop, radiusBottom, height, segments = 8) => mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments), surface, parent, position);
function ring(parent, color, radius, width, opacity = 1) {
  const surface = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide });
  const object = mesh(new THREE.RingGeometry(radius - width, radius, 64), surface, parent, [0, 0.035, 0]);
  object.rotation.x = -Math.PI / 2;
  object.castShadow = false;
  return object;
}
let randomSeed = 62;
function random() {
  randomSeed = (randomSeed * 1664525 + 1013904223) >>> 0;
  return randomSeed / 4294967296;
}

const water = mesh(new THREE.PlaneGeometry(240, 240), material('#56b8b5', { roughness: 0.27, metalness: 0.1 }), scene, [0, -0.25, 25]);
water.rotation.x = -Math.PI / 2;
const ground = box(scene, sand, [0, -0.85, 0], [42, 1.65, 53]);
const beachEnd = cylinder(scene, sand, [0, -0.8, 23], 20.5, 22, 1.6, 32);
beachEnd.scale.z = 0.42;
const waves = [];
const foam = material('#d6f2dd', { transparent: true, opacity: 0.5 });
for (let index = 0; index < 10; index++) {
  const wave = box(scene, foam, [-28 + index * 6, -0.03, 30 + index % 3 * 4], [3 + random() * 5, 0.025, 0.2]);
  wave.castShadow = false;
  waves.push(wave);
}
for (let index = 0; index < 45; index++) {
  const side = index % 2 === 0 ? -1 : 1;
  const size = 0.3 + random() * 1.2;
  rock(scene, index % 3 ? stone : ivory, [side * (10 + random() * 10), size * 0.35, 22 - random() * 39], [size * 1.4, size, size]);
}
function palm(positionX, positionZ, size = 1) {
  const group = new THREE.Group();
  group.position.set(positionX, 0, positionZ);
  group.scale.setScalar(size);
  scene.add(group);
  const trunk = cylinder(group, bark, [0, 3.1, 0], 0.23, 0.47, 6.2);
  trunk.rotation.z = 0.1;
  for (let index = 0; index < 7; index++) {
    const leaf = new THREE.Group();
    leaf.position.set(-0.3, 6.1, 0);
    leaf.rotation.y = index / 7 * Math.PI * 2;
    group.add(leaf);
    const blade = rock(leaf, index % 2 ? foliage : leafLight, [0, -0.35, 1.9], [0.63, 0.15, 2.7]);
    blade.rotation.x = 0.23;
  }
  for (let index = 0; index < 3; index++) sphere(group, bark, [Math.cos(index * 2) * 0.4, 5.6, Math.sin(index * 2) * 0.4], [0.3, 0.34, 0.3]);
  return group;
}
for (const position of [[-15, 16, 1], [15, 12, 1.25], [-13, 2, 1.15], [15, -5, 0.95], [-17, -11, 1.3], [17, -17, 1.35]]) palm(...position);
for (let index = 0; index < 16; index++) {
  const positionX = (random() - 0.5) * 43;
  const positionZ = -29 - random() * 15;
  cylinder(scene, bark, [positionX, 4.5, positionZ], 0.4, 0.65, 9);
  rock(scene, index % 2 ? foliage : leafLight, [positionX, 9, positionZ], [3.9, 4.3, 3.8]);
}
for (const side of [-1, 1]) {
  rock(scene, darkStone, [side * 15, 4, -23], [11, 9, 9]);
  rock(scene, stone, [side * 9, 3.4, -20], [5.2, 6, 5]);
  rock(scene, foliage, [side * 15, 8.4, -25], [8.8, 1.6, 7]);
  rock(scene, stone, [side * 5.7, 3.2, -19], [2.2, 4.9, 3.5]);
}
rock(scene, stone, [0, 7.5, -20], [8, 3, 4.3]);
rock(scene, foliage, [0, 9.7, -21], [6.3, 1.3, 3.8]);
box(scene, material('#304645'), [0, 0.04, -21], [8, 0.12, 12]);
const caveInterior = box(scene, material('#163b3a', { emissive: '#386b48', emissiveIntensity: 0.25 }), [0, 3, -26], [8.8, 6, 0.3]);
const gate = new THREE.Group();
gate.position.z = -18.4;
scene.add(gate);
const gateMat = material('#6ce1bb', { transparent: true, opacity: 0.72, emissive: '#248e70', emissiveIntensity: 0.7 });
for (let index = -3; index <= 3; index++) box(gate, gateMat, [index * 1.1, 2.65, 0], [0.12, 5.3, 0.15]);
const lock = rock(gate, gold, [0, 3.2, 0.3], [0.6, 0.8, 0.35]);
const exitGlow = ring(scene, '#a7f5b5', 3, 0.22, 0.9);
exitGlow.position.set(0, 0.08, -23);
const boundary = ring(scene, '#eac276', RULES.territory, 0.085, 0.3);
boundary.position.z = RULES.home.z;
const pathDots = [];
for (let index = 0; index < 11; index++) {
  const dot = rock(scene, gold, [Math.sin(index * 0.4) * 0.65, 0.1, 16 - index * 3.5], [0.11, 0.07, 0.18]);
  dot.castShadow = false;
  pathDots.push(dot);
}

const boat = new THREE.Group();
boat.position.set(-5, 0, 24.7);
boat.rotation.y = -0.18;
scene.add(boat);
const wood = material('#846247');
const hull = cylinder(boat, wood, [0, 0.8, 0], 2.2, 1.5, 1.3, 8);
hull.scale.set(1, 1, 1.65);
box(boat, material('#dfb376'), [0, 1.46, 0], [3.45, 0.12, 5.8]);
for (const side of [-1, 1]) box(boat, wood, [side * 1.75, 1.8, 0], [0.25, 0.7, 5.5]);
cylinder(boat, wood, [0, 4.9, 0], 0.1, 0.17, 7);
const sailShape = new THREE.Shape();
sailShape.moveTo(0, 0); sailShape.lineTo(0, 5); sailShape.lineTo(3.4, 0.7); sailShape.closePath();
mesh(new THREE.ShapeGeometry(sailShape), material('#f8eed7', { side: THREE.DoubleSide }), boat, [0.12, 3, 0]);
box(boat, gold, [-0.6, 1.85, 1.9], [1, 0.8, 0.75]);
const plank = box(scene, wood, [-2.2, 0.45, 23], [4, 0.15, 1]);
plank.rotation.z = -0.13;

function buildHero(hero) {
  const group = new THREE.Group();
  const costume = material(hero === 'alex' ? '#d79842' : '#7161a3');
  const boot = material('#33494b');
  const legs = [];
  for (const side of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(side * 0.25, 0.88, 0);
    group.add(leg);
    box(leg, dark, [0, -0.28, 0], [0.34, 0.58, 0.36]);
    box(leg, boot, [0, -0.62, 0.08], [0.39, 0.28, 0.54]);
    legs.push(leg);
  }
  box(group, costume, [0, 1.26, 0], [0.94, 0.87, 0.53]);
  box(group, dark, [0, 0.97, 0.02], [0.97, 0.13, 0.59]);
  sphere(group, skin, [0, 2.02, 0.02], [0.46, 0.5, 0.41]);
  const hair = rock(group, material(hero === 'alex' ? '#543d30' : '#e2e7da'), [0, 2.3, -0.08], [0.5, 0.32, 0.43]);
  hair.rotation.z = 0.15;
  for (const side of [-1, 1]) box(group, dark, [side * 0.16, 2.03, 0.401], [0.07, 0.08, 0.035]);
  const arms = [];
  for (const side of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(side * 0.64, 1.57, 0);
    group.add(arm);
    box(arm, costume, [0, -0.25, 0], [0.28, 0.52, 0.32]);
    sphere(arm, skin, [0, -0.57, 0.05], [0.17, 0.19, 0.18]);
    arms.push(arm);
  }
  const accents = new THREE.Group();
  group.add(accents);
  if (hero === 'alex') {
    for (const side of [-1, 1]) {
      box(group, dark, [side * 0.22, 2.27, 0.3], [0.36, 0.22, 0.2]);
      box(group, teal, [side * 0.22, 2.27, 0.405], [0.25, 0.12, 0.02]);
    }
    box(group, dark, [0, 1.4, -0.44], [0.77, 0.72, 0.34]);
    for (const side of [-1, 1]) cylinder(group, teal, [side * 0.23, 1.45, -0.66], 0.13, 0.13, 0.55);
    box(arms[1], dark, [0, -0.53, 0.33], [0.29, 0.28, 0.65]);
    sphere(arms[1], teal, [0, -0.5, 0.68], [0.16, 0.16, 0.14]);
  } else {
    const cape = cylinder(group, costume, [0, 0.9, -0.16], 0.45, 0.8, 1.2, 6);
    cape.scale.z = 0.75;
    cylinder(arms[1], bark, [0, -0.34, 0.25], 0.06, 0.065, 1.95);
    rock(arms[1], purple, [0, 0.8, 0.25], [0.22, 0.34, 0.22]);
    for (let index = 0; index < 3; index++) rock(accents, purple, [0, 0, 0], [0.17, 0.22, 0.17]);
  }
  const halo = ring(group, hero === 'alex' ? '#ffe9a2' : '#d0b6ff', 0.9, 0.035, 0.7);
  return { group, legs, arms, accents, halo };
}
const heroes = { alex: buildHero('alex'), victory: buildHero('victory') };
for (const hero of Object.values(heroes)) scene.add(hero.group);
const guardian = new THREE.Group();
scene.add(guardian);
const body = sphere(guardian, guardianMat, [0, 3.1, -0.4], [2.7, 2.05, 3.2]);
const mane = rock(guardian, guardianFace, [0, 3.7, 1], [3.2, 2.1, 2.2]);
const bossLegs = [];
for (const side of [-1, 1]) {
  for (const positionZ of [-2, 1.2]) {
    const leg = new THREE.Group();
    leg.position.set(side * 1.9, 2.2, positionZ);
    guardian.add(leg);
    sphere(leg, guardianMat, [0, -0.5, 0], [0.8, 1.5, 0.8]);
    sphere(leg, guardianFace, [0, -1.72, 0.33], [0.9, 0.46, 1.1]);
    for (let claw = -1; claw <= 1; claw++) rock(leg, ivory, [claw * 0.4, -1.75, 1.18], [0.16, 0.18, 0.45]);
    bossLegs.push(leg);
  }
}
const heads = [];
for (let index = -1; index <= 1; index++) {
  const head = new THREE.Group();
  head.position.set(index * 2.05, index === 0 ? 5.2 : 4.25, 2.05);
  head.rotation.y = index * 0.18;
  guardian.add(head);
  sphere(head, guardianFace, [0, 0, 0], [1.17, 1.17, 1.28]);
  sphere(head, guardianMat, [0, -0.35, 1.05], [0.89, 0.6, 0.9]);
  sphere(head, noseMat, [0, -0.15, 1.78], [0.5, 0.32, 0.22]);
  box(head, noseMat, [0, -0.67, 1.3], [1.26, 0.16, 0.78]);
  for (const side of [-1, 1]) {
    const ear = rock(head, guardianMat, [side * 0.9, 1.03, -0.15], [0.43, 0.9, 0.4]);
    ear.rotation.z = -side * 0.2;
    sphere(head, guardianEyes, [side * 0.69, 0.18, 0.93], [0.26, 0.19, 0.13]);
    const brow = box(head, darkStone, [side * 0.7, 0.46, 0.87], [0.6, 0.19, 0.2]);
    brow.rotation.z = side * 0.23;
    const fang = cylinder(head, ivory, [side * 0.53, -0.77, 1.62], 0.12, 0, 0.52, 5);
    fang.rotation.z = side * 0.12;
  }
  heads.push(head);
}
const tail = new THREE.Group();
tail.position.set(0, 3, -3);
guardian.add(tail);
const tailPart = cylinder(tail, guardianMat, [0, 0.1, -1.1], 0.4, 0.55, 2.8);
tailPart.rotation.x = Math.PI / 2 - 0.3;
rock(tail, guardianFace, [0, 0.6, -2.5], [0.7, 0.7, 1]);
for (let index = 0; index < 5; index++) rock(guardian, darkStone, [0, 5.05, -2.7 + index * 0.65], [0.4, 0.8, 0.5]);

const telegraph = new THREE.Group();
scene.add(telegraph);
const warningRing = ring(telegraph, '#ff5e36', RULES.attackRadius, 0.13, 0.95);
const warningDisk = mesh(new THREE.CircleGeometry(RULES.attackRadius, 64), new THREE.MeshBasicMaterial({ color: '#ed592c', transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide }), telegraph, [0, 0.027, 0]);
warningDisk.rotation.x = -Math.PI / 2;
warningDisk.castShadow = false;
const countdownRing = ring(telegraph, '#ffe4a5', RULES.attackRadius, 0.065, 0.95);
countdownRing.position.y = 0.05;
telegraph.visible = false;
const effects = [];
let selectedHero = 'alex';
let game = createGame(selectedHero);
let mode = 'menu';
let paused = false;
let soundEnabled = true;
let audioContext;
let elapsedTime = 0;
let toastUntil = 0;
let lastToast = '';
let shake = 0;
const keys = new Set();
const input = { x: 0, z: 0, attack: false, dash: false };
let joystickPointer = null;
let attackPointer = null;
let joystick = { x: 0, z: 0 };
const cameraTarget = new THREE.Vector3();
const cameraDestination = new THREE.Vector3();

function tone(frequency, duration = 0.12, type = 'sine', volume = 0.035) {
  if (!soundEnabled || !audioContext) return;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(35, frequency * 0.45), audioContext.currentTime + duration);
  gain.gain.setValueAtTime(volume, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + duration);
}
function toast(message, duration = 2.2) {
  if (message === lastToast && elapsedTime < toastUntil) return;
  element('toast').textContent = message;
  element('toast').classList.add('show');
  lastToast = message;
  toastUntil = elapsedTime + duration;
}
function addEffect(object, life, update) {
  scene.add(object);
  effects.push({ object, life, total: life, update });
}
function burst(position, surface, count = 12) {
  for (let index = 0; index < count; index++) {
    const piece = rock(scene, surface, [position.x, position.y, position.z], [0.13, 0.13, 0.13]);
    const angle = random() * Math.PI * 2;
    const velocity = new THREE.Vector3(Math.cos(angle) * (2 + random() * 4), 2 + random() * 3, Math.sin(angle) * (2 + random() * 4));
    addEffect(piece, 0.6, (effect, delta, progress) => {
      effect.position.addScaledVector(velocity, delta);
      effect.position.y -= progress * 8 * delta;
      effect.scale.setScalar(0.15 * (1 - progress));
    });
  }
}
function lightning(event) {
  const origin = new THREE.Vector3(event.from.x + 0.5, 1.6, event.from.z);
  const destination = new THREE.Vector3(event.to.x, 3.4, event.to.z + 1);
  const points = [];
  for (let index = 0; index <= 12; index++) {
    const point = origin.clone().lerp(destination, index / 12);
    if (index > 0 && index < 12) point.add(new THREE.Vector3((random() - 0.5) * 1.1, (random() - 0.5) * 0.8, 0));
    points.push(point);
  }
  const effect = new THREE.Group();
  const curve = new THREE.CatmullRomCurve3(points);
  mesh(new THREE.TubeGeometry(curve, 30, 0.06, 4, false), teal, effect);
  mesh(new THREE.TubeGeometry(curve, 30, 0.022, 4, false), ivory, effect);
  addEffect(effect, 0.19, (object, delta, progress) => object.scale.setScalar(1 + Math.sin(progress * 30) * 0.007));
  tone(470, 0.15, 'sawtooth', 0.019);
}
function throwStone(event) {
  const effect = new THREE.Group();
  const boulder = rock(effect, stone, [0, 0, 0], [0.68, 0.7, 0.65]);
  const aura = ring(effect, '#d2a5ff', 0.95, 0.055, 0.9);
  const source = new THREE.Vector3(event.from.x - 1.25, 0.35, event.from.z + 0.2);
  effect.position.copy(source);
  addEffect(effect, 0.95, (object, delta, progress) => {
    boulder.rotation.y += delta * 4;
    aura.rotation.z += delta * 2;
    if (progress < 0.52) object.position.set(source.x, 0.35 + progress / 0.52 * 3.2, source.z);
    else {
      const flight = (progress - 0.52) / 0.48;
      object.position.set(THREE.MathUtils.lerp(source.x, game.guardian.x, flight), 3.55 + Math.sin(flight * Math.PI) * 1.4, THREE.MathUtils.lerp(source.z, game.guardian.z + 1, flight));
    }
  });
  tone(170, 0.48, 'sine', 0.045);
}
function handleEvent(event) {
  if (event.type === 'cast') {
    if (event.hero === 'alex') lightning(event);
    else throwStone(event);
  }
  if (event.type === 'hit') burst({ x: game.guardian.x, y: 3.5, z: game.guardian.z + 1.5 }, selectedHero === 'alex' ? teal : purple, 9);
  if (event.type === 'warning') { toast('它注意到你了……继续靠近将触发战斗'); tone(140, 0.25, 'triangle'); }
  if (event.type === 'engaged') { toast('守卫迎战！按住技能，离开红圈'); tone(90, 0.4, 'sawtooth', 0.03); }
  if (event.type === 'telegraph') { toast('快离开红圈！', 1.3); tone(290, 0.22, 'triangle'); }
  if (event.type === 'slam') {
    const shockwave = ring(scene, '#f69a52', RULES.attackRadius, 0.3, 0.9);
    shockwave.position.set(event.x, 0.15, event.z);
    addEffect(shockwave, 0.45, (object, delta, progress) => { object.scale.setScalar(1 + progress * 0.65); object.material.opacity = 1 - progress; });
    burst({ x: event.x, y: 0.4, z: event.z }, sand, 16);
    tone(65, 0.28, 'triangle', 0.08);
    shake = 0.14;
  }
  if (event.type === 'hurt') { toast('受到 28 点伤害 · 移动躲开下一击'); shake = 0.28; }
  if (event.type === 'dodged') toast('躲开了！继续反击', 1.3);
  if (event.type === 'outOfRange') toast('靠近洞口领地，再释放技能', 1.5);
  if (event.type === 'retreat') toast('已离开领地 · 守卫回到洞口并恢复生命', 3);
  if (event.type === 'dash') tone(210, 0.15, 'sine');
  if (event.type === 'cleared') {
    toast('守卫倒下！获得 8 颗水晶 · 进入发光洞口', 5);
    tone(660, 0.5, 'triangle');
    for (let index = 0; index < 22; index++) burst({ x: (random() - 0.5) * 8, y: 3 + random() * 4, z: -13 }, gold, 2);
  }
  if (event.type === 'lost' || event.type === 'won') showResult(event.type === 'won');
}
function clearControls() {
  keys.clear();
  joystick = { x: 0, z: 0 };
  joystickPointer = null;
  attackPointer = null;
  input.attack = false;
  input.dash = false;
  input.x = 0;
  input.z = 0;
  element('stick').style.transform = 'translate(0px,0px)';
}
function clearEffects() {
  for (const effect of effects) {
    scene.remove(effect.object);
    effect.object.traverse(object => { if (object.geometry) object.geometry.dispose(); });
  }
  effects.length = 0;
}
function startGame() {
  clearControls();
  clearEffects();
  game = createGame(selectedHero);
  mode = 'game';
  paused = false;
  gate.visible = true;
  element('menu').hidden = true;
  element('result').hidden = true;
  element('pause-menu').hidden = true;
  element('hud').hidden = false;
  element('vignette').style.background = 'radial-gradient(ellipse at center,transparent 45%,#12353520)';
  element('hero-name').textContent = HEROES[selectedHero].name;
  element('portrait').textContent = selectedHero === 'alex' ? 'ϟ' : '◈';
  element('portrait').style.background = selectedHero === 'alex' ? '#f9cf77' : '#d6b3f1';
  element('attack-icon').textContent = selectedHero === 'alex' ? 'ϟ' : '◈';
  element('attack-name').textContent = selectedHero === 'alex' ? '电能脉冲' : '悬浮投石';
  element('attack').style.background = selectedHero === 'alex' ? '#f8cc77' : '#d4b6ef';
  camera.position.set(0, 5.6, game.player.z + 10);
  if (!audioContext) {
    const AudioConstructor = window.AudioContext || window.webkitAudioContext;
    if (AudioConstructor) audioContext = new AudioConstructor();
  }
  audioContext?.resume().catch(() => {});
  toast('上岸了！推动左侧摇杆，沿光点前进', 4);
}
function showResult(won) {
  clearControls();
  element('result').hidden = false;
  element('result-symbol').textContent = won ? '✦' : '↻';
  element('result-kicker').textContent = won ? 'CHAPTER COMPLETE' : 'TRY AGAIN, EXPLORER';
  element('result-title').textContent = won ? '通往雨林的路，打开了！' : '休息一下，再次出发';
  element('result-copy').textContent = won ? '海滩关完成，获得 8 颗水晶。装有 100 颗水晶的宝箱还在远方的城堡里，下一段冒险等待开启。' : '三头守卫的重踏很强，但红圈会提前告诉你落点。保持移动，走出红圈再反击。';
  element('result-stats').textContent = `${HEROES[selectedHero].name} · 命中 ${game.stats.hits} 次 · 躲开 ${game.stats.dodges} 次 · ${Math.round(game.time)} 秒`;
}
function toMenu() {
  clearControls();
  clearEffects();
  game = createGame(selectedHero);
  mode = 'menu';
  paused = false;
  element('menu').hidden = false;
  element('hud').hidden = true;
  element('result').hidden = true;
  element('pause-menu').hidden = true;
  element('vignette').style.background = '';
}
function togglePause(force) {
  if (mode !== 'game' || !['playing', 'cleared'].includes(game.phase)) return;
  paused = typeof force === 'boolean' ? force : !paused;
  clearControls();
  element('pause-menu').hidden = !paused;
}
document.querySelectorAll('[data-hero]').forEach(button => button.addEventListener('click', () => {
  selectedHero = button.dataset.hero;
  document.querySelectorAll('[data-hero]').forEach(card => {
    card.classList.toggle('selected', card === button);
    card.setAttribute('aria-pressed', String(card === button));
  });
}));
element('start').addEventListener('click', startGame);
element('restart').addEventListener('click', startGame);
element('change-hero').addEventListener('click', toMenu);
element('pause-change').addEventListener('click', toMenu);
element('pause').addEventListener('click', () => togglePause());
element('resume').addEventListener('click', () => togglePause(false));
element('sound').addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  element('sound').textContent = soundEnabled ? '♪' : '×';
  element('sound').setAttribute('aria-label', soundEnabled ? '关闭声音' : '开启声音');
});
window.addEventListener('keydown', event => {
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight'].includes(event.code)) event.preventDefault();
  if (event.code === 'Escape' && !event.repeat) togglePause();
  if (mode === 'game' && !paused) keys.add(event.code);
});
window.addEventListener('keyup', event => keys.delete(event.code));
window.addEventListener('blur', () => { clearControls(); togglePause(true); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { clearControls(); togglePause(true); } });
const joystickElement = element('joystick');
function moveStick(event) {
  const bounds = joystickElement.getBoundingClientRect();
  let offsetX = event.clientX - bounds.left - bounds.width / 2;
  let offsetZ = event.clientY - bounds.top - bounds.height / 2;
  const radius = bounds.width * 0.3;
  const length = Math.hypot(offsetX, offsetZ);
  if (length > radius) { offsetX *= radius / length; offsetZ *= radius / length; }
  joystick.x = offsetX / radius;
  joystick.z = offsetZ / radius;
  element('stick').style.transform = `translate(${offsetX}px,${offsetZ}px)`;
}
joystickElement.addEventListener('pointerdown', event => {
  if (joystickPointer !== null) return;
  event.preventDefault();
  joystickPointer = event.pointerId;
  joystickElement.setPointerCapture(event.pointerId);
  moveStick(event);
});
joystickElement.addEventListener('pointermove', event => { if (event.pointerId === joystickPointer) moveStick(event); });
function releaseStick(event) {
  if (event.pointerId !== joystickPointer) return;
  joystickPointer = null;
  joystick = { x: 0, z: 0 };
  element('stick').style.transform = 'translate(0px,0px)';
}
for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) joystickElement.addEventListener(type, releaseStick);
element('attack').addEventListener('pointerdown', event => {
  if (attackPointer !== null) return;
  event.preventDefault();
  attackPointer = event.pointerId;
  element('attack').setPointerCapture(event.pointerId);
  input.attack = true;
});
for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) element('attack').addEventListener(type, event => {
  if (event.pointerId !== attackPointer) return;
  attackPointer = null;
  input.attack = false;
});
element('dash').addEventListener('pointerdown', event => { event.preventDefault(); input.dash = true; });
window.addEventListener('contextmenu', event => event.preventDefault());

function updateUI() {
  element('player-hp').textContent = `${game.player.hp} / ${RULES.playerHealth}`;
  element('player-fill').style.width = `${game.player.hp}%`;
  element('boss-panel').hidden = ['idle', 'defeated'].includes(game.guardian.state);
  element('boss-hp').textContent = `${game.guardian.hp} / ${RULES.guardianHealth}`;
  element('boss-fill').style.width = `${game.guardian.hp / RULES.guardianHealth * 100}%`;
  const states = { idle: '守望洞口', warning: '警戒 · 请小心', chase: '进入战斗', windup: '重踏预警！', recover: '反击机会', returning: '返回领地', defeated: '已击败' };
  element('boss-state').textContent = states[game.guardian.state];
  element('crystals').textContent = game.reward;
  element('objective-text').textContent = game.phase === 'cleared' || game.phase === 'won' ? '道路已打开！走进发光洞口' : game.guardian.state === 'idle' ? '沿着光点，走向山洞' : game.guardian.state === 'warning' ? '准备好后，进入守卫领地' : '移动躲红圈 · 按住技能反击';
  element('attack-timer').textContent = game.player.cooldown > 0 ? `${game.player.cooldown.toFixed(1)} 秒` : '按住释放';
  element('cooldown').style.height = `${game.player.cooldown / HEROES[selectedHero].cooldown * 100}%`;
  element('dash-timer').textContent = game.player.dashCooldown > 0 ? game.player.dashCooldown.toFixed(1) : '';
  element('damage-flash').style.opacity = game.player.flash > 0 ? game.player.flash * 1.5 : 0;
}
function resize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}
window.addEventListener('resize', resize);
canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); togglePause(true); element('load-error').hidden = false; });
resize();
let previousTime = performance.now();
let renderedFrames = 0;
function animate(now) {
  requestAnimationFrame(animate);
  const delta = Math.min((now - previousTime) / 1000, 0.05);
  previousTime = now;
  elapsedTime += delta;
  renderedFrames++;
  const active = mode === 'game' && !paused;
  if (active) {
    const movementX = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
    const movementZ = (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0);
    step(game, delta, { x: movementX || joystick.x, z: movementZ || joystick.z, attack: input.attack || keys.has('Space'), dash: input.dash || keys.has('ShiftLeft') || keys.has('ShiftRight') });
    input.dash = false;
    for (const event of game.events) handleEvent(event);
    updateUI();
  }
  const animationTime = paused ? game.time : elapsedTime;
  for (const [name, hero] of Object.entries(heroes)) {
    hero.group.visible = mode === 'menu' || name === selectedHero;
    if (mode === 'menu') {
      hero.group.position.set(name === 'alex' ? 7 : 9.5, 0, 11);
      hero.group.rotation.y = 0.3;
    } else {
      hero.group.position.set(game.player.x, 0, game.player.z);
      const angle = game.player.facing - hero.group.rotation.y;
      hero.group.rotation.y += Math.atan2(Math.sin(angle), Math.cos(angle)) * Math.min(1, delta * 16);
    }
    const moving = active && (keys.size > 0 || Math.hypot(joystick.x, joystick.z) > 0.1) && ['playing', 'cleared'].includes(game.phase);
    for (let index = 0; index < hero.legs.length; index++) {
      hero.legs[index].rotation.x = moving ? Math.sin(animationTime * 14 + index * Math.PI) * 0.65 : 0;
      hero.arms[index].rotation.x = moving ? -Math.sin(animationTime * 14 + index * Math.PI) * 0.5 : Math.sin(animationTime * 2) * 0.08;
    }
    if (game.player.cooldown > HEROES[selectedHero].cooldown * 0.75 && name === selectedHero && mode === 'game') hero.arms[1].rotation.x = -1.1;
    for (let index = 0; index < hero.accents.children.length; index++) hero.accents.children[index].position.set(Math.cos(animationTime * 1.6 + index * 2.1) * 1.1, 1.5 + Math.sin(animationTime * 2 + index) * 0.35, Math.sin(animationTime * 1.6 + index * 2.1) * 1.1);
    hero.group.visible &&= !(game.player.flash > 0 && Math.floor(animationTime * 24) % 2 === 0);
  }
  guardian.position.set(game.guardian.x, 0, game.guardian.z);
  const guardianAngle = ['idle', 'returning', 'defeated'].includes(game.guardian.state) ? 0 : Math.atan2(game.player.x - game.guardian.x, game.player.z - game.guardian.z);
  guardian.rotation.y = THREE.MathUtils.lerp(guardian.rotation.y, guardianAngle, Math.min(1, delta * 3));
  guardian.rotation.z = THREE.MathUtils.lerp(guardian.rotation.z, game.guardian.state === 'defeated' ? -1.35 : 0, delta * 3);
  guardian.position.y = game.guardian.state === 'defeated' ? -0.5 : game.guardian.state === 'windup' ? Math.sin((1 - game.guardian.timer / RULES.windup) * Math.PI / 2) * 0.9 : 0;
  body.scale.y = 2.05 + Math.sin(animationTime * 1.7) * 0.055;
  for (let index = 0; index < heads.length; index++) {
    heads[index].rotation.x = game.guardian.state === 'windup' ? -0.28 : Math.sin(animationTime * 1.4 + index) * 0.05;
    heads[index].rotation.z = Math.sin(animationTime * 1.1 + index * 2) * 0.04;
  }
  for (let index = 0; index < bossLegs.length; index++) bossLegs[index].rotation.x = game.guardian.state === 'chase' ? Math.sin(animationTime * 6 + index * Math.PI) * 0.2 : 0;
  tail.rotation.y = Math.sin(animationTime * 1.3) * 0.28;
  guardianMat.emissive.set(game.guardian.flash > 0 ? '#f3ae84' : '#000000');
  guardianMat.emissiveIntensity = game.guardian.flash > 0 ? 0.65 : 0;
  guardianEyes.color.set(game.guardian.state === 'windup' ? '#ff542e' : '#ffd77a');
  gate.visible = game.guardian.hp > 0;
  lock.rotation.y = Math.sin(animationTime) * 0.2;
  exitGlow.visible = game.guardian.hp <= 0;
  exitGlow.material.opacity = 0.55 + Math.sin(animationTime * 3) * 0.3;
  telegraph.visible = game.guardian.state === 'windup' && Boolean(game.guardian.target);
  if (telegraph.visible) {
    telegraph.position.set(game.guardian.target.x, 0, game.guardian.target.z);
    warningDisk.material.opacity = 0.22 + Math.sin(animationTime * 18) * 0.08;
    countdownRing.scale.setScalar(Math.max(0.02, game.guardian.timer / RULES.windup));
  }
  boundary.material.opacity = game.guardian.state === 'warning' ? 0.65 : 0.16;
  for (let index = 0; index < pathDots.length; index++) pathDots[index].position.y = 0.12 + Math.sin(animationTime * 2 - index * 0.8) * 0.06;
  boat.position.y = Math.sin(animationTime * 1.2) * 0.055;
  boat.rotation.z = Math.sin(animationTime * 0.8) * 0.01;
  for (let index = 0; index < waves.length; index++) waves[index].position.z += Math.sin(animationTime * 0.4 + index) * delta * 0.15;
  if (!paused) {
    for (let index = effects.length - 1; index >= 0; index--) {
      const effect = effects[index];
      effect.life -= delta;
      effect.update(effect.object, delta, 1 - effect.life / effect.total);
      if (effect.life <= 0) {
        scene.remove(effect.object);
        effect.object.traverse(object => { if (object.geometry) object.geometry.dispose(); });
        if (effect.object.material?.isMeshBasicMaterial) effect.object.material.dispose();
        effects.splice(index, 1);
      }
    }
  }
  if (mode === 'menu') {
    cameraDestination.set(24 + Math.sin(elapsedTime * 0.055) * 1.5, 15, 30);
    cameraTarget.set(0, 2.7, -7);
    camera.position.lerp(cameraDestination, 0.04);
  } else {
    cameraDestination.set(game.player.x, 5.6, game.player.z + (camera.aspect < 0.8 ? 12 : 10));
    camera.position.lerp(cameraDestination, Math.min(1, delta * 8));
    cameraTarget.set(game.player.x * 0.95, 2.2, game.player.z - 6);
  }
  if (shake > 0 && !paused) { camera.position.x += (random() - 0.5) * shake; camera.position.y += (random() - 0.5) * shake; shake = Math.max(0, shake - delta); }
  camera.lookAt(cameraTarget);
  if (elapsedTime > toastUntil) element('toast').classList.remove('show');
  renderer.render(scene, camera);
}
camera.position.set(24, 15, 30);
element('start').disabled = false;
element('start').textContent = '启程，上岛探险  →';
window.__island = Object.freeze({ snapshot: () => ({ hero: selectedHero, mode, paused, phase: game.phase, time: game.time, player: { ...game.player }, guardian: { ...game.guardian, target: game.guardian.target ? { ...game.guardian.target } : null }, stats: { ...game.stats }, reward: game.reward, renderedFrames, drawCalls: renderer.info.render.calls, effects: effects.length }) });
requestAnimationFrame(animate);
