import * as THREE from 'three';
import { CFG, SKILLS, applyDamage, nextMonsterState, chaseStepAllowed, slamHits, skillCanFire, shouldAimTarget } from './combat.mjs';

const $ = (id) => document.getElementById(id);

/* ---------- 渲染基础 ---------- */
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
$('app').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87c5ea);
scene.fog = new THREE.Fog(0x87c5ea, 50, 120);

const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 300);
camera.position.set(0, 5, 28);

scene.add(new THREE.HemisphereLight(0xbfe3ff, 0xd9b98c, 0.95));
const sun = new THREE.DirectionalLight(0xffffff, 1.25);
sun.position.set(12, 22, 10);
scene.add(sun);

const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25 });

/* ---------- 世界 ---------- */
function buildWorld() {
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(220, 110), new THREE.MeshLambertMaterial({ color: 0xe8d29a }));
  sand.rotation.x = -Math.PI / 2; sand.position.set(0, 0, 5);
  scene.add(sand);

  const water = new THREE.Mesh(new THREE.PlaneGeometry(220, 80), new THREE.MeshLambertMaterial({ color: 0x2f86c9 }));
  water.rotation.x = -Math.PI / 2; water.position.set(0, -0.25, 85);
  scene.add(water);

  const jungleFloor = new THREE.Mesh(new THREE.PlaneGeometry(220, 60), new THREE.MeshLambertMaterial({ color: 0x2f6b34 }));
  jungleFloor.rotation.x = -Math.PI / 2; jungleFloor.position.set(0, 0.02, -46);
  scene.add(jungleFloor);

  // 船
  const boat = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.1, 7.5), new THREE.MeshLambertMaterial({ color: 0x7a4a22 }));
  hull.position.y = 0.45;
  const deck = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.15, 7), new THREE.MeshLambertMaterial({ color: 0xa9713b }));
  deck.position.y = 1.05;
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 4.4), new THREE.MeshLambertMaterial({ color: 0x5a371a }));
  mast.position.y = 3.2;
  const sail = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.6), new THREE.MeshLambertMaterial({ color: 0xf2f2f2, side: THREE.DoubleSide }));
  sail.position.set(0, 3.4, 0.05);
  boat.add(hull, deck, mast, sail);
  boat.position.set(5.5, 0, 21.5);
  boat.rotation.y = 0.5;
  scene.add(boat);

  // 岩壁与山洞（洞口在 x∈[-2,2]，z=-14）
  const rockMat = new THREE.MeshLambertMaterial({ color: 0x6e6257 });
  const wallL = new THREE.Mesh(new THREE.BoxGeometry(28, 7, 2.4), rockMat); wallL.position.set(-16, 3.5, -14);
  const wallR = new THREE.Mesh(new THREE.BoxGeometry(28, 7, 2.4), rockMat); wallR.position.set(16, 3.5, -14);
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(6.5, 2.2, 2.4), rockMat); lintel.position.set(0, 6.1, -14);
  scene.add(wallL, wallR, lintel);
  const blockMat = new THREE.MeshLambertMaterial({ color: 0x584e45 });
  const blockRock = new THREE.Mesh(new THREE.DodecahedronGeometry(2.3), blockMat);
  blockRock.position.set(0, 2.3, -14);
  scene.add(blockRock);
  window.__caveBlock = blockRock;

  // 雨林树（背景）
  const treeMat = new THREE.MeshLambertMaterial({ color: 0x1f5427 });
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x5a371a });
  for (let i = 0; i < 16; i++) {
    const g = new THREE.Group();
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 3), trunkMat); t.position.y = 1.5;
    const c = new THREE.Mesh(new THREE.ConeGeometry(1.9, 3.4, 7), treeMat); c.position.y = 4;
    g.add(t, c);
    const x = -26 + Math.random() * 52;
    const z = -17 - Math.random() * 16;
    g.position.set(x, 0, z);
    g.scale.setScalar(0.8 + Math.random() * 0.8);
    scene.add(g);
  }

  // 海滩棕榈
  for (let i = 0; i < 6; i++) {
    const g = new THREE.Group();
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 3.6, 7), trunkMat); t.position.y = 1.8;
    t.rotation.z = (Math.random() - 0.5) * 0.25;
    const top = new THREE.Mesh(new THREE.SphereGeometry(1.3, 8, 6), new THREE.MeshLambertMaterial({ color: 0x3e8c3a }));
    top.scale.set(1, 0.45, 1); top.position.y = 3.7;
    g.add(t, top);
    const side = i % 2 === 0 ? -1 : 1;
    g.position.set(side * (9 + Math.random() * 12), 0, 2 + Math.random() * 16);
    scene.add(g);
  }

  // 散石
  for (let i = 0; i < 10; i++) {
    const r = new THREE.Mesh(new THREE.DodecahedronGeometry(0.35 + Math.random() * 0.5),
      new THREE.MeshLambertMaterial({ color: 0x8f8577 }));
    r.position.set(-20 + Math.random() * 40, 0.3, -4 + Math.random() * 22);
    scene.add(r);
  }
}
buildWorld();

/* ---------- 角色 ---------- */
const CHARS = {
  alex: {
    name: 'Alex ⚡', skillLabel: '⚡ 电击', bodyColor: 0x2f7fd8, accent: 0xffd94a,
    boltMat: new THREE.MeshBasicMaterial({ color: 0xffe94a }),
    boltGeo: new THREE.BoxGeometry(0.22, 0.22, 1.4),
  },
  victory: {
    name: 'Victory 🌀', skillLabel: '🪨 悬浮石', bodyColor: 0x7b4fd8, accent: 0xc0a0ff,
    boltMat: new THREE.MeshLambertMaterial({ color: 0x7d6a55 }),
    boltGeo: new THREE.DodecahedronGeometry(0.5),
  },
};

let charKey = null;
let player = null; // { group, mesh }

function buildPlayerMesh(key) {
  const c = CHARS[key];
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.55, 1.25, 12),
    new THREE.MeshLambertMaterial({ color: c.bodyColor }));
  body.position.y = 1.0;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.38, 16, 12),
    new THREE.MeshLambertMaterial({ color: 0xffd7a8 }));
  head.position.y = 1.95;
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.14, 0.3),
    new THREE.MeshBasicMaterial({ color: c.accent }));
  visor.position.set(0, 2.0, 0.3);
  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.3),
    new THREE.MeshLambertMaterial({ color: c.accent }));
  pack.position.set(0, 1.15, -0.45);
  const sh = new THREE.Mesh(new THREE.CircleGeometry(0.7, 20), shadowMat);
  sh.rotation.x = -Math.PI / 2; sh.position.y = 0.02;
  g.add(body, head, visor, pack, sh);
  return g;
}

/* ---------- 守卫 ---------- */
const monster = { group: null, skin: null, alive: true, state: 'idle', slamT: 0, slamCd: 0, slamCenter: null, flashT: 0, bobT: 0 };

function buildMonster() {
  const g = new THREE.Group();
  const skin = new THREE.MeshLambertMaterial({ color: 0x8c2f2f, emissive: 0x440000, emissiveIntensity: 0 });
  monster.skin = skin;
  const body = new THREE.Mesh(new THREE.SphereGeometry(2.3, 18, 14), skin);
  body.scale.set(1.15, 1, 1.25); body.position.y = 2.4;
  g.add(body);
  const headPos = [[0, 4.15, 1.35], [-1.35, 3.9, 0.7], [1.35, 3.9, 0.7]];
  for (const [hx, hy, hz] of headPos) {
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.38, 1.6, 8), skin);
    neck.position.set(hx * 0.55, hy - 0.95, hz * 0.6);
    neck.lookAt(new THREE.Vector3(hx, hy, hz));
    neck.rotateX(Math.PI / 2);
    g.add(neck);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.92, 14, 10), skin);
    head.position.set(hx, hy, hz);
    g.add(head);
    for (const s of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6),
        new THREE.MeshBasicMaterial({ color: 0xffe94a }));
      eye.position.set(hx + s * 0.34, hy + 0.12, hz + 0.82);
      g.add(eye);
    }
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.55, 6),
      new THREE.MeshLambertMaterial({ color: 0xe8dcc8 }));
    horn.position.set(hx, hy + 0.95, hz - 0.1);
    g.add(horn);
  }
  for (const s of [[-1.4, -1.6], [1.4, -1.6], [-1.4, 1.4], [1.4, 1.4]]) {
    const leg = new THREE.Mesh(new THREE.ConeGeometry(0.55, 2.2, 8), skin);
    leg.position.set(s[0], 1.0, s[1]); leg.rotation.x = Math.PI;
    g.add(leg);
  }
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.5, 2.6, 8), skin);
  tail.position.set(0, 2.4, -2.9); tail.rotation.x = Math.PI / 2 + 0.35;
  g.add(tail);
  const sh = new THREE.Mesh(new THREE.CircleGeometry(3.1, 24), shadowMat);
  sh.rotation.x = -Math.PI / 2; sh.position.y = 0.03;
  g.add(sh);
  g.position.set(0, 0, CFG.guardHomeZ);
  scene.add(g);
  monster.group = g;
}
buildMonster();

// 范围攻击预警圈
const slamRing = new THREE.Mesh(
  new THREE.CircleGeometry(CFG.slamRadius, 28),
  new THREE.MeshBasicMaterial({ color: 0xff3020, transparent: true, opacity: 0.35, side: THREE.DoubleSide })
);
slamRing.rotation.x = -Math.PI / 2; slamRing.position.y = 0.08; slamRing.visible = false;
scene.add(slamRing);

/* ---------- 状态 ---------- */
const S = {
  phase: 'select', // select | play | winAnim | open | collect | complete | defeat
  playerHP: CFG.playerHP,
  monsterHP: CFG.monsterHP,
  crystals: 0,
  caveOpen: false,
  t: 0,
};

const projectiles = [];
const crystals = [];

/* ---------- 输入 ---------- */
const keys = {};
addEventListener('keydown', (e) => { keys[e.key.toLowerCase()] = true; if (['j', ' '].includes(e.key.toLowerCase())) doSkill(); });
addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });

const joy = { active: false, id: null, ox: 0, oy: 0, x: 0, y: 0 };
const joyBase = $('joyBase'), joyKnob = $('joyKnob');
const touchLayer = $('touchLayer');

touchLayer.addEventListener('pointerdown', (e) => {
  if (S.phase !== 'play' || joy.active) return;
  if (e.clientX > window.innerWidth * 0.6) return; // 右侧留给技能按钮
  joy.active = true; joy.id = e.pointerId; joy.ox = e.clientX; joy.oy = e.clientY; joy.x = 0; joy.y = 0;
  joyBase.style.display = joyKnob.style.display = 'block';
  joyBase.style.left = (e.clientX - 55) + 'px'; joyBase.style.top = (e.clientY - 55) + 'px';
  joyKnob.style.left = (e.clientX - 24) + 'px'; joyKnob.style.top = (e.clientY - 24) + 'px';
  touchLayer.setPointerCapture(e.pointerId);
});
touchLayer.addEventListener('pointermove', (e) => {
  if (!joy.active || e.pointerId !== joy.id) return;
  let dx = e.clientX - joy.ox, dy = e.clientY - joy.oy;
  const len = Math.hypot(dx, dy);
  if (len > 55) { dx = dx / len * 55; dy = dy / len * 55; }
  joy.x = dx / 55; joy.y = dy / 55;
  joyKnob.style.left = (joy.ox + dx - 24) + 'px'; joyKnob.style.top = (joy.oy + dy - 24) + 'px';
});
const joyEnd = (e) => {
  if (!joy.active || e.pointerId !== joy.id) return;
  joy.active = false; joy.x = joy.y = 0;
  joyBase.style.display = joyKnob.style.display = 'none';
};
touchLayer.addEventListener('pointerup', joyEnd);
touchLayer.addEventListener('pointercancel', joyEnd);

$('btnSkill').addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); doSkill(); });

/* ---------- 技能 ---------- */
let skillCd = 0;
function doSkill() {
  if (S.phase !== 'play' || !player || !skillCanFire(skillCd)) return;
  const sk = SKILLS[charKey];
  skillCd = sk.cd;
  const from = player.group.position.clone().add(new THREE.Vector3(0, 1.5, 0));
  let dir;
  const toMonster = monster.group.position.clone().add(new THREE.Vector3(0, 2.4, 0));
  if (shouldAimTarget(monster.alive, from.distanceTo(toMonster))) {
    dir = toMonster.clone().sub(from).normalize();
    player.group.rotation.y = Math.atan2(dir.x, dir.z);
  } else {
    dir = new THREE.Vector3(Math.sin(player.group.rotation.y), 0, Math.cos(player.group.rotation.y));
  }
  const c = CHARS[charKey];
  const mesh = new THREE.Mesh(c.boltGeo, c.boltMat);
  mesh.position.copy(from);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
  scene.add(mesh);
  projectiles.push({ mesh, vel: dir.clone().multiplyScalar(sk.speed), dmg: sk.dmg, life: 2.5 });
}

/* ---------- 伤害与反馈 ---------- */
function dmgText(pos, txt, color) {
  const v = pos.clone().project(camera);
  const x = (v.x * 0.5 + 0.5) * window.innerWidth;
  const y = (-v.y * 0.5 + 0.5) * window.innerHeight;
  const d = document.createElement('div');
  d.className = 'dmg'; d.textContent = txt;
  d.style.left = x + 'px'; d.style.top = y + 'px'; d.style.color = color;
  $('dmgLayer').appendChild(d);
  setTimeout(() => d.remove(), 950);
}

function flashScreen() {
  const f = $('flash');
  f.style.opacity = 0.35;
  setTimeout(() => { f.style.opacity = 0; }, 90);
}

function setHint(t) {
  const h = $('hint');
  h.style.opacity = 0;
  setTimeout(() => { h.textContent = t; h.style.opacity = 1; }, 180);
}

function hitMonster(dmg) {
  if (!monster.alive) return;
  S.monsterHP = applyDamage(S.monsterHP, dmg);
  monster.flashT = 0.12;
  dmgText(monster.group.position.clone().add(new THREE.Vector3(0, 5, 0)), '-' + dmg, '#ffe94a');
  updateHUD();
  if (S.monsterHP <= 0) killMonster();
}

function damagePlayer(dmg) {
  if (S.phase !== 'play') return;
  S.playerHP = applyDamage(S.playerHP, dmg);
  flashScreen();
  dmgText(player.group.position.clone().add(new THREE.Vector3(0, 2.6, 0)), '-' + dmg, '#ff6050');
  updateHUD();
  if (S.playerHP <= 0) {
    S.phase = 'defeat';
    setTimeout(() => { $('defeat').hidden = false; $('hud').hidden = true; }, 700);
  }
}

function killMonster() {
  monster.alive = false;
  S.phase = 'winAnim'; S.t = 1.5;
  slamRing.visible = false;
  setHint('💥 守卫被击败了！');
}

/* ---------- 更新 ---------- */
function inputVec() {
  let x = joy.x, y = joy.y;
  if (keys['w'] || keys['arrowup']) y -= 1;
  if (keys['s'] || keys['arrowdown']) y += 1;
  if (keys['a'] || keys['arrowleft']) x -= 1;
  if (keys['d'] || keys['arrowright']) x += 1;
  const v = new THREE.Vector3(x, 0, y);
  return v.length() > 1 ? v.normalize() : v;
}

function clampBounds(p) {
  p.x = Math.max(-24, Math.min(24, p.x));
  const zMin = S.caveOpen ? -18 : -6.5;
  p.z = Math.max(zMin, Math.min(24, p.z));
}

function updatePlayer(dt) {
  const v = inputVec();
  if (v.lengthSq() > 0.001) {
    player.group.position.addScaledVector(v, CFG.playerSpeed * dt);
    player.group.rotation.y = Math.atan2(v.x, v.z);
    player.walkT = (player.walkT || 0) + dt * 10;
    player.group.children[0].position.y = 1.0 + Math.abs(Math.sin(player.walkT)) * 0.08;
  }
  clampBounds(player.group.position);
  // 与守卫不重叠
  const d = player.group.position.distanceTo(monster.group.position);
  if (monster.alive && d < 3.2) {
    const push = player.group.position.clone().sub(monster.group.position).setY(0).normalize().multiplyScalar((3.2 - d));
    player.group.position.add(push);
  }
}

const tmpV = new THREE.Vector3();
function updateMonster(dt) {
  if (!monster.alive) return;
  const mp = monster.group.position;
  const pp = player ? player.group.position : mp;
  tmpV.copy(mp).setY(0);
  const distHome = tmpV.distanceTo(new THREE.Vector3(0, 0, CFG.guardHomeZ));
  const distP = tmpV.distanceTo(tmpV.clone().copy(pp).setY(0));

  const prev = monster.state;
  monster.state = nextMonsterState(monster.state, { distToPlayer: distP, distToHome: distHome });
  if (monster.state !== prev) {
    if (monster.state === 'warn' && prev === 'idle') setHint('⚠️ 守卫在警戒——不要靠近山洞！');
    if (monster.state === 'chase') setHint('⚔️ 战斗开始！跑开躲避红色预警圈！');
  }

  monster.bobT += dt;
  monster.group.children[0].position.y = 2.4 + Math.sin(monster.bobT * 2) * 0.08;

  if (monster.flashT > 0) {
    monster.flashT -= dt;
    monster.skin.emissive.setHex(0xffffff); monster.skin.emissiveIntensity = 0.7;
  } else if (monster.state === 'warn' || monster.state === 'chase') {
    monster.skin.emissive.setHex(0x660000);
    monster.skin.emissiveIntensity = 0.5 + Math.sin(monster.bobT * 8) * 0.3;
  } else {
    monster.skin.emissive.setHex(0x330000); monster.skin.emissiveIntensity = 0.1;
  }

  const face = Math.atan2(pp.x - mp.x, pp.z - mp.z);
  if (monster.state === 'warn' || monster.state === 'chase') monster.group.rotation.y = face;

  if (chaseStepAllowed(monster.state, distHome) && distP > CFG.chaseStopDist) {
    const dir = new THREE.Vector3().subVectors(pp, mp).setY(0).normalize();
    mp.addScaledVector(dir, CFG.monsterSpeed * dt);
  }
  if (monster.state === 'return') {
    const dir = new THREE.Vector3(0, 0, CFG.guardHomeZ).sub(mp).setY(0).normalize();
    mp.addScaledVector(dir, CFG.monsterSpeed * dt);
  }

  // 范围攻击
  monster.slamCd = Math.max(0, monster.slamCd - dt);
  if (monster.slamT > 0) {
    monster.slamT -= dt;
    slamRing.position.x = monster.slamCenter.x;
    slamRing.position.z = monster.slamCenter.z;
    slamRing.material.opacity = 0.3 + Math.abs(Math.sin(performance.now() / 90)) * 0.3;
    if (monster.slamT <= 0) {
      slamRing.visible = false;
      // 冲击波特效
      const wave = new THREE.Mesh(new THREE.RingGeometry(0.5, 1.2, 26),
        new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, opacity: 0.8, side: THREE.DoubleSide }));
      wave.rotation.x = -Math.PI / 2;
      wave.position.set(monster.slamCenter.x, 0.1, monster.slamCenter.z);
      scene.add(wave);
      let wt = 0;
      const iv = setInterval(() => {
        wt += 0.05;
        wave.scale.setScalar(1 + wt * 8);
        wave.material.opacity = Math.max(0, 0.8 - wt * 1.6);
        if (wt > 0.5) { clearInterval(iv); scene.remove(wave); }
      }, 50);
      const pd = tmpV.copy(pp).setY(0).distanceTo(tmpV.clone().setY(0).setX(monster.slamCenter.x).setZ(monster.slamCenter.z));
      if (slamHits(pd)) damagePlayer(CFG.slamDmg);
    }
  } else if (monster.state === 'chase' && distP <= CFG.slamRange && skillCanFire(monster.slamCd)) {
    monster.slamT = CFG.telegraph;
    monster.slamCenter = mp.clone();
    slamRing.visible = true;
  }
}

function updateProjectiles(dt) {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    p.mesh.position.addScaledVector(p.vel, dt);
    p.life -= dt;
    let hit = false;
    if (monster.alive) {
      const target = monster.group.position.clone().add(new THREE.Vector3(0, 2.6, 0));
      if (p.mesh.position.distanceTo(target) < 2.8) { hit = true; hitMonster(p.dmg); }
    }
    if (hit || p.life <= 0) { scene.remove(p.mesh); projectiles.splice(i, 1); }
  }
}

function updateWin(dt) {
  S.t -= dt;
  monster.group.scale.y = Math.max(0.1, monster.group.scale.y - dt * 0.7);
  monster.group.position.y -= dt * 1.4;
  if (S.t <= 0) {
    monster.group.visible = false;
    S.phase = 'open'; S.t = 1.4;
    setHint('🎉 洞口正在打开……');
  }
}

function updateOpen(dt) {
  S.t -= dt;
  window.__caveBlock.position.y += dt * 4.5;
  if (S.t <= 0) {
    S.caveOpen = true;
    S.phase = 'collect';
    for (let i = -1; i <= 1; i++) spawnCrystal(i * 1.7, -11.2);
    setHint('💎 洞口打开了！收集水晶！');
    updateHUD();
  }
}

function spawnCrystal(x, z) {
  const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.55),
    new THREE.MeshLambertMaterial({ color: 0x37e6ff, emissive: 0x0a4a5a, emissiveIntensity: 0.6 }));
  m.position.set(x, 1, z);
  scene.add(m);
  crystals.push({ mesh: m, t: Math.random() * 6 });
}

function updateCrystals(dt) {
  for (let i = crystals.length - 1; i >= 0; i--) {
    const c = crystals[i];
    c.t += dt;
    c.mesh.rotation.y += dt * 2;
    const pp = player.group.position;
    const d = c.mesh.position.distanceTo(pp);
    if (d < CFG.crystalMagnetR) {
      const dir = new THREE.Vector3(pp.x, 1, pp.z).sub(c.mesh.position).normalize();
      c.mesh.position.addScaledVector(dir, (CFG.crystalMagnetR - d) * dt * 4);
    }
    if (d < CFG.crystalPickupR || c.mesh.position.distanceTo(new THREE.Vector3(pp.x, 1, pp.z)) < CFG.crystalPickupR) {
      scene.remove(c.mesh); crystals.splice(i, 1);
      S.crystals++; updateHUD();
      if (S.crystals >= CFG.crystalCount) {
        S.phase = 'complete';
        setTimeout(() => {
          $('finalCrystals').textContent = S.crystals;
          $('complete').hidden = false; $('hud').hidden = true;
        }, 500);
      }
    }
  }
}

function updateCamera(dt) {
  const target = player ? player.group.position : new THREE.Vector3(0, 0, 18);
  const want = target.clone().add(new THREE.Vector3(0, 4.6, 8.4));
  camera.position.lerp(want, Math.min(1, dt * 4));
  camera.lookAt(target.x, target.y + 1.4, target.z);
}

/* ---------- HUD ---------- */
function updateHUD() {
  $('playerHPBar').style.width = (S.playerHP / CFG.playerHP * 100) + '%';
  $('playerHPLabel').textContent = '生命 ' + Math.max(0, Math.round(S.playerHP));
  $('monsterHPBar').style.width = (S.monsterHP / CFG.monsterHP * 100) + '%';
  $('crystalBox').textContent = `💎 ${S.crystals} / ${CFG.crystalCount}`;
}

/* ---------- 开始 / 重开 ---------- */
function startGame(key) {
  charKey = key;
  const g = buildPlayerMesh(key);
  g.position.set(0, 0, 18);
  scene.add(g);
  player = { group: g };
  S.phase = 'play';
  $('select').hidden = true;
  $('hud').hidden = false;
  $('btnSkill').firstChild.textContent = CHARS[key].skillLabel.split(' ')[0] + '\n';
  $('btnSkill').innerHTML = CHARS[key].skillLabel.replace(' ', '<br>') + '<div id="cdOverlay"></div>';
  setHint('向山洞出发！小心守卫！');
  updateHUD();
}

$('card-alex').addEventListener('click', () => startGame('alex'));
$('card-victory').addEventListener('click', () => startGame('victory'));
for (const id of ['btnAgainComplete', 'btnAgainDefeat', 'btnRestartMini']) {
  $(id).addEventListener('click', () => location.reload());
}

/* ---------- 主循环 ---------- */
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  skillCd = Math.max(0, skillCd - dt);
  const cdEl = $('cdOverlay');
  if (cdEl && player) {
    const sk = SKILLS[charKey];
    cdEl.style.transform = `scaleY(${skillCd / sk.cd})`;
  }
  if (S.phase === 'play') { updatePlayer(dt); updateMonster(dt); }
  else if (S.phase === 'winAnim') updateWin(dt);
  else if (S.phase === 'open') updateOpen(dt);
  else if (S.phase === 'collect') { updatePlayer(dt); updateCrystals(dt); updateMonster(dt); }
  if (S.phase === 'play' || S.phase === 'collect') updateProjectiles(dt);
  updateCamera(dt);
  renderer.render(scene, camera);
}
animate();

addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/* 测试与调试钩子 */
window.__game = {
  S, CFG, monsterState: () => monster.state,
  slamT: () => monster.slamT,
  playerPos: () => player ? player.group.position.toArray() : null,
  playerDistToMonster: () => player ? player.group.position.distanceTo(monster.group.position) : -1,
};
