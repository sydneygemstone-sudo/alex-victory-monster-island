export const RULES = Object.freeze({ playerHealth: 100, guardianHealth: 360, speed: 7, warning: 18, territory: 12, leash: 21, attackRadius: 3.8, windup: 1.35, spawn: { x: 0, z: 20 }, home: { x: 0, z: -10 } });
export const HEROES = Object.freeze({ alex: { name: 'Alex', damage: 27, cooldown: 0.85, delay: 0.14, range: 16 }, victory: { name: 'Victory', damage: 54, cooldown: 1.65, delay: 0.95, range: 16 } });
const distance = (first, second) => Math.hypot(first.x - second.x, first.z - second.z);
const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));

export function createGame(hero = 'alex') {
  return {
    hero, phase: 'playing', time: 0, reward: 0, events: [], pending: [],
    player: { ...RULES.spawn, hp: RULES.playerHealth, cooldown: 0, dashCooldown: 0, dashTime: 0, flash: 0, facing: Math.PI },
    guardian: { ...RULES.home, hp: RULES.guardianHealth, state: 'idle', timer: 0, flash: 0, target: null, attacks: 0 },
    stats: { casts: 0, hits: 0, damageTaken: 0, dodges: 0 }
  };
}

function emit(game, type, details = {}) {
  game.events.push({ type, ...details });
}

export function cast(game) {
  const hero = HEROES[game.hero];
  if (game.phase !== 'playing' || game.player.cooldown > 0 || game.player.hp <= 0) return false;
  if (distance(game.player, game.guardian) > hero.range || ['idle', 'warning', 'returning'].includes(game.guardian.state)) {
    emit(game, 'outOfRange');
    return false;
  }
  game.player.cooldown = hero.cooldown;
  game.pending.push({ remaining: hero.delay, damage: hero.damage });
  game.stats.casts++;
  emit(game, 'cast', { hero: game.hero, from: { x: game.player.x, z: game.player.z }, to: { x: game.guardian.x, z: game.guardian.z } });
  return true;
}

export function dash(game) {
  if (!['playing', 'cleared'].includes(game.phase) || game.player.dashCooldown > 0) return false;
  game.player.dashCooldown = 3.2;
  game.player.dashTime = 0.23;
  emit(game, 'dash');
  return true;
}

export function step(game, delta, input = {}) {
  game.events = [];
  if (!['playing', 'cleared'].includes(game.phase)) return;
  const elapsed = clamp(delta, 0, 0.05);
  game.time += elapsed;
  const player = game.player;
  const guardian = game.guardian;
  player.cooldown = Math.max(0, player.cooldown - elapsed);
  player.dashCooldown = Math.max(0, player.dashCooldown - elapsed);
  player.dashTime = Math.max(0, player.dashTime - elapsed);
  player.flash = Math.max(0, player.flash - elapsed);
  guardian.flash = Math.max(0, guardian.flash - elapsed);
  if (input.dash) dash(game);
  const movementLength = Math.hypot(input.x || 0, input.z || 0);
  if (movementLength > 0.05) {
    const divisor = Math.max(1, movementLength);
    const speed = RULES.speed * (player.dashTime > 0 ? 2.6 : 1);
    player.x = clamp(player.x + input.x / divisor * speed * elapsed, -17, 17);
    player.z = clamp(player.z + input.z / divisor * speed * elapsed, guardian.hp > 0 ? -16 : -25, 23);
    player.facing = Math.atan2(input.x, input.z);
  }
  if (player.z < -15 && Math.abs(player.x) > 4.3) player.z = -15;
  if (guardian.hp > 0) {
    const separation = distance(player, guardian);
    if (separation < 3.2) {
      const directionX = separation < 0.01 ? 0 : (player.x - guardian.x) / separation;
      const directionZ = separation < 0.01 ? 1 : (player.z - guardian.z) / separation;
      player.x = clamp(guardian.x + directionX * 3.2, -17, 17);
      player.z = clamp(guardian.z + directionZ * 3.2, -16, 23);
    }
  }
  if (game.phase === 'cleared') {
    if (player.z < -21 && Math.abs(player.x) < 4.3) {
      game.phase = 'won';
      emit(game, 'won');
    }
    return;
  }
  const homeDistance = distance(player, RULES.home);
  if (homeDistance > RULES.leash && !['idle', 'warning', 'returning'].includes(guardian.state)) {
    guardian.state = 'returning';
    guardian.target = null;
    guardian.hp = RULES.guardianHealth;
    game.pending = [];
    emit(game, 'retreat');
  }
  if (guardian.state === 'returning') {
    const remaining = distance(guardian, RULES.home);
    if (remaining < 0.15) guardian.state = 'idle';
    else {
      guardian.x += (RULES.home.x - guardian.x) / remaining * Math.min(remaining, elapsed * 5);
      guardian.z += (RULES.home.z - guardian.z) / remaining * Math.min(remaining, elapsed * 5);
    }
  } else if (guardian.state === 'idle' || guardian.state === 'warning') {
    const previous = guardian.state;
    guardian.state = homeDistance < RULES.warning ? 'warning' : 'idle';
    if (guardian.state === 'warning' && previous === 'idle') emit(game, 'warning');
    if (homeDistance < RULES.territory) {
      guardian.state = 'chase';
      guardian.timer = 0.65;
      emit(game, 'engaged');
    }
  } else if (guardian.state === 'chase') {
    guardian.timer -= elapsed;
    const separation = distance(player, guardian);
    if (separation > 6) {
      guardian.x += (player.x - guardian.x) / separation * elapsed * 2;
      guardian.z += (player.z - guardian.z) / separation * elapsed * 2;
      const fromHome = distance(guardian, RULES.home);
      if (fromHome > 5) {
        guardian.x = RULES.home.x + (guardian.x - RULES.home.x) / fromHome * 5;
        guardian.z = RULES.home.z + (guardian.z - RULES.home.z) / fromHome * 5;
      }
    }
    if (guardian.timer <= 0 && separation < 17) {
      guardian.state = 'windup';
      guardian.timer = RULES.windup;
      guardian.target = { x: player.x, z: player.z };
      emit(game, 'telegraph', { ...guardian.target });
    }
  } else if (guardian.state === 'windup') {
    guardian.timer -= elapsed;
    if (guardian.timer <= 0) {
      guardian.attacks++;
      const target = guardian.target;
      emit(game, 'slam', { ...target });
      if (distance(player, target) < RULES.attackRadius) {
        player.hp = Math.max(0, player.hp - 28);
        player.flash = 0.4;
        game.stats.damageTaken += 28;
        emit(game, 'hurt', { damage: 28 });
      } else {
        game.stats.dodges++;
        emit(game, 'dodged');
      }
      guardian.state = 'recover';
      guardian.timer = 1.2;
      guardian.target = null;
    }
  } else if (guardian.state === 'recover') {
    guardian.timer -= elapsed;
    if (guardian.timer <= 0) {
      guardian.state = 'chase';
      guardian.timer = 0.5;
    }
  }
  if (player.hp <= 0) {
    game.phase = 'lost';
    game.pending = [];
    emit(game, 'lost');
    return;
  }
  if (input.attack) cast(game);
  for (const hit of game.pending) {
    hit.remaining -= elapsed;
    if (hit.remaining <= 0 && guardian.state !== 'returning') {
      guardian.hp = Math.max(0, guardian.hp - hit.damage);
      guardian.flash = 0.2;
      game.stats.hits++;
      emit(game, 'hit', { damage: hit.damage });
    }
  }
  game.pending = game.pending.filter(hit => hit.remaining > 0);
  if (guardian.hp <= 0) {
    guardian.state = 'defeated';
    guardian.target = null;
    game.pending = [];
    game.phase = 'cleared';
    game.reward = 8;
    emit(game, 'cleared');
  }
}
