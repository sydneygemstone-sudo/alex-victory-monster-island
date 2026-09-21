// 纯战斗/行为逻辑：不依赖 DOM，可被 node --test 单测。

export const CFG = {
  playerHP: 100,
  playerSpeed: 6.5,
  monsterHP: 120,
  monsterSpeed: 3.4,
  guardHomeZ: -9.5,
  territoryR: 16,
  warnR: 13,
  attackR: 7.5,
  chaseStopDist: 3.4,
  slamRange: 4.6,
  slamRadius: 4.2,
  slamDmg: 24,
  telegraph: 0.9,
  slamCd: 2.4,
  attackRange: 22,
  crystalCount: 3,
  crystalMagnetR: 6,
  crystalPickupR: 1.7,
};

export const SKILLS = {
  alex:    { dmg: 11, cd: 0.7, speed: 30 },
  victory: { dmg: 17, cd: 2.0, speed: 20 },
};

export function applyDamage(hp, dmg) {
  return Math.max(0, Math.round((hp - dmg) * 100) / 100);
}

// 守卫状态机：远处不攻击 → 接近警戒 → 侵入领地才攻击；离开领地返回。
export function nextMonsterState(state, { distToPlayer, distToHome }) {
  switch (state) {
    case 'idle':
      return distToPlayer < CFG.warnR ? 'warn' : 'idle';
    case 'warn':
      if (distToPlayer < CFG.attackR) return 'chase';
      if (distToPlayer > CFG.warnR + 3) return 'idle';
      return 'warn';
    case 'chase':
      if (distToHome > CFG.territoryR) return 'return';
      if (distToPlayer > CFG.attackR + 2.5 && distToHome < CFG.territoryR) return 'chase'; // 仍在领地内继续追
      return 'chase';
    case 'return':
      if (distToHome <= 1.5) return 'idle';
      if (distToPlayer < CFG.attackR && distToHome < CFG.territoryR) return 'chase';
      return 'return';
    default:
      return 'idle';
  }
}

export function chaseStepAllowed(state, distToHome) {
  return state === 'chase' && distToHome <= CFG.territoryR;
}

export function slamHits(distToSlamCenter) {
  return distToSlamCenter <= CFG.slamRadius;
}

export function skillCanFire(cooldown) {
  return cooldown <= 0;
}

// 攻击辅助瞄准：守卫存活且在射程内才锁定。
export function shouldAimTarget(monsterAlive, distToMonster) {
  return monsterAlive && distToMonster <= CFG.attackRange;
}
