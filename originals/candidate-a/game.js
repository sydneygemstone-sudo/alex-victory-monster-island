/* =========================================================================
   Alex & Victory：怪物岛探险  —— 第一关「海滩 · 洞口守卫」
   单文件游戏逻辑，依赖 vendor/three.min.js (r160, 全局 THREE)

   想改难度？只改下面的 CFG 就够了。
   ========================================================================= */
(function () {
'use strict';

// ------------------------------------------------------------------ 旋钮
var CFG = {
  // 玩家
  PLAYER_HP    : 100,
  MOVE_SPEED   : 11.5,   // 玩家跑速（守卫 6.6，所以永远跑得掉）
  IFRAME       : 0.9,    // 受击后无敌时间(秒)

  // 守卫
  BOSS_HP      : 400,
  BOSS_SPEED   : 6.6,
  TERRITORY    : 16,     // 踏进这个半径 → 开战
  WARN_RING    : 26,     // 进到这个半径 → 守卫警告（还不打）
  LEASH        : 31,     // 跑出这个半径 → 守卫放弃，回洞口
  TELEGRAPH    : 1.15,   // 攻击预警时间(秒) —— 调小会变难很多
  SLAM_RADIUS  : 7.5,    // 砸地伤害半径
  SLAM_DMG     : 25,
  BOSS_CD      : 2.6,    // 两次攻击间隔
  BOSS_REACH   : 13.5,   // 起手距离：它会前扑砸地，够得着十几米外的你
  BOSS_CLOSE   : 7.6,    // 想贴到这么近（追不上你也没关系，砸地够得着）

  // Alex：电弧（快、短冷却、中距离锥形）
  ARC_DMG      : 22,
  ARC_CD       : 0.55,
  ARC_RANGE    : 14,
  ARC_ANGLE    : 32 * Math.PI / 180,

  // Victory：重力投石（两段：悬浮 → 投掷；慢但伤害高、射程远）
  GRAV_DMG     : 50,
  GRAV_CD      : 1.4,
  GRAV_PICK    : 13,     // 能吸起多远的石头
  GRAV_LIFT    : 0.35,   // 石头升起用时
  GRAV_FLY     : 22,     // 石头飞行速度

  REWARD_GEMS  : 12      // 打赢这关拿几颗水晶（城堡那 100 颗是最终目标）
};

// ------------------------------------------------------------------ 网址开关
var Q      = new URLSearchParams(location.search);
var FF     = Math.max(1, Math.min(240, parseInt(Q.get('ff') || '1', 10) || 1)); // 快进倍率
var BOT    = Q.get('bot') === '1';   // AI 自动试玩
var AUDIT  = Q.get('audit') === '1'; // 打印数值体检

// ------------------------------------------------------------------ 小工具
var TAU = Math.PI * 2, FIXED = 1 / 60;
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function rand(a, b) { return a + Math.random() * (b - a); }
function $(id) { return document.getElementById(id); }
function mat(color, opts) {
  var o = opts || {}; o.color = color;
  return new THREE.MeshLambertMaterial(o);
}
function box(w, h, d, color) { return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color)); }
function cyl(rt, rb, h, color, seg) {
  return new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 10), mat(color));
}
function ball(r, color, seg) {
  return new THREE.Mesh(new THREE.SphereGeometry(r, seg || 12, seg || 10), mat(color));
}
function put(obj, x, y, z) { obj.position.set(x, y, z); return obj; }

// ------------------------------------------------------------------ 世界坐标约定
//   玩家从 z = +46（船）出发，向 z 减小的方向走；
//   洞口/守卫巢穴在 z = -2 附近；洞后 z < -16 是雨林（本关出口）。
var NEST = new THREE.Vector3(0, 0, -2);
var BOAT_Z = 46;

// ==========================================================================
//  渲染器 / 场景 / 相机
// ==========================================================================
var renderer, scene, camera;
function initRender() {
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setSize(innerWidth, innerHeight);
  $('app').appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87c9e8);
  scene.fog = new THREE.Fog(0x9ad4ea, 70, 190);

  camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 400);

  // 镜头压低 → 既看得清自己，也仰视得到巨大的守卫
  var hemi = new THREE.HemisphereLight(0xcfeaff, 0xd8c08a, 1.15);
  scene.add(hemi);
  var sun = new THREE.DirectionalLight(0xfff2d6, 1.9);
  sun.position.set(-28, 42, 30);
  scene.add(sun);
  scene.add(new THREE.AmbientLight(0xffffff, 0.34));

  addEventListener('resize', function () {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });
}

// ==========================================================================
//  场景：海 / 沙滩 / 船 / 岩壁洞口 / 雨林 / 石块
// ==========================================================================
var sea, boat, caveRocks = [], caveLight, jungle, rocks = [], gemPile;

function buildWorld() {
  // --- 海 ---
  sea = new THREE.Mesh(new THREE.PlaneGeometry(400, 220), mat(0x2f86c4));
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(0, -0.35, BOAT_Z + 106);
  scene.add(sea);

  // --- 沙滩 ---
  var sand = new THREE.Mesh(new THREE.PlaneGeometry(200, 190), mat(0xe8d49a));
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(0, 0, BOAT_Z - 82);
  scene.add(sand);

  // 湿沙带（海陆交界，给玩家一条"从这里上岸"的视觉线索）
  var wet = new THREE.Mesh(new THREE.PlaneGeometry(200, 12), mat(0xcdb682));
  wet.rotation.x = -Math.PI / 2;
  wet.position.set(0, 0.02, BOAT_Z + 6);
  scene.add(wet);

  buildBoat();
  buildCave();
  buildJungle();
  scatterRocks();
  buildFlanks();
}

function buildBoat() {
  boat = new THREE.Group();
  var hull = box(6.4, 2.4, 13, 0x8a5a33); put(hull, 0, 1.1, 0);
  var deck = box(5.6, 0.4, 12, 0xb5824f); put(deck, 0, 2.3, 0);
  var mast = cyl(0.22, 0.26, 10, 0x6f4526); put(mast, 0, 7.2, 1);
  var sail = box(0.25, 6, 5.2, 0xf4f1e4); put(sail, 0, 6.6, -0.6);
  var cabin = box(3.2, 1.8, 3, 0x9c6a3e); put(cabin, 0, 3.4, -3.6);
  var bow = new THREE.Mesh(new THREE.ConeGeometry(3.2, 5, 4), mat(0x8a5a33));
  put(bow, 0, 1.1, 9.0); bow.rotation.x = -Math.PI / 2; bow.rotation.y = Math.PI / 4;
  var stern = box(5.2, 2.6, 2.2, 0x7a4d2b); put(stern, 0, 1.6, -6.4);
  var flag = box(0.12, 1.0, 1.8, 0xe04b4b); put(flag, 0, 11.4, 1.9);
  var rail = box(6.0, 0.35, 12.4, 0x6f4526); put(rail, 0, 2.6, 0);
  boat.add(hull, deck, mast, sail, cabin, bow, stern, flag, rail);
  boat.position.set(-19, 0, BOAT_Z + 7);
  boat.rotation.y = 1.05;          // 侧对玩家，看得出船身、桅杆和帆
  scene.add(boat);
}

function buildCave() {
  // 岩壁：一整排深色岩石，中间留出洞口
  var wallMat = 0x5b5750;
  var wallL = box(46, 20, 10, wallMat); put(wallL, -30, 9, -12);
  var wallR = box(46, 20, 10, wallMat); put(wallR,  30, 9, -12);
  var lintel = box(16, 12, 10, wallMat); put(lintel, 0, 15, -12); // 洞口上方的横梁
  scene.add(wallL, wallR, lintel);

  // 崖顶碎岩：把平直的墙顶打碎，看起来才像山
  for (var c = 0; c < 16; c++) {
    var cx = -46 + c * 6.2 + rand(-1.6, 1.6);
    if (Math.abs(cx) < 8.5) continue;                 // 洞口正上方留空
    var chunk = new THREE.Mesh(new THREE.IcosahedronGeometry(rand(3, 5.6), 0), mat(0x6a655b));
    chunk.position.set(cx, 18.4 + rand(-2.2, 1.8), -12 + rand(-2.5, 2.5));
    chunk.rotation.set(rand(0, TAU), rand(0, TAU), rand(0, TAU));
    scene.add(chunk);
  }
  // 洞口两侧的火把：把"路在这里"点出来
  for (var tI = 0; tI < 2; tI++) {
    var tx = tI ? 7.6 : -7.6;
    var pole = cyl(0.16, 0.2, 3.2, 0x4a3524, 6); put(pole, tx, 1.6, -7.2);
    var fl = ball(0.55, 0xffb347, 9); put(fl, tx, 3.5, -7.2);
    fl.material = new THREE.MeshBasicMaterial({ color: 0xffc061 });
    var glow = new THREE.PointLight(0xffa838, 24, 16, 2);
    glow.position.set(tx, 3.6, -7.0);
    scene.add(pole, fl, glow);
  }

  // 洞口里面（黑色内壁，让洞看起来是"通的"）
  var inner = box(14, 9, 3, 0x14120f); put(inner, 0, 4.5, -15.4);
  scene.add(inner);

  // 洞口被巨石堵住 —— 打赢守卫后这些石头会塌下去
  for (var i = 0; i < 6; i++) {
    var r = new THREE.Mesh(new THREE.IcosahedronGeometry(rand(2.1, 3.3), 0), mat(0x6b665c));
    r.position.set(rand(-5.4, 5.4), rand(1.4, 6.4), -9 + rand(-1, 1));
    r.rotation.set(rand(0, TAU), rand(0, TAU), rand(0, TAU));
    r.userData.fallDelay = rand(0, 0.55);
    scene.add(r); caveRocks.push(r);
  }

  // 洞后的绿光：打通之后亮起来，代表"雨林在那边"
  caveLight = new THREE.Mesh(new THREE.PlaneGeometry(13, 8.6), new THREE.MeshBasicMaterial({
    color: 0x9cf08a, transparent: true, opacity: 0
  }));
  caveLight.position.set(0, 4.4, -13.6);   // 必须在黑色内壁(z=-15.4,厚3)的前面，否则会被埋住看不见
  scene.add(caveLight);
}

function buildJungle() {
  // 洞口外（更远处）的雨林，只作为出口背景
  jungle = new THREE.Group();
  for (var i = 0; i < 26; i++) {
    var t = new THREE.Group();
    var h = rand(7, 13);
    var trunk = cyl(0.4, 0.62, h, 0x6b4a2c, 7); put(trunk, 0, h / 2, 0);
    var crown = ball(rand(2.6, 4.2), i % 3 === 0 ? 0x2f7d44 : 0x3b9a55, 9);
    put(crown, 0, h + 1.2, 0);
    t.add(trunk, crown);
    t.position.set(rand(-46, 46), 0, rand(-58, -22));
    jungle.add(t);
  }
  scene.add(jungle);
}

function scatterRocks() {
  // Victory 的"弹药"：散在战斗区里的石块（Alex 玩的时候它们只是布景）
  var spots = [
    [-11, 9], [10, 11], [-7, 20], [9, 21], [-16, 15], [15, 16],
    [-3, 26], [5, 27], [-13, 30], [12, 31], [0, 14], [-20, 24], [19, 26]
  ];
  for (var i = 0; i < spots.length; i++) {
    var s = rand(0.85, 1.3);
    var m = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 0), mat(0x8d8779));
    m.position.set(spots[i][0], s * 0.72, spots[i][1] + NEST.z);
    m.rotation.set(rand(0, TAU), rand(0, TAU), rand(0, TAU));
    m.userData = { home: m.position.clone(), state: 'idle', size: s };
    scene.add(m); rocks.push(m);
  }
}

function buildFlanks() {
  // 两侧的岩石，把海滩围成一条"必须经过洞口"的路
  for (var i = 0; i < 12; i++) {
    var side = i % 2 ? 1 : -1;
    var r = new THREE.Mesh(new THREE.IcosahedronGeometry(rand(2.5, 5), 0), mat(0x6f6a60));
    r.position.set(side * rand(36, 48), rand(0.5, 2.4), rand(-8, 54));
    r.rotation.set(rand(0, TAU), rand(0, TAU), rand(0, TAU));
    scene.add(r);
  }
}

// 贴地假影子（比真阴影省性能，iPad 上更稳）
function makeShadow(r) {
  var m = new THREE.Mesh(new THREE.CircleGeometry(r, 18), new THREE.MeshBasicMaterial({
    color: 0x000000, transparent: true, opacity: 0.26
  }));
  m.rotation.x = -Math.PI / 2;
  scene.add(m);
  return m;
}

// ==========================================================================
//  玩家
// ==========================================================================
var player = {
  g: null, shadow: null, hp: CFG.PLAYER_HP, hero: 'alex',
  pos: new THREE.Vector3(-7, 0, BOAT_Z - 4),
  face: Math.PI,          // 朝向（弧度，0 = +z，PI = -z 也就是朝洞口）
  inv: 0,                 // 无敌计时
  cd: 0,                  // 技能冷却
  bob: 0,                 // 跑动上下摆
  hurtFlash: 0,
  gems: 0,
  gravRock: null,         // Victory 当前吸住的石头
  gravStage: 0            // 0=空手 1=石头浮着待投
};

function buildPlayer(hero) {
  if (player.g) scene.remove(player.g);
  var g = new THREE.Group();
  var isAlex = hero === 'alex';
  var main = isAlex ? 0x2f6fd0 : 0x7a3fc4;   // 衣服主色
  var trim = isAlex ? 0xffd54a : 0xe0c3ff;   // 点缀色

  var legL = box(0.34, 0.95, 0.34, 0x3b3f4a); put(legL, -0.24, 0.48, 0);
  var legR = box(0.34, 0.95, 0.34, 0x3b3f4a); put(legR,  0.24, 0.48, 0);
  var body = box(0.94, 0.95, 0.56, main);     put(body, 0, 1.42, 0);
  var head = box(0.62, 0.6, 0.6, 0xf1c9a5);   put(head, 0, 2.2, 0);
  var hair = box(0.68, 0.18, 0.66, isAlex ? 0x4a3524 : 0x2b1c3d); put(hair, 0, 2.55, 0);
  var armL = box(0.26, 0.85, 0.26, main);     put(armL, -0.62, 1.45, 0);
  var armR = box(0.26, 0.85, 0.26, main);     put(armR,  0.62, 1.45, 0);
  g.add(legL, legR, body, head, hair, armL, armR);
  g.userData.legL = legL; g.userData.legR = legR;
  g.userData.armR = armR;

  if (isAlex) {
    // 护目镜 + 背上的电池包 + 手里的电棒
    var goggles = box(0.66, 0.16, 0.1, trim); put(goggles, 0, 2.28, 0.3);
    var pack = box(0.5, 0.52, 0.24, 0xffc93c); put(pack, 0, 1.5, -0.42);
    var rod = cyl(0.07, 0.07, 1.15, 0xcfd6e0, 7); put(rod, 0.62, 1.55, 0.42);
    rod.rotation.x = -0.5;
    var tip = ball(0.15, 0x9fe8ff, 8); put(tip, 0.62, 2.0, 0.66);
    tip.material = new THREE.MeshBasicMaterial({ color: 0x9fe8ff });
    g.add(goggles, pack, rod, tip);
    g.userData.tip = tip;
  } else {
    // 长袍下摆 + 头上浮着的重力光球
    var robe = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.78, 1.0, 10), mat(main));
    put(robe, 0, 0.5, 0);
    var sashes = box(0.98, 0.16, 0.6, trim); put(sashes, 0, 1.0, 0);
    var orb = ball(0.2, 0xc79bff, 10); put(orb, 0.66, 2.35, 0.2);
    orb.material = new THREE.MeshBasicMaterial({ color: 0xd9b6ff, transparent: true, opacity: 0.92 });
    g.add(robe, sashes, orb);
    g.userData.orb = orb;
    legL.visible = false; legR.visible = false;   // 袍子盖住腿
  }

  scene.add(g);
  player.g = g;
  player.hero = hero;
  if (!player.shadow) player.shadow = makeShadow(0.7);
}

// ==========================================================================
//  守卫：巨大的三头兽（守在洞口，不追出领地）
// ==========================================================================
var boss = {
  g: null, shadow: null, hp: CFG.BOSS_HP,
  pos: NEST.clone(),
  face: 0,                 // 0 = 朝 +z（朝着玩家上岸的方向）
  state: 'calm',           // calm / warn / fight / return / dead
  atk: 0,                  // 攻击计时：>0 预警中
  cd: 1.2,
  aimAt: new THREE.Vector3(),
  heads: [], jaws: [], eyes: [],
  breathe: 0, hitFlash: 0, deadT: 0,
  slams: 0, hitsLanded: 0, everWarned: false, everReturned: false
};

function buildBoss() {
  var g = new THREE.Group();
  var fur = 0x5e4735, furD = 0x40301f;

  // 躯干：又长又厚，让它在低机位下显得巨大
  var torso = box(3.4, 3.2, 6.6, fur);     put(torso, 0, 3.3, -0.4);
  var hip   = box(3.0, 2.9, 2.2, furD);    put(hip, 0, 3.2, -3.2);
  var chest = box(3.7, 3.3, 2.6, fur);     put(chest, 0, 3.4, 2.1);
  g.add(torso, hip, chest);

  // 四条粗腿
  var legPos = [[-1.3, 2.6], [1.3, 2.6], [-1.25, -2.8], [1.25, -2.8]];
  for (var i = 0; i < 4; i++) {
    var leg = cyl(0.62, 0.78, 3.4, furD, 8);
    put(leg, legPos[i][0], 1.7, legPos[i][1]);
    var paw = box(1.0, 0.5, 1.3, 0x2b2018);
    put(paw, legPos[i][0], 0.25, legPos[i][1] + 0.2);
    g.add(leg, paw);
  }

  // 三颗头：中间那颗略高，左右两颗分开 —— 共用一套 AI，但一起动
  var headX = [-1.5, 0, 1.5], headY = [5.3, 5.9, 5.3], headZ = [3.4, 3.9, 3.4];
  for (var h = 0; h < 3; h++) {
    var neck = cyl(0.5, 0.62, 2.4, furD, 8);
    put(neck, headX[h] * 0.72, 4.5, 2.9 + h * 0);
    neck.rotation.x = -0.55;
    neck.rotation.z = -headX[h] * 0.14;
    g.add(neck);

    var hd = new THREE.Group();
    var skull = box(1.35, 1.25, 1.6, fur);      put(skull, 0, 0, 0);
    var snout = box(0.9, 0.62, 1.15, furD);     put(snout, 0, -0.2, 1.2);
    var jaw   = box(0.86, 0.34, 1.1, 0x2b2018); put(jaw, 0, -0.62, 1.18);
    var earL  = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.8, 5), mat(furD));
    put(earL, -0.48, 0.85, -0.1);
    var earR = earL.clone(); earR.position.x = 0.48;
    var eyeM = new THREE.MeshBasicMaterial({ color: 0xff4a2e });
    var eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), eyeM);
    put(eyeL, -0.33, 0.16, 0.74);
    var eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), eyeM.clone());
    put(eyeR, 0.33, 0.16, 0.74);
    // 獠牙
    var tuskL = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.42, 5), mat(0xf0ead8));
    put(tuskL, -0.26, -0.34, 1.62); tuskL.rotation.x = Math.PI;
    var tuskR = tuskL.clone(); tuskR.position.x = 0.26;

    hd.add(skull, snout, jaw, earL, earR, eyeL, eyeR, tuskL, tuskR);
    hd.position.set(headX[h], headY[h], headZ[h]);
    hd.userData = { jaw: jaw, baseY: headY[h], eyes: [eyeL, eyeR], phase: h * 0.8 };
    g.add(hd);
    boss.heads.push(hd);
    boss.eyes.push(eyeL, eyeR);
  }

  // 尾巴
  var tail = cyl(0.18, 0.5, 3.2, furD, 7);
  put(tail, 0, 3.6, -4.6); tail.rotation.x = 0.9;
  g.add(tail);
  boss.tailRef = tail;

  g.scale.setScalar(1.3);          // 巨兽：头顶约 8.5m，是玩家的三倍多
  g.position.copy(NEST);
  scene.add(g);
  boss.g = g;
  boss.shadow = makeShadow(4.4);
}

// --- 领地圈：地上的一道环，告诉玩家"越过这里它就动手了" ---
var ringTerr, ringWarn, slamRing;
function buildRings() {
  ringTerr = new THREE.Mesh(new THREE.RingGeometry(CFG.TERRITORY - 0.35, CFG.TERRITORY, 60),
    new THREE.MeshBasicMaterial({ color: 0xff7a4a, transparent: true, opacity: 0.32, side: THREE.DoubleSide }));
  ringTerr.rotation.x = -Math.PI / 2; ringTerr.position.set(NEST.x, 0.05, NEST.z);
  scene.add(ringTerr);

  ringWarn = new THREE.Mesh(new THREE.RingGeometry(CFG.WARN_RING - 0.25, CFG.WARN_RING, 60),
    new THREE.MeshBasicMaterial({ color: 0xffd76a, transparent: true, opacity: 0.16, side: THREE.DoubleSide }));
  ringWarn.rotation.x = -Math.PI / 2; ringWarn.position.set(NEST.x, 0.04, NEST.z);
  scene.add(ringWarn);

  // 砸地预警圈：攻击前 1.15 秒出现并扩张，圈内会挨打 → 跑出去就躲掉了
  slamRing = new THREE.Mesh(new THREE.CircleGeometry(1, 40),
    new THREE.MeshBasicMaterial({ color: 0xff2d2d, transparent: true, opacity: 0, side: THREE.DoubleSide }));
  slamRing.rotation.x = -Math.PI / 2;
  slamRing.position.y = 0.07;
  scene.add(slamRing);
}

// ==========================================================================
//  特效池
// ==========================================================================
var fx = [];   // {mesh, life, max, kind}
function addFx(mesh, life, kind) {
  mesh.userData.fxLife = life; mesh.userData.fxMax = life; mesh.userData.fxKind = kind || '';
  scene.add(mesh); fx.push(mesh);
  return mesh;
}
function updateFx(dt) {
  for (var i = fx.length - 1; i >= 0; i--) {
    var m = fx[i];
    m.userData.fxLife -= dt;
    var t = clamp(m.userData.fxLife / m.userData.fxMax, 0, 1);
    if (m.material) m.material.opacity = t;
    if (m.userData.fxKind === 'grow') {
      var s = 1 + (1 - t) * (m.userData.growTo || 3);
      m.scale.set(s, s, s);
    }
    if (m.userData.fxKind === 'rise') m.position.y += dt * 3.4;
    if (m.userData.fxLife <= 0) { scene.remove(m); fx.splice(i, 1); }
  }
}
function ringBurst(x, z, color, growTo, life) {
  var m = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.25, 30),
    new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 1, side: THREE.DoubleSide }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, 0.12, z);
  m.userData.growTo = growTo;
  return addFx(m, life || 0.5, 'grow');
}

// ==========================================================================
//  能力 1 —— Alex：电弧（瞬发、锥形、短冷却）
// ==========================================================================
function bossHitPoint() {
  // 守卫很大，判定打它身体中心偏前（胸口）
  var p = boss.pos.clone();
  p.x += Math.sin(boss.face) * 2.1;
  p.z += Math.cos(boss.face) * 2.1;
  return p;
}
function castArc() {
  var from = player.pos.clone(); from.y = 1.7;
  var target = bossHitPoint();
  var dx = target.x - player.pos.x, dz = target.z - player.pos.z;
  var dist = Math.sqrt(dx * dx + dz * dz) - 3.6;          // 减去守卫身体半径
  var canAim = boss.state !== 'dead' && dist < CFG.ARC_RANGE;
  if (canAim) player.face = Math.atan2(dx, dz);           // 辅助瞄准：自动转向守卫

  // 锥形判定
  var ang = Math.abs(((Math.atan2(dx, dz) - player.face + Math.PI * 3) % TAU) - Math.PI);
  var hit = canAim && ang <= CFG.ARC_ANGLE;

  // 电弧折线：从电棒尖打向目标（没目标就打向正前方）
  var end = hit ? new THREE.Vector3(target.x, 2.6, target.z)
                : new THREE.Vector3(player.pos.x + Math.sin(player.face) * 9, 1.8,
                                    player.pos.z + Math.cos(player.face) * 9);
  var pts = [], N = 9;
  for (var i = 0; i <= N; i++) {
    var t = i / N;
    var p = from.clone().lerp(end, t);
    if (i > 0 && i < N) { p.x += rand(-0.55, 0.55); p.y += rand(-0.5, 0.5); p.z += rand(-0.55, 0.55); }
    pts.push(p);
  }
  var line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),
    new THREE.LineBasicMaterial({ color: 0x9fe8ff, transparent: true, opacity: 1 }));
  addFx(line, 0.16);
  var flash = ball(0.5, 0xffffff, 8);
  flash.material = new THREE.MeshBasicMaterial({ color: 0xcdf3ff, transparent: true, opacity: 1 });
  flash.position.copy(end);
  addFx(flash, 0.2, 'grow'); flash.userData.growTo = 2.2;

  if (hit) damageBoss(CFG.ARC_DMG, end);
  player.cd = CFG.ARC_CD;
  return hit;
}

// ==========================================================================
//  能力 2 —— Victory：重力投石（第一下让石头浮起，第二下甩出去）
// ==========================================================================
function castGravity() {
  if (player.gravStage === 0) {
    // --- 第一段：吸起最近的一块石头 ---
    var best = null, bd = CFG.GRAV_PICK;
    for (var i = 0; i < rocks.length; i++) {
      var r = rocks[i];
      if (r.userData.state !== 'idle') continue;
      var d = Math.hypot(r.position.x - player.pos.x, r.position.z - player.pos.z);
      if (d < bd) { bd = d; best = r; }
    }
    if (!best) { toast('附近没有石块，跑到石头旁边再用'); return false; }
    best.userData.state = 'lift';
    best.userData.liftT = 0;
    best.userData.from = best.position.clone();
    player.gravRock = best;
    player.gravStage = 1;
    ringBurst(best.position.x, best.position.z, 0xc79bff, 2.2, 0.5);
    setSkillBtn(2);
    return true;
  }
  // --- 第二段：把石头甩向守卫 ---
  var rock = player.gravRock;
  if (!rock) { player.gravStage = 0; setSkillBtn(1); return false; }
  var target = bossHitPoint();
  var dx = target.x - rock.position.x, dz = target.z - rock.position.z;
  if (boss.state !== 'dead') player.face = Math.atan2(target.x - player.pos.x, target.z - player.pos.z);

  var dir = new THREE.Vector3(dx, (2.9 - rock.position.y), dz).normalize();
  rock.userData.state = 'fly';
  rock.userData.vel = dir.multiplyScalar(CFG.GRAV_FLY);
  rock.userData.flyT = 0;
  player.gravRock = null;
  player.gravStage = 0;
  player.cd = CFG.GRAV_CD;
  setSkillBtn(1);
  return true;
}

function updateRocks(dt) {
  for (var i = 0; i < rocks.length; i++) {
    var r = rocks[i], u = r.userData;
    r.rotation.y += dt * (u.state === 'idle' ? 0 : 2.6);

    if (u.state === 'lift') {
      u.liftT += dt;
      var t = clamp(u.liftT / CFG.GRAV_LIFT, 0, 1);
      // 升到玩家右前上方，微微环绕 —— 看得出来是"被重力托着"
      var hx = player.pos.x + Math.sin(player.face + 0.55) * 1.7;
      var hz = player.pos.z + Math.cos(player.face + 0.55) * 1.7;
      var goal = new THREE.Vector3(hx, 2.9 + Math.sin(u.liftT * 3) * 0.12, hz);
      r.position.lerpVectors(u.from, goal, t);
      if (t >= 1) u.from.copy(r.position);
      r.rotation.x += dt * 2.2;

    } else if (u.state === 'fly') {
      u.flyT += dt;
      r.position.addScaledVector(u.vel, dt);
      r.rotation.x += dt * 9;
      var hp2 = bossHitPoint();
      var d = Math.hypot(r.position.x - hp2.x, r.position.z - hp2.z);
      var hitBoss = boss.state !== 'dead' && d < 4.3 && r.position.y < 9 && r.position.y > 0.4;
      if (hitBoss) {
        damageBoss(CFG.GRAV_DMG, r.position.clone());
        ringBurst(r.position.x, r.position.z, 0xc79bff, 3, 0.45);
        resetRock(r, 0.9);
      } else if (r.position.y <= u.size * 0.72 || u.flyT > 2.2) {
        resetRock(r, 0.9);
      }
    } else if (u.state === 'cool') {
      u.coolT -= dt;
      if (u.coolT <= 0) { u.state = 'idle'; r.position.copy(u.home); r.visible = true; }
    }
  }
}
function resetRock(r, cool) {
  r.userData.state = 'cool'; r.userData.coolT = cool; r.visible = false;
}

// ==========================================================================
//  伤害与生死
// ==========================================================================
var over = false, won = false, pathOpen = false, openT = 0;

function damageBoss(amount, at) {
  if (boss.state === 'dead') return;
  boss.hp = Math.max(0, boss.hp - amount);
  boss.hitFlash = 0.14;
  if (at) {
    var sp = ball(0.35, 0xffe08a, 8);
    sp.material = new THREE.MeshBasicMaterial({ color: 0xffd36a, transparent: true, opacity: 1 });
    sp.position.copy(at); sp.userData.growTo = 1.6;
    addFx(sp, 0.3, 'grow');
  }
  if (boss.state === 'calm' || boss.state === 'warn' || boss.state === 'return') enterFight();
  updateBossHud();
  if (boss.hp <= 0) killBoss();
}

function damagePlayer(amount, fromX, fromZ) {
  if (player.inv > 0 || over) return;
  player.hp = Math.max(0, player.hp - amount);
  player.inv = CFG.IFRAME;
  boss.hitsLanded++;
  player.hurtFlash = 0.4;
  // 击退，让"挨打了"有身体感
  var dx = player.pos.x - fromX, dz = player.pos.z - fromZ;
  var l = Math.hypot(dx, dz) || 1;
  player.pos.x += dx / l * 2.4; player.pos.z += dz / l * 2.4;
  updatePlayerHud();
  if (player.hp <= 0) lose();
}

function killBoss() {
  boss.state = 'dead';
  boss.deadT = 0;
  slamRing.material.opacity = 0;
  ringTerr.visible = false; ringWarn.visible = false;
  for (var i = 0; i < boss.eyes.length; i++) boss.eyes[i].material.color.setHex(0x553322);
  ringBurst(boss.pos.x, boss.pos.z, 0xffd36a, 9, 1.4);
  setAlert('', '');
  setGoal('守卫倒下了！<b>洞口正在塌开</b>…');
  dropGems();
  for (var r = 0; r < caveRocks.length; r++) caveRocks[r].userData.startY = caveRocks[r].position.y;
  pathOpen = true; openT = 0;
}

// --- 打赢的奖励水晶：掉一地，然后自动飞进背包 ---
var gems = [];
function dropGems() {
  for (var i = 0; i < CFG.REWARD_GEMS; i++) {
    var m = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0),
      new THREE.MeshBasicMaterial({ color: 0x7fe7ff }));
    var a = (i / CFG.REWARD_GEMS) * TAU;
    m.position.set(boss.pos.x + Math.cos(a) * rand(2, 5), 0.9, boss.pos.z + Math.sin(a) * rand(2, 5));
    m.userData.delay = 0.5 + i * 0.12;
    scene.add(m); gems.push(m);
  }
}
function updateGems(dt) {
  for (var i = gems.length - 1; i >= 0; i--) {
    var g = gems[i];
    g.rotation.y += dt * 3;
    g.userData.delay -= dt;
    if (g.userData.delay > 0) { g.position.y = 0.9 + Math.sin(performance.now() / 300 + i) * 0.14; continue; }
    // 飞向玩家 → 收进背包
    var tx = player.pos.x, ty = 1.5, tz = player.pos.z;
    g.position.x += (tx - g.position.x) * clamp(dt * 5, 0, 1);
    g.position.y += (ty - g.position.y) * clamp(dt * 5, 0, 1);
    g.position.z += (tz - g.position.z) * clamp(dt * 5, 0, 1);
    if (Math.hypot(tx - g.position.x, tz - g.position.z) < 0.9) {
      scene.remove(g); gems.splice(i, 1);
      player.gems++; $('gemN').textContent = player.gems;
    }
  }
}

// ==========================================================================
//  守卫 AI：远处不理你 → 靠近就警告 → 踏进领地才动手 → 跑远了它就回家
// ==========================================================================
function nestDist(p) { return Math.hypot(p.x - NEST.x, p.z - NEST.z); }

function enterWarn() {
  boss.state = 'warn';
  boss.everWarned = true;
  setAlert('warn', '守卫注意到你了 —— 再靠近它就动手');
  setGoal('黄圈里它只会<b>警告</b>，越过<b>红圈</b>就开打');
  for (var i = 0; i < boss.eyes.length; i++) boss.eyes[i].material.color.setHex(0xff7a2e);
  ringBurst(boss.pos.x, boss.pos.z, 0xffd76a, 7, 0.9);
}
function enterFight() {
  if (boss.state === 'fight') return;
  boss.state = 'fight';
  boss.cd = 1.3;                      // 开战给一点缓冲，别一进来就挨打
  setAlert('fight', '⚔️ 三头守卫发怒了！');
  setGoal(player.hero === 'alex'
    ? '靠近用<b>电弧</b>劈它，看到<b>红圈</b>就跑开'
    : '按一下<b>吸起石块</b>，再按一下<b>甩出去</b>，看到<b>红圈</b>就跑开');
  $('bossHud').classList.add('show');
  for (var i = 0; i < boss.eyes.length; i++) boss.eyes[i].material.color.setHex(0xff2d1a);
  ringBurst(boss.pos.x, boss.pos.z, 0xff4a2e, 8, 1.0);
}
function leaveFight() {
  boss.state = 'return';
  boss.everReturned = true;
  boss.atk = 0; slamRing.material.opacity = 0;
  setAlert('warn', '守卫放弃追击，回到了洞口');
  $('bossHud').classList.remove('show');
}

function updateBoss(dt) {
  var g = boss.g;
  boss.breathe += dt;
  if (boss.hitFlash > 0) boss.hitFlash -= dt;

  // ---- 死亡：整只瘫下去 ----
  if (boss.state === 'dead') {
    boss.deadT += dt;
    var t = clamp(boss.deadT / 1.6, 0, 1);
    g.position.y = -1.6 * t;
    g.rotation.z = 0.42 * t;
    for (var h = 0; h < boss.heads.length; h++) {
      boss.heads[h].rotation.x = 0.9 * t;
      boss.heads[h].position.y = boss.heads[h].userData.baseY - 1.5 * t;
    }
    return;
  }

  var dNest = nestDist(player.pos);
  var dx = player.pos.x - boss.pos.x, dz = player.pos.z - boss.pos.z;
  var dPlayer = Math.hypot(dx, dz);

  // ---- 状态切换 ----
  if (boss.state === 'calm') {
    if (dNest <= CFG.WARN_RING) enterWarn();
  } else if (boss.state === 'warn') {
    if (dNest <= CFG.TERRITORY) enterFight();
    else if (dNest > CFG.WARN_RING + 3) {
      boss.state = 'calm'; setAlert('', '');
      for (var e = 0; e < boss.eyes.length; e++) boss.eyes[e].material.color.setHex(0xff4a2e);
    }
  } else if (boss.state === 'fight') {
    if (dNest > CFG.LEASH) leaveFight();
  } else if (boss.state === 'return') {
    if (dNest <= CFG.TERRITORY) enterFight();
  }

  // ---- 转向：警告开始就一直盯着玩家 ----
  var wantFace = boss.face;
  if (boss.state === 'warn' || boss.state === 'fight') wantFace = Math.atan2(dx, dz);
  else if (boss.state === 'return') wantFace = Math.atan2(NEST.x - boss.pos.x, NEST.z - boss.pos.z);
  else wantFace = 0;
  var diff = ((wantFace - boss.face + Math.PI * 3) % TAU) - Math.PI;
  boss.face += clamp(diff, -2.2 * dt, 2.2 * dt);

  // ---- 移动 ----
  if (boss.state === 'fight') {
    // 预警/砸地过程中站定不动 → 玩家才有时间跑出红圈
    if (boss.atk <= 0 && dPlayer > CFG.BOSS_CLOSE) {
      var step = CFG.BOSS_SPEED * dt;
      var nx = boss.pos.x + dx / (dPlayer || 1) * step;
      var nz = boss.pos.z + dz / (dPlayer || 1) * step;
      if (nestDist({ x: nx, z: nz }) <= CFG.LEASH) { boss.pos.x = nx; boss.pos.z = nz; }
    }
  } else if (boss.state === 'return') {
    var rx = NEST.x - boss.pos.x, rz = NEST.z - boss.pos.z;
    var rl = Math.hypot(rx, rz);
    if (rl < 0.5) {
      boss.pos.copy(NEST);
      boss.state = dNest <= CFG.WARN_RING ? 'warn' : 'calm';
      if (boss.state === 'calm') setAlert('', '');
    } else {
      boss.pos.x += rx / rl * CFG.BOSS_SPEED * dt;
      boss.pos.z += rz / rl * CFG.BOSS_SPEED * dt;
    }
  }

  // ---- 攻击：预警 → 判定 ----
  if (boss.state === 'fight') {
    if (boss.atk > 0) {
      boss.atk -= dt;
      var prog = 1 - clamp(boss.atk / CFG.TELEGRAPH, 0, 1);     // 0→1
      var s = CFG.SLAM_RADIUS * (0.35 + 0.65 * prog);
      slamRing.scale.set(s, s, 1);
      slamRing.material.opacity = 0.2 + 0.42 * prog;
      if (boss.atk <= 0) doSlam();
    } else {
      boss.cd -= dt;
      if (boss.cd <= 0 && dPlayer <= CFG.BOSS_REACH) {
        boss.atk = CFG.TELEGRAPH;
        boss.aimAt.set(player.pos.x, 0, player.pos.z);          // 瞄准起手瞬间的位置
        slamRing.position.set(boss.aimAt.x, 0.07, boss.aimAt.z);
        slamRing.material.opacity = 0.2;
      }
    }
  }

  // ---- 姿态动画 ----
  var telepro = boss.atk > 0 ? 1 - clamp(boss.atk / CFG.TELEGRAPH, 0, 1) : 0;
  for (var i = 0; i < boss.heads.length; i++) {
    var hd = boss.heads[i], u = hd.userData;
    var br = Math.sin(boss.breathe * 1.6 + u.phase) * 0.12;
    if (boss.state === 'calm') {
      hd.position.y = u.baseY + br;
      hd.rotation.x = 0.1 + br * 0.2;
      hd.rotation.y = Math.sin(boss.breathe * 0.5 + u.phase) * 0.35;   // 左右张望
      u.jaw.position.y = -0.62;
    } else {
      hd.rotation.y = 0;
      // 预警时三颗头一起抬起张嘴 —— 大到从低机位也看得见
      hd.position.y = u.baseY + br + telepro * 1.1;
      hd.rotation.x = 0.1 - telepro * 0.55;
      u.jaw.position.y = -0.62 - telepro * 0.55;
    }
  }
  boss.tailRef.rotation.z = Math.sin(boss.breathe * 2.2) * 0.25;

  // 砸地那一下整只往下一顿
  var slamDip = 0;
  if (boss.slamAnim > 0) { boss.slamAnim -= dt; slamDip = -Math.sin(clamp(boss.slamAnim / 0.25, 0, 1) * Math.PI) * 0.9; }
  g.position.set(boss.pos.x, slamDip, boss.pos.z);
  g.rotation.y = boss.face;
  boss.shadow.position.set(boss.pos.x, 0.03, boss.pos.z);

  // 挨打闪一下
  var flash = boss.hitFlash > 0;
  for (var k = 0; k < boss.heads.length; k++) boss.heads[k].scale.setScalar(flash ? 1.07 : 1);
}
boss.slamAnim = 0;

function doSlam() {
  // 前扑：朝预警圈方向冲一小段，够得着远处的玩家
  var lx = boss.aimAt.x - boss.pos.x, lz = boss.aimAt.z - boss.pos.z;
  var ll = Math.hypot(lx, lz);
  if (ll > 0.5) {
    var lunge = Math.min(ll - 1.2, 4.2);
    if (lunge > 0) {
      var nx2 = boss.pos.x + lx / ll * lunge, nz2 = boss.pos.z + lz / ll * lunge;
      if (nestDist({ x: nx2, z: nz2 }) <= CFG.LEASH) { boss.pos.x = nx2; boss.pos.z = nz2; }
    }
  }
  boss.atk = 0;
  boss.cd = CFG.BOSS_CD;
  boss.slamAnim = 0.25;
  boss.slams++;
  slamRing.material.opacity = 0;
  ringBurst(boss.aimAt.x, boss.aimAt.z, 0xff3b30, CFG.SLAM_RADIUS, 0.45);
  // 扬起的沙尘
  for (var i = 0; i < 7; i++) {
    var p = ball(rand(0.4, 0.8), 0xd8c08a, 7);
    p.material = new THREE.MeshBasicMaterial({ color: 0xe0cb9a, transparent: true, opacity: 0.9 });
    p.position.set(boss.aimAt.x + rand(-3, 3), 0.5, boss.aimAt.z + rand(-3, 3));
    addFx(p, 0.55, 'rise');
  }
  var d = Math.hypot(player.pos.x - boss.aimAt.x, player.pos.z - boss.aimAt.z);
  if (d <= CFG.SLAM_RADIUS) damagePlayer(CFG.SLAM_DMG, boss.aimAt.x, boss.aimAt.z);
}

// ==========================================================================
//  玩家更新 + 镜头
// ==========================================================================
var camPos = new THREE.Vector3(0, 6, BOAT_Z + 10);
var camLook = new THREE.Vector3();

function updatePlayer(dt, ix, iy) {
  if (player.inv > 0) player.inv -= dt;
  if (player.cd > 0) player.cd -= dt;
  if (player.hurtFlash > 0) {
    player.hurtFlash -= dt;
    $('vig').style.opacity = clamp(player.hurtFlash / 0.4, 0, 1) * 0.9;
  } else $('vig').style.opacity = 0;

  // 输入方向相对镜头：往上推 = 往画面里走（iPad 上最直觉）
  var fwd = new THREE.Vector3(player.pos.x - camPos.x, 0, player.pos.z - camPos.z);
  if (fwd.lengthSq() < 0.001) fwd.set(0, 0, -1);
  fwd.normalize();
  var right = new THREE.Vector3(-fwd.z, 0, fwd.x);
  var mv = new THREE.Vector3()
    .addScaledVector(right, ix)
    .addScaledVector(fwd, iy);
  var mag = mv.length();
  if (mag > 0.001) {
    if (mag > 1) mv.divideScalar(mag);
    player.pos.addScaledVector(mv, CFG.MOVE_SPEED * dt);
    player.face = Math.atan2(mv.x, mv.z);
    player.bob += dt * 12;
  } else player.bob += dt * 2;

  // 边界：两侧岩石挡住，洞口在打通前也过不去
  player.pos.x = clamp(player.pos.x, -32, 32);
  var minZ = pathOpen ? -30 : -7.5;
  player.pos.z = clamp(player.pos.z, minZ, BOAT_Z + 7);

  // 别站进守卫身体里
  var bd = Math.hypot(player.pos.x - boss.pos.x, player.pos.z - boss.pos.z);
  if (boss.state !== 'dead' && bd < 4.1) {
    var px = (player.pos.x - boss.pos.x) / (bd || 1), pz = (player.pos.z - boss.pos.z) / (bd || 1);
    player.pos.x = boss.pos.x + px * 4.1;
    player.pos.z = boss.pos.z + pz * 4.1;
  }

  // 摆姿势
  var g = player.g;
  g.position.set(player.pos.x, Math.abs(Math.sin(player.bob)) * 0.08, player.pos.z);
  g.rotation.y = player.face;
  var swing = Math.sin(player.bob) * (mag > 0.05 ? 0.7 : 0.05);
  if (g.userData.legL.visible) { g.userData.legL.rotation.x = swing; g.userData.legR.rotation.x = -swing; }
  g.userData.armR.rotation.x = -swing * 0.6;
  if (g.userData.orb) {
    g.userData.orb.position.set(Math.sin(player.bob * 0.4) * 0.3 + 0.55, 2.35 + Math.sin(player.bob * 0.5) * 0.1, 0.2);
  }
  // 无敌帧闪烁
  g.visible = !(player.inv > 0 && Math.floor(player.inv * 14) % 2 === 0);
  player.shadow.position.set(player.pos.x, 0.03, player.pos.z);
  player.shadow.visible = g.visible;

  // 打通后走进洞口 = 过关
  if (pathOpen && openT > 1.6 && !over && player.pos.z < -9) win();
}

function updateCamera(dt) {
  // 锁定式第三人称：玩家在近处，守卫在远处，两个都在画面里；机位压低，仰得到怪物
  var locked = (boss.state === 'warn' || boss.state === 'fight') && boss.state !== 'dead';
  var focus = locked ? boss.pos : new THREE.Vector3(NEST.x, 0, NEST.z - 14);
  var dir = new THREE.Vector3(player.pos.x - focus.x, 0, player.pos.z - focus.z);
  if (dir.lengthSq() < 0.01) dir.set(0, 0, 1);
  dir.normalize();

  var dist = locked ? 13.5 : 10.5;
  var want = new THREE.Vector3(
    player.pos.x + dir.x * dist,
    5.0,
    player.pos.z + dir.z * dist
  );
  var k = clamp(dt * 4.2, 0, 1);
  camPos.lerp(want, k);
  camPos.y = Math.max(camPos.y, 2.2);
  camera.position.copy(camPos);

  // 视线落在玩家和目标之间，偏向玩家；锁定时抬高一点把三颗头带进来
  var lookWant = new THREE.Vector3(
    player.pos.x * 0.68 + focus.x * 0.32,
    locked ? 3.9 : 1.9,
    player.pos.z * 0.68 + focus.z * 0.32
  );
  camLook.lerp(lookWant, k);
  camera.lookAt(camLook);
}

// ==========================================================================
//  HUD
// ==========================================================================
var goalHTML = '下船，穿过<b>海滩</b>，走向<b>山洞</b>', toastT = 0;
function setGoal(html) { goalHTML = html; if (toastT <= 0) $('goal').innerHTML = html; }
function toast(msg) { $('goal').innerHTML = msg; toastT = 2.0; }
function setAlert(cls, text) {
  var el = $('alert');
  if (!text) { el.className = 'panel'; return; }
  el.className = 'panel ' + cls + ' show';
  el.innerHTML = text;
}
function updatePlayerHud() {
  var p = clamp(player.hp / CFG.PLAYER_HP, 0, 1);
  var f = $('pFill');
  f.style.width = (p * 100) + '%';
  f.className = p <= 0.34 ? 'low' : '';
  $('pNum').textContent = Math.ceil(player.hp) + ' / ' + CFG.PLAYER_HP;
}
function updateBossHud() {
  $('bossFill').style.width = (clamp(boss.hp / CFG.BOSS_HP, 0, 1) * 100) + '%';
}
function setSkillBtn(stage) {
  var ico = $('skIco'), txt = $('skTxt'), btn = $('skillBtn');
  if (player.hero === 'alex') { ico.textContent = '⚡'; txt.textContent = '电弧'; btn.classList.remove('stage2'); }
  else if (stage === 2) { ico.textContent = '💥'; txt.textContent = '甩出去'; btn.classList.add('stage2'); }
  else { ico.textContent = '🪐'; txt.textContent = '吸起石块'; btn.classList.add('stage2'); }
}

// ==========================================================================
//  输入：键盘 + iPad 触屏
// ==========================================================================
var keys = {}, stick = { active: false, id: null, ox: 0, oy: 0, ix: 0, iy: 0 };
var STICK_R = 56;

function fire() {
  if (over || !started) return;
  if (player.cd > 0) return;
  if (player.hero === 'alex') castArc();
  else {
    var st = player.gravStage;
    var ok = castGravity();
    if (ok && st === 0) player.cd = 0.25;      // 两段之间的小防抖
  }
}

function initInput() {
  addEventListener('keydown', function (e) {
    if (e.repeat) return;
    keys[e.code] = true;
    var hk = $('stickHint'); if (hk) hk.classList.add('gone');
    if (e.code === 'Space' || e.code === 'KeyJ') { e.preventDefault(); if (over) restart(); else fire(); }
    if (e.code === 'KeyR') restart();
    if (e.code === 'Enter' && !started) $('startBtn').click();
  });
  addEventListener('keyup', function (e) { keys[e.code] = false; });

  // --- 动态摇杆：左下角按哪儿，摇杆就出现在哪儿 ---
  var zone = $('stickZone');
  zone.addEventListener('touchstart', function (e) {
    var t = e.changedTouches[0];
    stick.active = true; stick.id = t.identifier;
    stick.ox = t.clientX; stick.oy = t.clientY;
    var hint = $('stickHint'); if (hint) hint.classList.add('gone');
    var el = $('stick');
    el.style.left = t.clientX + 'px'; el.style.top = t.clientY + 'px';
    el.classList.add('on');
    $('knob').style.transform = 'translate(0,0)';
    e.preventDefault();
  }, { passive: false });

  addEventListener('touchmove', function (e) {
    if (!stick.active) return;
    for (var i = 0; i < e.changedTouches.length; i++) {
      var t = e.changedTouches[i];
      if (t.identifier !== stick.id) continue;
      var dx = t.clientX - stick.ox, dy = t.clientY - stick.oy;
      var len = Math.hypot(dx, dy);
      if (len > STICK_R) { dx *= STICK_R / len; dy *= STICK_R / len; }
      $('knob').style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
      stick.ix = dx / STICK_R; stick.iy = -dy / STICK_R;
      e.preventDefault();
    }
  }, { passive: false });

  function endStick(e) {
    if (!stick.active) return;
    for (var i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier !== stick.id) continue;
      stick.active = false; stick.ix = 0; stick.iy = 0;
      $('stick').classList.remove('on');
    }
  }
  addEventListener('touchend', endStick);
  addEventListener('touchcancel', endStick);

  // --- 技能按钮 ---
  var btn = $('skillBtn');
  btn.addEventListener('touchstart', function (e) {
    e.preventDefault(); e.stopPropagation();
    btn.classList.add('press');
    if (over) restart(); else fire();
  }, { passive: false });
  btn.addEventListener('touchend', function (e) { e.preventDefault(); btn.classList.remove('press'); }, { passive: false });
  btn.addEventListener('mousedown', function () { btn.classList.add('press'); if (over) restart(); else fire(); });
  addEventListener('mouseup', function () { btn.classList.remove('press'); });
}

function readInput() {
  if (BOT) return botInput();
  var ix = stick.ix, iy = stick.iy;
  if (keys['KeyA'] || keys['ArrowLeft'])  ix -= 1;
  if (keys['KeyD'] || keys['ArrowRight']) ix += 1;
  if (keys['KeyW'] || keys['ArrowUp'])    iy += 1;
  if (keys['KeyS'] || keys['ArrowDown'])  iy -= 1;
  return { ix: clamp(ix, -1, 1), iy: clamp(iy, -1, 1) };
}

// ==========================================================================
//  AI 自动试玩（?bot=1）—— 用来验证这一关真的打得通
// ==========================================================================
function worldToInput(wx, wz) {
  var fx2 = player.pos.x - camPos.x, fz2 = player.pos.z - camPos.z;
  var fl = Math.hypot(fx2, fz2) || 1; fx2 /= fl; fz2 /= fl;
  var rx = -fz2, rz = fx2;
  return { ix: clamp(wx * rx + wz * rz, -1, 1), iy: clamp(wx * fx2 + wz * fz2, -1, 1) };
}
function botInput() {
  var wx = 0, wz = 0;
  var want = player.hero === 'alex' ? 9.5 : 12.5;
  var dB = Math.hypot(player.pos.x - boss.pos.x, player.pos.z - boss.pos.z);

  if (boss.state === 'dead') {
    wx = NEST.x - player.pos.x; wz = (NEST.z - 12) - player.pos.z;     // 走进洞口收尾
  } else if (boss.atk > 0.02 &&
             Math.hypot(player.pos.x - boss.aimAt.x, player.pos.z - boss.aimAt.z) < CFG.SLAM_RADIUS + 3) {
    wx = player.pos.x - boss.aimAt.x; wz = player.pos.z - boss.aimAt.z;  // 躲开红圈
    if (Math.hypot(wx, wz) < 0.3) { wx = 1; wz = 0; }
  } else if (player.hero === 'victory' && player.gravStage === 0) {
    var best = null, bd = 1e9;
    for (var i = 0; i < rocks.length; i++) {
      if (rocks[i].userData.state !== 'idle') continue;
      var d = Math.hypot(rocks[i].position.x - player.pos.x, rocks[i].position.z - player.pos.z);
      if (d < bd) { bd = d; best = rocks[i]; }
    }
    if (best && bd > CFG.GRAV_PICK - 2.5) { wx = best.position.x - player.pos.x; wz = best.position.z - player.pos.z; }
    else { wx = boss.pos.x - player.pos.x; wz = boss.pos.z - player.pos.z; if (dB < want) { wx = -wx; wz = -wz; } }
  } else {
    wx = boss.pos.x - player.pos.x; wz = boss.pos.z - player.pos.z;
    if (dB < want - 1.5) { wx = -wx; wz = -wz; }
    else if (Math.abs(dB - want) < 1.5) {
      // 绕着守卫做切向移动（不是朝固定方向直线跑，否则会把自己带出脱战圈）
      wx = -(boss.pos.z - player.pos.z); wz = (boss.pos.x - player.pos.x);
    }
  }
  var l = Math.hypot(wx, wz) || 1;
  wx /= l; wz /= l; l = 1;
  // 别跑出脱战圈，不然战斗老是被打断
  var nd = Math.hypot(player.pos.x - NEST.x, player.pos.z - NEST.z);
  if (nd > CFG.LEASH - 6) {
    wx = wx * 0.35 + (NEST.x - player.pos.x) / nd * 0.65;
    wz = wz * 0.35 + (NEST.z - player.pos.z) / nd * 0.65;
    l = Math.hypot(wx, wz) || 1;
  }
  if (player.cd <= 0 && !over) fire();
  return worldToInput(wx / l, wz / l);
}

// ==========================================================================
//  胜 / 负 / 重来
// ==========================================================================
function showOverlay(html) { $('card').innerHTML = html; $('ov').classList.remove('hidden'); }
function win() {
  over = true; won = true;
  // 还在飞向玩家的水晶直接算进背包，别让结算显示 0
  player.gems += gems.length;
  for (var i = 0; i < gems.length; i++) scene.remove(gems[i]);
  gems.length = 0;
  $('gemN').textContent = player.gems;
  $('touch').classList.remove('on');
  showOverlay(
    '<h1 class="win">🏆 通过洞口！</h1>' +
    '<div class="sub">三头守卫倒下了，通往<b>雨林</b>的路打开了。<br>' +
    'Alex 和 Victory 继续往岛的深处走 —— 火山和城堡还在前面。</div>' +
    '<div class="stats">' +
      '<div class="stat"><b>' + player.gems + '</b><span>本关水晶</span></div>' +
      '<div class="stat"><b>' + Math.ceil(player.hp) + '</b><span>剩余生命</span></div>' +
      '<div class="stat"><b>100</b><span>城堡宝箱还差</span></div>' +
    '</div>' +
    '<div class="sub" style="opacity:.62;font-size:13px">下一关：雨林 · 火山 · 城堡 Boss（还没做）</div>' +
    '<div class="btn" onclick="location.reload()">再玩一次</div>');
}
function lose() {
  over = true;
  $('touch').classList.remove('on');
  showOverlay(
    '<h1 class="lose">💀 被守卫击倒了</h1>' +
    '<div class="sub">它砸地之前，地上会有<b>红圈</b>——看到就往圈外跑。<br>' +
    '跑出<b>黄圈</b>它就不追了，可以喘口气再打。</div>' +
    '<div class="stats"><div class="stat"><b>' +
      Math.round((1 - boss.hp / CFG.BOSS_HP) * 100) + '%</b><span>守卫被打掉</span></div></div>' +
    '<div class="btn" onclick="location.reload()">重新开始</div>');
}
function restart() {
  var keep = [];
  if (FF > 1) keep.push('ff=' + FF);
  if (BOT) keep.push('bot=1');
  if (AUDIT) keep.push('audit=1');
  keep.push('hero=' + player.hero);
  location.href = location.pathname + '?' + keep.join('&');
}

// ==========================================================================
//  主循环
// ==========================================================================
var started = false, clock, acc = 0;

function step(dt) {
  if (toastT > 0) { toastT -= dt; if (toastT <= 0) $('goal').innerHTML = goalHTML; }
  updateFx(dt);
  if (!started) return;

  if (!over) {
    var inp = window.__FROZEN__ ? { ix: 0, iy: 0 } : readInput();
    updatePlayer(dt, inp.ix, inp.iy);
    updateBoss(dt);
    updateRocks(dt);
  }
  updateGems(dt);

  // 打赢之后：堵洞口的石头塌下去，雨林的绿光透进来
  if (pathOpen) {
    openT += dt;
    for (var i = 0; i < caveRocks.length; i++) {
      var r = caveRocks[i];
      var t = clamp((openT - r.userData.fallDelay) / 1.5, 0, 1);
      r.position.y = Math.max(-4, r.userData.startY - t * 9);
      r.rotation.z += dt * t * 2;
    }
    caveLight.material.opacity = clamp((openT - 0.8) / 1.4, 0, 1) * 0.75;
    if (openT > 1.8 && !over) setGoal('<b>走进山洞</b> → 前往雨林');
  }

  // 技能按钮冷却灰显
  var btn = $('skillBtn');
  if (player.cd > 0) btn.classList.add('cool'); else btn.classList.remove('cool');

  // 海面轻轻起伏
  sea.position.y = -0.35 + Math.sin(performance.now() / 1400) * 0.12;
  boat.rotation.z = Math.sin(performance.now() / 1700) * 0.035;
}

function loop() {
  requestAnimationFrame(loop);
  if (FF > 1) {
    for (var i = 0; i < FF; i++) step(FIXED);          // 快进：一帧跑 FF 步（给自动验收用）
  } else {
    acc += Math.min(clock.getDelta(), 0.1);
    var n = 0;
    while (acc >= FIXED && n < 6) { step(FIXED); acc -= FIXED; n++; }
  }
  updateCamera(FF > 1 ? FIXED * FF : FIXED * 2);
  renderer.render(scene, camera);
}

// ==========================================================================
//  启动
// ==========================================================================
var chosen = 'alex';
function start() {
  buildPlayer(chosen);
  player.hp = CFG.PLAYER_HP;
  updatePlayerHud(); updateBossHud(); setSkillBtn(1);
  $('pName').innerHTML = chosen === 'alex'
    ? '⚡ ALEX <span class="tag">电力发明家</span>'
    : '🪐 VICTORY <span class="tag">重力魔法师</span>';
  $('ov').classList.add('hidden');
  var isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0 || Q.get('touch') === '1';
  if (isTouch) $('touch').classList.add('on');
  // 镜头先摆到位，避免开场"飞"过来
  camPos.set(player.pos.x, 5.0, player.pos.z + 10.5);
  camLook.set(player.pos.x, 1.9, player.pos.z - 4);
  started = true;
}

function boot() {
  initRender();
  buildWorld();
  buildBoss();
  buildRings();
  initInput();
  clock = new THREE.Clock();
  $('loading').classList.add('hidden');

  // 选角色
  var picks = document.querySelectorAll('.pick');
  for (var i = 0; i < picks.length; i++) {
    picks[i].addEventListener('click', function () {
      for (var j = 0; j < picks.length; j++) picks[j].classList.remove('sel');
      this.classList.add('sel');
      chosen = this.getAttribute('data-hero');
    });
  }
  $('startBtn').addEventListener('click', start);

  var pre = Q.get('hero');
  if (pre === 'alex' || pre === 'victory') { chosen = pre; start(); }
  if (AUDIT) runAudit();
  loop();
}

// ------------------------------------------------------------------ 数值体检
function runAudit() {
  var dodge = (CFG.SLAM_RADIUS + 1) / CFG.MOVE_SPEED;   // 从圈心跑出圈要多久
  var alexDps = CFG.ARC_DMG / CFG.ARC_CD;
  var vicDps  = CFG.GRAV_DMG / CFG.GRAV_CD;
  var lines = [
    '=== 怪物岛 · 第一关 数值体检 ===',
    '玩家 HP ' + CFG.PLAYER_HP + '，守卫一击 ' + CFG.SLAM_DMG + ' → 最多挨 ' +
      Math.ceil(CFG.PLAYER_HP / CFG.SLAM_DMG) + ' 下',
    '预警 ' + CFG.TELEGRAPH + 's，跑出红圈需 ' + dodge.toFixed(2) + 's → ' +
      (CFG.TELEGRAPH > dodge ? 'OK 躲得掉' : '!! 躲不掉，把 TELEGRAPH 调大 !!'),
    '玩家速度 ' + CFG.MOVE_SPEED + ' vs 守卫 ' + CFG.BOSS_SPEED + ' → ' +
      (CFG.MOVE_SPEED > CFG.BOSS_SPEED ? 'OK 跑得掉' : '!! 跑不掉 !!'),
    'Alex DPS ' + alexDps.toFixed(1) + '（射程 ' + CFG.ARC_RANGE + '，守卫够得着 ' + CFG.BOSS_REACH + '）',
    'Victory DPS ' + vicDps.toFixed(1) + '（射程不限，取石范围 ' + CFG.GRAV_PICK + '）',
    '两人 DPS 差 ' + Math.abs(alexDps - vicDps).toFixed(1) + ' → ' +
      (Math.abs(alexDps - vicDps) / Math.max(alexDps, vicDps) < 0.25 ? 'OK 大致平衡' : '!! 差太多 !!'),
    '理论击杀 Alex ' + (CFG.BOSS_HP / alexDps).toFixed(1) + 's / Victory ' +
      (CFG.BOSS_HP / vicDps).toFixed(1) + 's（不含躲避）',
    '领地：警告 ' + CFG.WARN_RING + ' / 开战 ' + CFG.TERRITORY + ' / 脱战 ' + CFG.LEASH +
      ' → ' + (CFG.LEASH > CFG.WARN_RING ? 'OK 跑得出去' : '!! 脱不了战 !!'),
    'Victory 可用石块 ' + rocks.length + ' 块'
  ];
  console.log(lines.join('\n'));
  window.__AUDIT__ = lines;
}

// 给自动验收脚本读的状态快照
window.__STATE__ = function () {
  return {
    started: started, over: over, won: won, pathOpen: pathOpen,
    hero: player.hero, playerHp: player.hp, bossHp: boss.hp,
    bossState: boss.state, gems: player.gems,
    bossAtk: +boss.atk.toFixed(2), telegraphing: boss.atk > 0,
    slams: boss.slams, hitsLanded: boss.hitsLanded,
    everWarned: boss.everWarned, everReturned: boss.everReturned,
    nestDist: +Math.hypot(player.pos.x - NEST.x, player.pos.z - NEST.z).toFixed(1),
    px: +player.pos.x.toFixed(2), pz: +player.pos.z.toFixed(2),
    bx: +boss.pos.x.toFixed(2), bz: +boss.pos.z.toFixed(2)
  };
};

// 自动验收脚本用的钩子：瞬移玩家、直接扣血，用来精确测试领地状态机和伤害
window.__DEV__ = {
  tp: function (x, z) { player.pos.set(x, 0, z); return window.__STATE__(); },
  hurtBoss: function (n) { damageBoss(n, null); return boss.hp; },
  freeze: function (v) { window.__FROZEN__ = !!v; },
  cfg: CFG
};

if (document.readyState === 'loading') addEventListener('DOMContentLoaded', boot);
else boot();

})();
