const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const hpText = document.getElementById('hpText');
const shardText = document.getElementById('shardText');
const stormText = document.getElementById('stormText');
const coinText = document.getElementById('coinText');
const levelNameEl = document.getElementById('levelName');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlayTitle');
const overlayText = document.getElementById('overlayText');
const overlayInfo = document.getElementById('overlayInfo');
const startButton = document.getElementById('startButton');
const upgradesList = document.getElementById('upgradesList');
const fullscreenButton = document.getElementById('fullscreenButton');
const pauseButton = document.getElementById('pauseButton');
const upgradesPanel = document.querySelector('.upgrades-panel');
const layoutEl = document.querySelector('.layout');

const WORLD = {
  width: canvas.width,
  height: canvas.height,
};

const COIN_PER_KILL_MIN = 1;
const COIN_PER_KILL_MAX = 5;

// ---------------------------------------------------------------------------
// Level definitions: 10 hand-tuned levels plus a final boss encounter.
// Shard count increases every level (starting at 4) and there is no magnetic
// pull — the player must fly directly over a shard to collect it. Enemy
// speed/health/spawn rate ramp up steadily for a difficulty climb toward the
// finale.
// ---------------------------------------------------------------------------
const LEVELS = [
  {
    name: 'Level 1: The Shipyard Docks', shards: 4, spawnBase: 2.0, spawnMin: 1.05,
    enemySpeed: 34, enemyHp: 1.6, stormSpeed: 0.04,
    skyTop: [110, 130, 200], skyBottom: [10, 14, 30], accent: '#77d7ff',
  },
  {
    name: 'Level 2: The Grassy Plains', shards: 5, spawnBase: 1.75, spawnMin: 0.92,
    enemySpeed: 44, enemyHp: 2.1, stormSpeed: 0.055,
    skyTop: [95, 140, 190], skyBottom: [10, 16, 34], accent: '#8fe3d8',
  },
  {
    name: 'Level 3: Lanternwatch Village', shards: 6, spawnBase: 1.5, spawnMin: 0.8,
    enemySpeed: 52, enemyHp: 2.7, stormSpeed: 0.07,
    skyTop: [120, 110, 210], skyBottom: [12, 12, 32], accent: '#be7cff',
  },
  {
    name: 'Level 4: The Whispering Forest', shards: 7, spawnBase: 1.25, spawnMin: 0.66,
    enemySpeed: 62, enemyHp: 3.4, stormSpeed: 0.085,
    skyTop: [190, 140, 90], skyBottom: [30, 16, 12], accent: '#ffb56b',
  },
  {
    name: 'Level 5: The Embercrown Cave', shards: 8, spawnBase: 1.05, spawnMin: 0.56,
    enemySpeed: 72, enemyHp: 4.2, stormSpeed: 0.1,
    skyTop: [200, 90, 70], skyBottom: [32, 10, 14], accent: '#ff7a59',
  },
  {
    name: 'Level 6: Deepstone Caverns', shards: 9, spawnBase: 0.9, spawnMin: 0.48,
    enemySpeed: 84, enemyHp: 5.1, stormSpeed: 0.12,
    skyTop: [80, 100, 210], skyBottom: [8, 10, 30], accent: '#77aaff',
  },
  {
    name: 'Level 7: The Cave Mouth', shards: 10, spawnBase: 0.76, spawnMin: 0.4,
    enemySpeed: 96, enemyHp: 6.1, stormSpeed: 0.14,
    skyTop: [70, 60, 120], skyBottom: [6, 6, 18], accent: '#c58cff',
  },
  {
    name: 'Level 8: Mountainclimb Path', shards: 11, spawnBase: 0.63, spawnMin: 0.33,
    enemySpeed: 110, enemyHp: 7.3, stormSpeed: 0.16, floaterInterval: 5,
    skyTop: [60, 50, 90], skyBottom: [5, 5, 14], accent: '#ff8fd0',
  },
  {
    name: 'Level 9: The Snowline Path', shards: 12, spawnBase: 0.5, spawnMin: 0.26,
    enemySpeed: 126, enemyHp: 8.7, stormSpeed: 0.185, floaterInterval: 4.5,
    skyTop: [140, 40, 40], skyBottom: [20, 4, 6], accent: '#ff5c5c',
  },
  {
    name: 'Level 10: Volcano Summit', shards: 13, spawnBase: 0.38, spawnMin: 0.2,
    enemySpeed: 144, enemyHp: 10.5, stormSpeed: 0.22, floaterInterval: 3.5,
    skyTop: [40, 10, 10], skyBottom: [4, 2, 6], accent: '#ffdc7a',
  },
  {
    name: 'Level 11: The Lava Trial Chamber', shards: 0, spawnBase: Infinity, spawnMin: Infinity,
    enemySpeed: 52, enemyHp: 15000, stormSpeed: 0.28, isBoss: true,
    skyTop: [18, 55, 90], skyBottom: [3, 5, 18], accent: '#9fe7ff',
  },
];

// ---------------------------------------------------------------------------
// Upgrade definitions. Costs scale up with each purchased level.
// ---------------------------------------------------------------------------
const UPGRADE_DEFS = {
  health: {
    name: 'Vitality Core', icon: '❤', maxLevel: 6, baseCost: 40, growth: 1.45,
    describe: (lvl) => `+${lvl * 20} Max HP (currently +${lvl * 20})`,
  },
  damage: {
    name: 'Overcharged Rounds', icon: '⚔', maxLevel: 6, baseCost: 50, growth: 1.5,
    describe: (lvl) => `+${lvl} bolt damage`,
  },
  fireRate: {
    name: 'Rapid Cycler', icon: '⚡', maxLevel: 5, baseCost: 45, growth: 1.5,
    describe: (lvl) => `${Math.round((1 - Math.pow(0.88, lvl)) * 100)}% faster firing`,
  },
  doubleCannon: {
    name: 'Twin Cannons', icon: '🔱', maxLevel: 3, baseCost: 90, growth: 1.7,
    describe: (lvl) => `+${lvl} parallel shot${lvl === 1 ? '' : 's'} per volley`,
  },
  drones: {
    name: 'Aether Drone', icon: '🛸', maxLevel: 3, baseCost: 130, growth: 1.8,
    describe: (lvl) => `${lvl} orbiting drone${lvl === 1 ? '' : 's'} firing at nearby foes`,
  },
  forcefield: {
    name: 'Storm Ward', icon: '🛡', maxLevel: 4, baseCost: 110, growth: 1.6,
    describe: (lvl) => `${lvl} shield charge${lvl === 1 ? '' : 's'} that block incoming hits`,
  },
  turret: {
    name: 'Sentry Turret', icon: '🗼', maxLevel: 3, baseCost: 150, growth: 1.75, unlockLevelIndex: 7,
    describe: (lvl) => `Deploy up to ${lvl} turret${lvl === 1 ? '' : 's'} (50 HP each, press T to place)`,
  },
  droneOverdrive: {
    name: 'Drone Overdrive', icon: '🛰', maxLevel: 3, baseCost: 160, growth: 1.75, unlockLevelIndex: 7,
    describe: (lvl) => `Aether Drones deal +${lvl * 35}% damage and fire ${Math.round((1 - Math.pow(0.75, lvl)) * 100)}% faster`,
  },
  piercing: {
    name: 'Piercing Rounds', icon: '➶', maxLevel: 3, baseCost: 140, growth: 1.7, unlockLevelIndex: 7,
    describe: (lvl) => `Main bolts pierce through ${lvl} extra ${lvl === 1 ? 'enemy' : 'enemies'}`,
  },
  regenCore: {
    name: 'Nano Regen Core', icon: '💠', maxLevel: 3, baseCost: 130, growth: 1.65, unlockLevelIndex: 7,
    describe: (lvl) => `Regenerate ${(lvl * 1.5).toFixed(1)} HP per second`,
  },
  kineticBarrier: {
    name: 'Kinetic Barrier', icon: '🌀', maxLevel: 3, baseCost: 145, growth: 1.7, unlockLevelIndex: 7,
    describe: (lvl) => `${lvl * 15}% less contact damage taken`,
  },
};

const keys = {};
const pointer = { x: WORLD.width / 2, y: WORLD.height / 2, down: false };

let gameState = 'menu'; // menu | playing | paused | levelComplete | gameOver | victory
let lastTime = 0;
let coins = 0;
let levelIndex = 0;
let stormPhase = 0;
let spawnTimer = 0;
let particles = [];
let projectiles = [];
let droneProjectiles = [];
let enemyProjectiles = [];
let enemies = [];
let shards = [];
let turrets = [];
let player = null;
let bossSpawned = false;
let bossSummonTimer = 0;
let floaterSpawnTimer = Infinity;

const upgrades = {
  health: 0,
  damage: 0,
  fireRate: 0,
  doubleCannon: 0,
  drones: 0,
  forcefield: 0,
  turret: 0,
  droneOverdrive: 0,
  piercing: 0,
  regenCore: 0,
  kineticBarrier: 0,
};

function currentLevel() {
  return LEVELS[levelIndex];
}

function upgradeCost(key) {
  const def = UPGRADE_DEFS[key];
  const lvl = upgrades[key];
  return Math.round(def.baseCost * Math.pow(def.growth, lvl));
}

function baseMaxHp() {
  return 100 + upgrades.health * 20;
}

function baseFireRate() {
  return 0.32 * Math.pow(0.88, upgrades.fireRate);
}

function baseDamage() {
  return 1 + upgrades.damage;
}

function initPlayer(preserveHpRatio) {
  const maxHp = baseMaxHp();
  const hp = preserveHpRatio != null ? Math.min(maxHp, maxHp * preserveHpRatio) : maxHp;

  return {
    x: WORLD.width / 2,
    y: WORLD.height / 2,
    radius: 18,
    speed: 240,
    cooldown: 0,
    hp,
    maxHp,
    damageFlash: 0,
    shield: upgrades.forcefield,
    shieldMax: upgrades.forcefield,
    shieldRegen: 0,
    droneAngle: 0,
  };
}

function buildShardsForLevel() {
  const level = currentLevel();
  const list = [];

  for (let i = 0; i < level.shards; i += 1) {
    const angle = (Math.PI * 2 * i) / level.shards + Math.PI / 6;
    const radiusX = WORLD.width * 0.34;
    const radiusY = WORLD.height * 0.3;

    list.push({
      id: i,
      x: WORLD.width / 2 + Math.cos(angle) * radiusX,
      y: WORLD.height / 2 + Math.sin(angle) * radiusY,
      radius: 12,
      pulse: Math.random() * Math.PI * 2,
      collected: false,
    });
  }

  return list;
}

function startLevel(index, preserveHpRatio) {
  levelIndex = index;
  const level = currentLevel();

  stormPhase = 0;
  spawnTimer = level.spawnBase;
  floaterSpawnTimer = level.floaterInterval || Infinity;
  particles = [];
  projectiles = [];
  droneProjectiles = [];
  enemyProjectiles = [];
  enemies = [];
  turrets = [];
  bossSpawned = false;
  bossSummonTimer = 0;
  shards = buildShardsForLevel();
  player = initPlayer(preserveHpRatio);

  levelNameEl.textContent = level.name;
  updateHud();
  renderUpgradePanel();
}

function resetRun() {
  coins = 0;
  upgrades.health = 0;
  upgrades.damage = 0;
  upgrades.fireRate = 0;
  upgrades.doubleCannon = 0;
  upgrades.drones = 0;
  upgrades.forcefield = 0;
  upgrades.turret = 0;
  upgrades.droneOverdrive = 0;
  upgrades.piercing = 0;
  upgrades.regenCore = 0;
  upgrades.kineticBarrier = 0;
  startLevel(0, null);
}

// Restarts the level the player died on without touching coins or upgrades,
// so progress purchased with earned coins is never lost on death.
function retryLevel() {
  startLevel(levelIndex, null);
}

function updateHud() {
  hpText.textContent = `${Math.max(0, Math.ceil(player.hp))} / ${player.maxHp}`;
  const collected = shards.filter((s) => s.collected).length;
  if (currentLevel().isBoss) {
    const boss = enemies.find((enemy) => enemy.isBoss);
    shardText.textContent = boss ? `BOSS ${Math.max(0, Math.ceil(boss.hp))}` : 'BOSS READY';
  } else {
    shardText.textContent = `${collected} / ${currentLevel().shards}`;
  }
  coinText.textContent = `🪙 ${coins}`;

  if (stormPhase < 0.35) {
    stormText.textContent = 'CALM';
  } else if (stormPhase < 0.7) {
    stormText.textContent = 'RISING';
  } else {
    stormText.textContent = 'UNLEASHED';
  }
}

// Keeps references to each upgrade card's dynamic elements so the panel can be
// cheaply refreshed every frame (button enabled/disabled + cost) without tearing
// down and recreating the DOM, which previously broke click handling because the
// buttons were destroyed mid-click on every animation frame.
const upgradeCardRefs = {};

function renderUpgradePanel() {
  upgradesList.innerHTML = '';

  Object.keys(UPGRADE_DEFS).forEach((key) => {
    const def = UPGRADE_DEFS[key];
    const lvl = upgrades[key];
    const maxed = lvl >= def.maxLevel;
    const locked = def.unlockLevelIndex !== undefined && levelIndex < def.unlockLevelIndex;
    const cost = maxed || locked ? null : upgradeCost(key);

    const card = document.createElement('div');
    card.className = `upgrade-card${maxed ? ' maxed' : ''}${locked ? ' locked' : ''}`;

    const head = document.createElement('div');
    head.className = 'upgrade-head';
    head.innerHTML = `<span class="upgrade-name">${def.icon} ${def.name}</span><span class="upgrade-level">${lvl}/${def.maxLevel}</span>`;

    const desc = document.createElement('p');
    desc.className = 'upgrade-desc';
    desc.textContent = locked
      ? `🔒 Unlocks at ${LEVELS[def.unlockLevelIndex].name}`
      : lvl > 0 ? def.describe(lvl) : 'Not yet purchased';

    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = locked ? 'Locked' : maxed ? 'Maxed Out' : `Buy — 🪙 ${cost}`;
    button.disabled = locked || maxed || coins < cost;
    button.addEventListener('click', () => buyUpgrade(key));

    card.appendChild(head);
    card.appendChild(desc);
    card.appendChild(button);
    upgradesList.appendChild(card);

    upgradeCardRefs[key] = { button, maxed: maxed || locked, cost };
  });
}

// Cheap per-frame refresh: only touches disabled state, never recreates nodes.
function refreshUpgradeAffordability() {
  Object.keys(UPGRADE_DEFS).forEach((key) => {
    const ref = upgradeCardRefs[key];
    if (!ref || ref.maxed) return;
    ref.button.disabled = coins < ref.cost;
  });
}

function buyUpgrade(key) {
  const def = UPGRADE_DEFS[key];
  const lvl = upgrades[key];
  if (lvl >= def.maxLevel) return;

  const cost = upgradeCost(key);
  if (coins < cost) return;

  coins -= cost;
  upgrades[key] += 1;

  if (key === 'health' && player) {
    const ratio = player.hp / player.maxHp;
    player.maxHp = baseMaxHp();
    player.hp = Math.min(player.maxHp, player.maxHp * ratio + 20);
  }

  if (key === 'forcefield' && player) {
    player.shieldMax = upgrades.forcefield;
    player.shield = Math.min(player.shieldMax, player.shield + 1);
  }

  updateHud();
  renderUpgradePanel();
}

function showOverlay(title, text, buttonLabel, showInfo = false) {
  overlayTitle.textContent = title;
  overlayText.textContent = text;
  startButton.textContent = buttonLabel;
  overlayInfo.classList.toggle('visible', showInfo);
  overlay.classList.add('visible');
}

function hideOverlay() {
  overlay.classList.remove('visible');
}

function spawnEnemy() {
  const level = currentLevel();
  const side = Math.floor(Math.random() * 4);
  const padding = 32;
  let x = 0;
  let y = 0;

  if (side === 0) {
    x = Math.random() * WORLD.width;
    y = -padding;
  } else if (side === 1) {
    x = WORLD.width + padding;
    y = Math.random() * WORLD.height;
  } else if (side === 2) {
    x = Math.random() * WORLD.width;
    y = WORLD.height + padding;
  } else {
    x = -padding;
    y = Math.random() * WORLD.height;
  }

  const hp = level.enemyHp * (0.85 + Math.random() * 0.3);

  enemies.push({
    x,
    y,
    radius: 15 + Math.random() * 9,
    speed: level.enemySpeed * (0.85 + Math.random() * 0.3),
    hp,
    maxHp: hp,
    hitFlash: 0,
  });
}

function spawnBoss() {
  const level = currentLevel();
  const hp = level.enemyHp;

  enemies.push({
    x: WORLD.width / 2,
    y: 110,
    radius: 52,
    speed: level.enemySpeed,
    hp,
    maxHp: hp,
    hitFlash: 0,
    isBoss: true,
    attackTimer: 3,
    isWindingUp: false,
    windupTime: 0,
    attackTargetX: WORLD.width / 2,
    attackTargetY: WORLD.height / 2,
  });
  bossSpawned = true;
  bossSummonTimer = 3.5;
  createBurst(WORLD.width / 2, 110, '#9fe7ff', 32);
}

function spawnBossMinion() {
  const level = currentLevel();
  const side = Math.floor(Math.random() * 4);
  const padding = 42;
  let x = 0;
  let y = 0;

  if (side === 0) {
    x = Math.random() * WORLD.width;
    y = -padding;
  } else if (side === 1) {
    x = WORLD.width + padding;
    y = Math.random() * WORLD.height;
  } else if (side === 2) {
    x = Math.random() * WORLD.width;
    y = WORLD.height + padding;
  } else {
    x = -padding;
    y = Math.random() * WORLD.height;
  }

  const hp = 8 + Math.random() * 4;
  enemies.push({
    x,
    y,
    radius: 13 + Math.random() * 5,
    speed: level.enemySpeed * (1.2 + Math.random() * 0.25),
    hp,
    maxHp: hp,
    hitFlash: 0,
    isMinion: true,
  });
  createBurst(x, y, '#c58cff', 10);
}

function spawnFloater() {
  const level = currentLevel();
  const side = Math.floor(Math.random() * 4);
  const padding = 40;
  let x = 0;
  let y = 0;

  if (side === 0) {
    x = Math.random() * WORLD.width;
    y = -padding;
  } else if (side === 1) {
    x = WORLD.width + padding;
    y = Math.random() * WORLD.height;
  } else if (side === 2) {
    x = Math.random() * WORLD.width;
    y = WORLD.height + padding;
  } else {
    x = -padding;
    y = Math.random() * WORLD.height;
  }

  const hp = level.enemyHp * 2.4;

  enemies.push({
    x,
    y,
    radius: 20,
    speed: 60 + level.enemySpeed * 0.35,
    hp,
    maxHp: hp,
    hitFlash: 0,
    isFloater: true,
    shootCooldown: 1 + Math.random(),
  });
  createBurst(x, y, '#ff8f4d', 12);
}

function spawnBossFloater() {
  const level = currentLevel();
  const side = Math.floor(Math.random() * 4);
  const padding = 40;
  let x = 0;
  let y = 0;

  if (side === 0) {
    x = Math.random() * WORLD.width;
    y = -padding;
  } else if (side === 1) {
    x = WORLD.width + padding;
    y = Math.random() * WORLD.height;
  } else if (side === 2) {
    x = Math.random() * WORLD.width;
    y = WORLD.height + padding;
  } else {
    x = -padding;
    y = Math.random() * WORLD.height;
  }

  const hp = 26 + Math.random() * 10;

  enemies.push({
    x,
    y,
    radius: 20,
    speed: 60 + level.enemySpeed * 0.35,
    hp,
    maxHp: hp,
    hitFlash: 0,
    isFloater: true,
    shootCooldown: 1 + Math.random(),
  });
  createBurst(x, y, '#ff8f4d', 12);
}

function placeTurret() {
  if (gameState !== 'playing') return;
  const maxTurrets = upgrades.turret;
  if (maxTurrets <= 0) return;
  if (turrets.length >= maxTurrets) return;

  turrets.push({
    x: player.x,
    y: player.y,
    radius: 16,
    hp: 50,
    maxHp: 50,
    cooldown: 0,
  });
  createBurst(player.x, player.y, '#77d7ff', 14);
}

function updateTurrets(dt) {
  const turretRange = 260;

  for (const turret of turrets) {
    turret.cooldown = Math.max(0, turret.cooldown - dt);

    let nearest = null;
    let nearestDist = Infinity;

    for (const enemy of enemies) {
      const dx = enemy.x - turret.x;
      const dy = enemy.y - turret.y;
      const dist = Math.hypot(dx, dy);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = enemy;
      }
    }

    if (nearest && nearestDist < turretRange && turret.cooldown <= 0) {
      const dx = nearest.x - turret.x;
      const dy = nearest.y - turret.y;
      const len = Math.hypot(dx, dy) || 1;

      droneProjectiles.push({
        x: turret.x,
        y: turret.y,
        vx: (dx / len) * 340,
        vy: (dy / len) * 340,
        radius: 5,
        life: 1.3,
        damage: 3 + upgrades.turret,
      });

      turret.cooldown = 0.9;
    }
  }
}

function fireProjectile() {
  if (player.cooldown > 0) return;

  const dx = pointer.x - player.x;
  const dy = pointer.y - player.y;
  const length = Math.hypot(dx, dy) || 1;
  const dirX = dx / length;
  const dirY = dy / length;
  const perpX = -dirY;
  const perpY = dirX;

  const barrels = 1 + upgrades.doubleCannon;
  const spacing = 10;
  const damage = baseDamage();

  for (let i = 0; i < barrels; i += 1) {
    const offset = (i - (barrels - 1) / 2) * spacing;

    projectiles.push({
      x: player.x + dirX * 22 + perpX * offset,
      y: player.y + dirY * 22 + perpY * offset,
      vx: dirX * 460,
      vy: dirY * 460,
      radius: 5,
      life: 1.2,
      damage,
      pierceRemaining: upgrades.piercing,
    });
  }

  player.cooldown = baseFireRate();
}

function updateDrones(dt) {
  const droneCount = upgrades.drones;
  if (droneCount === 0) return;

  const overdriveDamageMult = 1 + upgrades.droneOverdrive * 0.35;
  const overdriveFireMult = Math.pow(0.75, upgrades.droneOverdrive);

  player.droneAngle += dt * 1.4;

  for (let i = 0; i < droneCount; i += 1) {
    const angle = player.droneAngle + (Math.PI * 2 * i) / droneCount;
    const orbitRadius = 52;
    const dx = Math.cos(angle) * orbitRadius;
    const dy = Math.sin(angle) * orbitRadius;
    const droneX = player.x + dx;
    const droneY = player.y + dy;

    let nearest = null;
    let nearestDist = Infinity;

    for (const enemy of enemies) {
      const ex = enemy.x - droneX;
      const ey = enemy.y - droneY;
      const dist = Math.hypot(ex, ey);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = enemy;
      }
    }

    const droneKey = `drone${i}`;
    if (!player.droneCooldowns) player.droneCooldowns = {};
    if (player.droneCooldowns[droneKey] === undefined) player.droneCooldowns[droneKey] = 0;
    player.droneCooldowns[droneKey] = Math.max(0, player.droneCooldowns[droneKey] - dt);

    if (nearest && nearestDist < 260 && player.droneCooldowns[droneKey] <= 0) {
      const ex = nearest.x - droneX;
      const ey = nearest.y - droneY;
      const len = Math.hypot(ex, ey) || 1;

      droneProjectiles.push({
        x: droneX,
        y: droneY,
        vx: (ex / len) * 380,
        vy: (ey / len) * 380,
        radius: 4,
        life: 1.0,
        damage: Math.max(1, Math.round(baseDamage() * 0.6 * overdriveDamageMult)),
      });

      player.droneCooldowns[droneKey] = 0.7 * overdriveFireMult;
    }

    player.drones = player.drones || [];
    player.drones[i] = { x: droneX, y: droneY };
  }

  player.drones = player.drones.slice(0, droneCount);
}

function createBurst(x, y, color, count = 10) {
  for (let i = 0; i < count; i += 1) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.8;
    const speed = 30 + Math.random() * 90;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.6 + Math.random() * 0.5,
      color,
      radius: 2 + Math.random() * 4,
    });
  }
}

function damagePlayer(amount) {
  if (player.shield > 0) {
    player.shield -= 1;
    player.shieldRegen = 6;
    createBurst(player.x, player.y, '#9fe7ff', 10);
    return;
  }

  player.hp -= amount;
  player.damageFlash = 1;
}

function update(dt) {
  if (gameState !== 'playing') return;

  const level = currentLevel();
  stormPhase = (stormPhase + dt * level.stormSpeed) % 1;
  player.cooldown = Math.max(0, player.cooldown - dt);
  player.damageFlash = Math.max(0, player.damageFlash - dt * 2.5);

  if (player.shieldMax > 0) {
    if (player.shield < player.shieldMax) {
      player.shieldRegen -= dt;
      if (player.shieldRegen <= 0) {
        player.shield += 1;
        player.shieldRegen = 6;
      }
    }
  }

  if (upgrades.regenCore > 0) {
    player.hp = Math.min(player.maxHp, player.hp + upgrades.regenCore * 1.5 * dt);
  }

  let moveX = 0;
  let moveY = 0;

  if (keys['w'] || keys['arrowup']) moveY -= 1;
  if (keys['s'] || keys['arrowdown']) moveY += 1;
  if (keys['a'] || keys['arrowleft']) moveX -= 1;
  if (keys['d'] || keys['arrowright']) moveX += 1;

  const length = Math.hypot(moveX, moveY) || 1;
  player.x += (moveX / length) * player.speed * dt;
  player.y += (moveY / length) * player.speed * dt;

  player.x = Math.max(player.radius, Math.min(WORLD.width - player.radius, player.x));
  player.y = Math.max(player.radius, Math.min(WORLD.height - player.radius, player.y));

  if (pointer.down || keys[' ']) {
    fireProjectile();
  }

  updateDrones(dt);
  updateTurrets(dt);

  for (const projectile of projectiles) {
    projectile.x += projectile.vx * dt;
    projectile.y += projectile.vy * dt;
    projectile.life -= dt;
    if (projectile.x < -10 || projectile.x > WORLD.width + 10 || projectile.y < -10 || projectile.y > WORLD.height + 10 || projectile.life <= 0) {
      projectile.dead = true;
    }
  }
  projectiles = projectiles.filter((p) => !p.dead);

  for (const projectile of droneProjectiles) {
    projectile.x += projectile.vx * dt;
    projectile.y += projectile.vy * dt;
    projectile.life -= dt;
    if (projectile.x < -10 || projectile.x > WORLD.width + 10 || projectile.y < -10 || projectile.y > WORLD.height + 10 || projectile.life <= 0) {
      projectile.dead = true;
    }
  }
  droneProjectiles = droneProjectiles.filter((p) => !p.dead);

  const barrierReduction = 1 - Math.min(0.85, upgrades.kineticBarrier * 0.15);

  for (const projectile of enemyProjectiles) {
    projectile.x += projectile.vx * dt;
    projectile.y += projectile.vy * dt;
    projectile.life -= dt;
    if (projectile.x < -20 || projectile.x > WORLD.width + 20 || projectile.y < -20 || projectile.y > WORLD.height + 20 || projectile.life <= 0) {
      projectile.dead = true;
    }

    if (!projectile.dead) {
      const pdx = projectile.x - player.x;
      const pdy = projectile.y - player.y;
      if (Math.hypot(pdx, pdy) <= projectile.radius + player.radius) {
        damagePlayer(projectile.damage * barrierReduction);
        createBurst(player.x, player.y, '#ff9d52', 6);
        projectile.dead = true;
      }
    }
  }
  enemyProjectiles = enemyProjectiles.filter((p) => !p.dead);

  spawnTimer -= dt;
  if (level.isBoss && !bossSpawned) {
    spawnBoss();
  } else if (!level.isBoss && spawnTimer <= 0) {
    spawnEnemy();
    spawnTimer = Math.max(level.spawnMin, level.spawnBase - stormPhase * (level.spawnBase - level.spawnMin));
  }

  if (level.floaterInterval) {
    floaterSpawnTimer -= dt;
    if (floaterSpawnTimer <= 0) {
      spawnFloater();
      floaterSpawnTimer = level.floaterInterval;
    }
  }

  if (level.isBoss && bossSpawned) {
    const boss = enemies.find((enemy) => enemy.isBoss);

    bossSummonTimer -= dt;
    const minionCount = enemies.filter((enemy) => enemy.isMinion || enemy.isFloater).length;
    if (bossSummonTimer <= 0 && minionCount < 10) {
      spawnBossMinion();
      spawnBossMinion();
      if (minionCount < 6) spawnBossMinion();
      spawnBossFloater();
      bossSummonTimer = 4;
    }

    if (boss) {
      if (boss.isWindingUp) {
        boss.windupTime -= dt;
        if (boss.windupTime <= 0) {
          const dx = boss.attackTargetX - boss.x;
          const dy = boss.attackTargetY - boss.y;
          const len = Math.hypot(dx, dy) || 1;

          enemyProjectiles.push({
            x: boss.x,
            y: boss.y,
            vx: (dx / len) * 140,
            vy: (dy / len) * 140,
            radius: 26,
            life: 5,
            damage: 100,
            isBossBolt: true,
          });
          createBurst(boss.x, boss.y, '#ff5a32', 24);
          boss.isWindingUp = false;
          boss.attackTimer = 6.5;
        }
      } else {
        boss.attackTimer -= dt;
        if (boss.attackTimer <= 0) {
          // Telegraphs a slow, dodgeable strike aimed at the player's position when the windup starts.
          boss.isWindingUp = true;
          boss.windupTime = 0.9;
          boss.attackTargetX = player.x;
          boss.attackTargetY = player.y;
          createBurst(boss.x, boss.y, '#ffdc7a', 18);
        }
      }
    }
  }

  for (const enemy of enemies) {
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const dist = Math.hypot(dx, dy) || 1;

    if (enemy.isFloater) {
      const desiredDist = 260;
      const pull = (dist - desiredDist) / desiredDist;
      const dirX = dx / dist;
      const dirY = dy / dist;
      const perpX = -dirY;
      const perpY = dirX;

      enemy.x += (dirX * pull * enemy.speed + perpX * enemy.speed * 0.6) * dt;
      enemy.y += (dirY * pull * enemy.speed + perpY * enemy.speed * 0.6) * dt;
      enemy.x = Math.max(enemy.radius, Math.min(WORLD.width - enemy.radius, enemy.x));
      enemy.y = Math.max(enemy.radius, Math.min(WORLD.height - enemy.radius, enemy.y));

      enemy.shootCooldown -= dt;
      if (enemy.shootCooldown <= 0 && dist < 540) {
        enemyProjectiles.push({
          x: enemy.x,
          y: enemy.y,
          vx: (dx / dist) * 230,
          vy: (dy / dist) * 230,
          radius: 7,
          life: 2.4,
          damage: Math.floor(Math.random() * 80) + 1,
        });
        enemy.shootCooldown = 1.5 + Math.random() * 0.9;
      }
    } else {
      const speedBoost = enemy.isBoss
        ? 1 + (enemy.hp < enemy.maxHp * 0.5 ? 0.7 : 0.15)
        : 1 + stormPhase * 0.6;

      enemy.x += (dx / dist) * enemy.speed * speedBoost * dt;
      enemy.y += (dy / dist) * enemy.speed * speedBoost * dt;
    }

    enemy.hitFlash = Math.max(0, enemy.hitFlash - dt * 3);

    const contactDamage = enemy.isBoss ? 30 : enemy.isFloater ? 10 : 16;
    const attackRange = enemy.radius + player.radius + 6;
    if (dist < attackRange) {
      damagePlayer(contactDamage * dt * (1 + stormPhase * 1.1) * barrierReduction);
      createBurst(player.x, player.y, '#ff6b7d', 5);
    }

    for (const turret of turrets) {
      const tdx = turret.x - enemy.x;
      const tdy = turret.y - enemy.y;
      if (Math.hypot(tdx, tdy) < enemy.radius + turret.radius + 4) {
        turret.hp -= contactDamage * dt;
      }
    }
  }

  turrets = turrets.filter((turret) => {
    if (turret.hp <= 0) {
      createBurst(turret.x, turret.y, '#77d7ff', 14);
      return false;
    }
    return true;
  });

  const allShots = [...projectiles, ...droneProjectiles];
  for (const projectile of allShots) {
    for (const enemy of enemies) {
      const dx = projectile.x - enemy.x;
      const dy = projectile.y - enemy.y;
      if (Math.hypot(dx, dy) <= projectile.radius + enemy.radius) {
        enemy.hp -= projectile.damage;
        enemy.hitFlash = 1;
        createBurst(projectile.x, projectile.y, '#9be7ff', 8);

        if (projectile.pierceRemaining && projectile.pierceRemaining > 0) {
          projectile.pierceRemaining -= 1;
        } else {
          projectile.dead = true;
        }

        if (enemy.hp <= 0 && !enemy.dead) {
          createBurst(enemy.x, enemy.y, '#ffdc7a', 16);
          coins += Math.floor(Math.random() * (COIN_PER_KILL_MAX - COIN_PER_KILL_MIN + 1)) + COIN_PER_KILL_MIN;
          enemy.dead = true;
        }
      }
    }
  }
  projectiles = projectiles.filter((p) => !p.dead);
  droneProjectiles = droneProjectiles.filter((p) => !p.dead);
  enemies = enemies.filter((enemy) => !enemy.dead);

  for (const shard of shards) {
    if (shard.collected) continue;

    const dx = player.x - shard.x;
    const dy = player.y - shard.y;
    const dist = Math.hypot(dx, dy);

    // No magnetic pull — the player must fly directly over the shard.
    if (dist < player.radius + shard.radius) {
      shard.collected = true;
      createBurst(shard.x, shard.y, '#ffdc7a', 18);
    }
  }

  const collectedTotal = shards.filter((s) => s.collected).length;
  const bossDefeated = level.isBoss && bossSpawned && enemies.length === 0;
  if ((!level.isBoss && collectedTotal >= level.shards) || bossDefeated) {
    handleLevelCleared();
  }

  if (player.hp <= 0) {
    setGameState('gameOver');
  }

  for (const particle of particles) {
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.life -= dt;
  }
  particles = particles.filter((particle) => particle.life > 0);

  updateHud();
  refreshUpgradeAffordability();
}

function handleLevelCleared() {
  if (levelIndex >= LEVELS.length - 1) {
    setGameState('victory');
  } else {
    setGameState('levelComplete');
  }
}

function drawBackground() {
  const level = currentLevel();
  const [tr, tg, tb] = level.skyTop;
  const [br, bg, bb] = level.skyBottom;

  const gradient = ctx.createLinearGradient(0, 0, 0, WORLD.height);
  gradient.addColorStop(0, `rgba(${tr + stormPhase * 20}, ${tg + stormPhase * 10}, ${tb + stormPhase * 20}, 1)`);
  gradient.addColorStop(1, `rgba(${br}, ${bg}, ${bb}, 1)`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);

  for (let i = 0; i < 60; i += 1) {
    const x = (i * 97.3) % WORLD.width;
    const y = (i * 47.9 + stormPhase * 120) % WORLD.height;
    ctx.fillStyle = `rgba(255,255,255,${0.3 + ((i % 6) * 0.1)})`;
    ctx.fillRect(x, y, 2, 2);
  }

  ctx.save();
  ctx.globalAlpha = 0.95;

  if (levelIndex === 0) {
    ctx.fillStyle = '#172d42';
    ctx.fillRect(0, 410, WORLD.width, 150);
    ctx.fillStyle = '#23506a';
    ctx.fillRect(0, 420, WORLD.width, 140);
    ctx.strokeStyle = '#8a5b3c';
    ctx.lineWidth = 12;
    for (let x = -40; x < WORLD.width; x += 70) ctx.strokeRect(x, 365 + (x % 3) * 8, 58, 190);
    ctx.fillStyle = '#70452f';
    ctx.fillRect(80, 220, 18, 210);
    ctx.fillRect(260, 180, 18, 250);
    ctx.fillRect(730, 205, 18, 225);
    ctx.fillStyle = '#c47b3d';
    ctx.beginPath(); ctx.moveTo(260, 185); ctx.lineTo(330, 255); ctx.lineTo(260, 255); ctx.fill();
    ctx.fillStyle = '#d8a85d';
    ctx.fillRect(42, 390, 150, 16);
    ctx.fillRect(650, 375, 220, 16);
  } else if (levelIndex === 1) {
    ctx.fillStyle = '#447844';
    ctx.fillRect(0, 285, WORLD.width, 275);
    ctx.fillStyle = '#b18a55';
    ctx.beginPath(); ctx.moveTo(400, 560); ctx.lineTo(525, 560); ctx.lineTo(505, 330); ctx.lineTo(465, 275); ctx.lineTo(425, 330); ctx.fill();
    ctx.strokeStyle = '#d6b873';
    ctx.lineWidth = 4;
    for (let x = 35; x < WORLD.width; x += 95) {
      ctx.beginPath(); ctx.moveTo(x, 430 + (x % 4) * 12); ctx.lineTo(x + 12, 414 + (x % 3) * 10); ctx.stroke();
    }
  } else if (levelIndex === 2) {
    ctx.fillStyle = '#315b43';
    ctx.fillRect(0, 320, WORLD.width, 240);
    ctx.fillStyle = '#b88b62';
    ctx.beginPath(); ctx.moveTo(0, 430); ctx.lineTo(WORLD.width, 395); ctx.lineTo(WORLD.width, 560); ctx.lineTo(0, 560); ctx.fill();
    for (let x = 70; x < WORLD.width; x += 180) {
      ctx.fillStyle = '#8b5548'; ctx.fillRect(x, 280 - (x % 3) * 18, 105, 100);
      ctx.fillStyle = '#d7b56b'; ctx.fillRect(x + 14, 300 - (x % 3) * 18, 25, 25);
      ctx.fillRect(x + 66, 300 - (x % 3) * 18, 25, 25);
      ctx.fillStyle = '#613d36'; ctx.beginPath(); ctx.moveTo(x - 12, 280 - (x % 3) * 18); ctx.lineTo(x + 52, 230 - (x % 3) * 18); ctx.lineTo(x + 118, 280 - (x % 3) * 18); ctx.fill();
    }
  } else if (levelIndex === 3) {
    ctx.fillStyle = '#173d2c'; ctx.fillRect(0, 300, WORLD.width, 260);
    ctx.fillStyle = '#a67b4c';
    ctx.beginPath(); ctx.moveTo(420, 560); ctx.lineTo(540, 560); ctx.lineTo(510, 330); ctx.lineTo(470, 285); ctx.lineTo(430, 330); ctx.fill();
    for (let x = 35; x < WORLD.width; x += 105) {
      ctx.fillStyle = '#214f37'; ctx.fillRect(x, 190 + (x % 4) * 20, 24, 210);
      ctx.fillStyle = '#2f7043'; ctx.beginPath(); ctx.arc(x + 12, 185 + (x % 4) * 20, 58, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#3d8a50'; ctx.beginPath(); ctx.arc(x - 25, 235 + (x % 3) * 14, 38, 0, Math.PI * 2); ctx.fill();
    }
  } else if (levelIndex === 4 || levelIndex === 5 || levelIndex === 6) {
    ctx.fillStyle = levelIndex === 5 ? '#151827' : '#302026'; ctx.fillRect(0, 260, WORLD.width, 300);
    ctx.fillStyle = '#11131c';
    ctx.beginPath(); ctx.moveTo(0, 560); ctx.lineTo(0, 270); ctx.quadraticCurveTo(180, 120, 330, 285); ctx.quadraticCurveTo(480, 385, 630, 260); ctx.quadraticCurveTo(800, 100, WORLD.width, 270); ctx.lineTo(WORLD.width, 560); ctx.fill();
    ctx.fillStyle = '#704b43';
    ctx.beginPath(); ctx.moveTo(340, 560); ctx.lineTo(620, 560); ctx.lineTo(560, 365); ctx.quadraticCurveTo(480, 290, 400, 365); ctx.fill();
    if (levelIndex === 4) {
      ctx.fillStyle = '#d67c45'; ctx.beginPath(); ctx.arc(480, 380, 58, Math.PI, 0); ctx.fill();
    }
    if (levelIndex === 5) {
      ctx.fillStyle = '#cbd7e2';
      for (let x = 90; x < WORLD.width; x += 130) { ctx.beginPath(); ctx.arc(x, 330 + (x % 4) * 20, 10, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = '#252b42'; ctx.beginPath(); ctx.moveTo(130, 60); ctx.quadraticCurveTo(155, 95, 180, 60); ctx.quadraticCurveTo(205, 95, 230, 60); ctx.lineTo(210, 155); ctx.lineTo(150, 155); ctx.fill();
    }
  } else if (levelIndex === 7 || levelIndex === 8) {
    ctx.fillStyle = levelIndex === 8 ? '#d7e5ef' : '#5d6b70'; ctx.fillRect(0, 300, WORLD.width, 260);
    ctx.fillStyle = '#4b4a49';
    ctx.beginPath(); ctx.moveTo(0, 560); ctx.lineTo(0, 245); ctx.lineTo(250, 130); ctx.lineTo(450, 280); ctx.lineTo(700, 95); ctx.lineTo(WORLD.width, 240); ctx.lineTo(WORLD.width, 560); ctx.fill();
    ctx.fillStyle = levelIndex === 8 ? '#f8fbff' : '#8d9a98';
    ctx.beginPath(); ctx.moveTo(0, 560); ctx.lineTo(WORLD.width, 560); ctx.lineTo(640, 360); ctx.lineTo(535, 320); ctx.lineTo(355, 430); ctx.lineTo(0, 470); ctx.fill();
    ctx.strokeStyle = '#b8a16d'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(0, 470); ctx.lineTo(355, 430); ctx.lineTo(535, 320); ctx.lineTo(640, 360); ctx.stroke();
    if (levelIndex === 8) {
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 35; i += 1) ctx.fillRect((i * 83) % WORLD.width, 280 + ((i * 47) % 230), 3, 3);
    }
  } else if (levelIndex === 9) {
    ctx.fillStyle = '#451b18'; ctx.fillRect(0, 270, WORLD.width, 290);
    ctx.fillStyle = '#241317';
    ctx.beginPath(); ctx.moveTo(0, 560); ctx.lineTo(0, 240); ctx.lineTo(170, 160); ctx.lineTo(330, 270); ctx.lineTo(500, 110); ctx.lineTo(690, 250); ctx.lineTo(860, 120); ctx.lineTo(WORLD.width, 210); ctx.lineTo(WORLD.width, 560); ctx.fill();
    ctx.fillStyle = '#ff6b32';
    ctx.beginPath(); ctx.moveTo(0, 560); ctx.lineTo(WORLD.width, 560); ctx.lineTo(760, 450); ctx.lineTo(650, 410); ctx.lineTo(380, 470); ctx.lineTo(180, 430); ctx.fill();
    ctx.fillStyle = '#ffbd45'; ctx.beginPath(); ctx.arc(480, 190, 55 + stormPhase * 8, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.fillStyle = '#35151a'; ctx.fillRect(0, 250, WORLD.width, 310);
    ctx.fillStyle = '#0f111b'; ctx.fillRect(75, 105, WORLD.width - 150, 380);
    ctx.strokeStyle = '#8e3b2d'; ctx.lineWidth = 18; ctx.strokeRect(75, 105, WORLD.width - 150, 380);
    ctx.fillStyle = '#ff5a32';
    ctx.beginPath(); ctx.moveTo(0, 560); ctx.lineTo(WORLD.width, 560); ctx.lineTo(770, 480); ctx.lineTo(650, 445); ctx.lineTo(430, 490); ctx.lineTo(210, 445); ctx.fill();
    ctx.strokeStyle = '#ffca62'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(WORLD.width / 2, 300, 120 + Math.sin(Date.now() * 0.004) * 8, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#ffdc7a'; ctx.beginPath(); ctx.arc(WORLD.width / 2, 300, 20, 0, Math.PI * 2); ctx.fill();
  }

  ctx.restore();
}

function drawPlayer() {
  ctx.save();
  ctx.translate(player.x, player.y);

  if (player.shieldMax > 0 && player.shield > 0) {
    ctx.strokeStyle = 'rgba(159, 231, 255, 0.85)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, player.radius + 8, 0, Math.PI * 2);
    ctx.stroke();
  }

  const facingX = pointer.x - player.x;
  const facingY = pointer.y - player.y;
  const angle = Math.atan2(facingY, facingX);
  ctx.rotate(angle);

  ctx.fillStyle = player.damageFlash > 0 ? '#ffc7d8' : '#9fe7ff';
  ctx.beginPath();
  ctx.arc(0, 0, player.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#d2f6ff';
  const barrels = 1 + upgrades.doubleCannon;
  for (let i = 0; i < barrels; i += 1) {
    const offset = (i - (barrels - 1) / 2) * 8;
    ctx.fillRect(10, offset - 2.5, 20, 5);
  }

  ctx.restore();
}

function drawDrones() {
  if (!player.drones) return;

  for (const drone of player.drones) {
    ctx.fillStyle = '#c58cff';
    ctx.beginPath();
    ctx.arc(drone.x, drone.y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(197, 140, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(drone.x, drone.y, 11, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawEnemy(enemy) {
  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  if (enemy.isBoss) {
    const pulse = 1 + Math.sin(Date.now() * 0.005) * 0.08;
    ctx.scale(pulse, pulse);
    ctx.strokeStyle = enemy.hp < enemy.maxHp * 0.5 ? '#ff6b7d' : '#9fe7ff';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 0, enemy.radius + 12, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = enemy.hitFlash > 0 ? '#fff1c7' : enemy.isBoss ? '#7b5cff' : '#ff7a59';
  ctx.beginPath();
  ctx.arc(0, 0, enemy.radius, enemy.isBoss ? 0.2 : 0, Math.PI * 2);
  ctx.fill();

  if (enemy.isFloater) {
    ctx.fillStyle = enemy.hitFlash > 0 ? '#ffe4c7' : '#ff8f4d';
    ctx.beginPath();
    ctx.moveTo(0, -enemy.radius);
    ctx.lineTo(enemy.radius, enemy.radius);
    ctx.lineTo(-enemy.radius, enemy.radius);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 200, 140, 0.7)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  if (enemy.isBoss) {
    ctx.fillStyle = '#ffdc7a';
    ctx.beginPath();
    ctx.arc(-16, -8, 7, 0, Math.PI * 2);
    ctx.arc(16, -8, 7, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = 'rgba(20, 20, 35, 0.75)';
  const barWidth = enemy.isBoss ? enemy.radius * 3 : enemy.radius * 2;
  ctx.fillRect(-barWidth / 2, -enemy.radius - 18, barWidth, enemy.isBoss ? 9 : 6);
  ctx.fillStyle = enemy.isBoss ? '#ffdc7a' : '#9be7ff';
  ctx.fillRect(-barWidth / 2, -enemy.radius - 18, (enemy.hp / enemy.maxHp) * barWidth, enemy.isBoss ? 9 : 6);
  ctx.restore();

  if (enemy.isBoss && enemy.isWindingUp) {
    const pulse = 0.6 + Math.sin(Date.now() * 0.02) * 0.4;
    ctx.save();
    ctx.strokeStyle = `rgba(255, 90, 50, ${pulse})`;
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 8]);
    ctx.beginPath();
    ctx.moveTo(enemy.x, enemy.y);
    ctx.lineTo(enemy.attackTargetX, enemy.attackTargetY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(enemy.attackTargetX, enemy.attackTargetY, 30, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawShard(shard) {
  const pulse = 1 + Math.sin(Date.now() * 0.006 + shard.pulse) * 0.22;
  ctx.save();
  ctx.translate(shard.x, shard.y);
  ctx.scale(pulse, pulse);
  ctx.fillStyle = '#ffdc7a';
  ctx.beginPath();
  ctx.moveTo(0, -12);
  ctx.lineTo(9, 0);
  ctx.lineTo(0, 12);
  ctx.lineTo(-9, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawProjectile(projectile) {
  ctx.fillStyle = '#eaffff';
  ctx.beginPath();
  ctx.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawEnemyProjectile(projectile) {
  if (projectile.isBossBolt) {
    const pulse = 1 + Math.sin(Date.now() * 0.02) * 0.15;
    ctx.save();
    ctx.translate(projectile.x, projectile.y);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = '#ff5a32';
    ctx.beginPath();
    ctx.arc(0, 0, projectile.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 220, 122, 0.85)';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
    return;
  }

  ctx.fillStyle = '#ff8f4d';
  ctx.beginPath();
  ctx.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawTurret(turret) {
  ctx.save();
  ctx.translate(turret.x, turret.y);
  ctx.fillStyle = '#1c2b44';
  ctx.beginPath();
  ctx.arc(0, 0, turret.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#77d7ff';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = '#9fe7ff';
  ctx.fillRect(-4, -turret.radius - 10, 8, 10);

  ctx.fillStyle = 'rgba(20, 20, 35, 0.75)';
  ctx.fillRect(-turret.radius, -turret.radius - 18, turret.radius * 2, 6);
  ctx.fillStyle = '#77d7ff';
  ctx.fillRect(-turret.radius, -turret.radius - 18, (turret.hp / turret.maxHp) * turret.radius * 2, 6);
  ctx.restore();
}

function drawParticles() {
  for (const particle of particles) {
    ctx.fillStyle = particle.color;
    ctx.globalAlpha = Math.max(0, particle.life);
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawHudText() {
  const level = currentLevel();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.font = '18px Segoe UI';
  ctx.fillText(level.name, 24, 34);
  const total = shards.filter((s) => s.collected).length;
  ctx.fillText(`Sky restored: ${total}/${level.shards}`, 24, 60);
}

function render() {
  drawBackground();

  for (const shard of shards) {
    if (!shard.collected) drawShard(shard);
  }

  for (const turret of turrets) drawTurret(turret);
  for (const projectile of projectiles) drawProjectile(projectile);
  for (const projectile of droneProjectiles) drawProjectile(projectile);
  for (const projectile of enemyProjectiles) drawEnemyProjectile(projectile);
  for (const enemy of enemies) drawEnemy(enemy);
  drawDrones();
  drawPlayer();
  drawParticles();
  drawHudText();
}

function setGameState(nextState) {
  gameState = nextState;

  if (nextState === 'playing') {
    hideOverlay();
  }

  if (nextState === 'levelComplete') {
    const nextLevel = LEVELS[levelIndex + 1];
    showOverlay(
      'Sky Fragment Restored',
      `${currentLevel().name} is cleared! Spend your coins on upgrades, then step into ${nextLevel.name}.`,
      'Continue to Next Level'
    );
  }

  if (nextState === 'victory') {
    showOverlay(
      'The Stormheart Falls',
      'The Stormheart is broken. The storm breaks, the kingdom breathes again, and Aetherfall is saved.',
      'Play Again'
    );
  }

  if (nextState === 'gameOver') {
    showOverlay(
      'The Storm Won',
      `The skywarden fell on ${currentLevel().name}. Rise again and try another descent.`,
      'Retry Run'
    );
  }

  if (nextState === 'paused') {
    showOverlay(
      'Paused',
      'Take a breath, review the objective and controls below, then jump back in.',
      'Resume Descent',
      true
    );
  }

  refreshPauseUi();
}

function refreshPauseUi() {
  // The upgrades panel only pops out while the game isn't actively being played
  // (paused, menu, level-complete, game-over, victory). It stays hidden mid-run.
  const isPlaying = gameState === 'playing';
  upgradesPanel.classList.toggle('collapsed', isPlaying);
  layoutEl.classList.toggle('panel-collapsed', isPlaying);
  pauseButton.textContent = gameState === 'paused' ? '▶' : '⏸';
  pauseButton.title = gameState === 'paused' ? 'Resume' : 'Pause';
  pauseButton.disabled = gameState !== 'playing' && gameState !== 'paused';
}

function togglePause() {
  if (gameState === 'playing') {
    setGameState('paused');
  } else if (gameState === 'paused') {
    setGameState('playing');
  }
}

function gameLoop(ts) {
  const dt = Math.min(0.033, (ts - lastTime) / 1000 || 0.016);
  lastTime = ts;

  update(dt);
  render();
  requestAnimationFrame(gameLoop);
}

function handleOverlayAction() {
  if (gameState === 'menu' || gameState === 'victory') {
    resetRun();
    setGameState('playing');
  } else if (gameState === 'gameOver') {
    retryLevel();
    setGameState('playing');
  } else if (gameState === 'levelComplete') {
    startLevel(levelIndex + 1, 1);
    setGameState('playing');
  } else {
    setGameState('playing');
  }
}

window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  keys[key] = true;

  if (key === ' ') {
    event.preventDefault();
  }

  if (key === 'e' && gameState !== 'playing' && gameState !== 'paused') {
    handleOverlayAction();
  }

  if (key === 't' && gameState === 'playing') {
    placeTurret();
  }

  if ((key === 'p' || key === 'escape') && (gameState === 'playing' || gameState === 'paused')) {
    togglePause();
  }
});

window.addEventListener('keyup', (event) => {
  keys[event.key.toLowerCase()] = false;
});

canvas.addEventListener('mousemove', (event) => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  pointer.x = (event.clientX - rect.left) * scaleX;
  pointer.y = (event.clientY - rect.top) * scaleY;
});

canvas.addEventListener('mousedown', () => {
  pointer.down = true;

  if (gameState !== 'playing' && gameState !== 'paused') {
    handleOverlayAction();
  }
});

canvas.addEventListener('mouseup', () => {
  pointer.down = false;
});

canvas.addEventListener('mouseleave', () => {
  pointer.down = false;
});

startButton.addEventListener('click', () => {
  handleOverlayAction();
});

function toggleFullscreen() {
  const isFullscreen = document.fullscreenElement || document.webkitFullscreenElement;
  if (!isFullscreen) {
    const request = layoutEl.requestFullscreen || layoutEl.webkitRequestFullscreen;
    if (request) request.call(layoutEl);
  } else {
    const exit = document.exitFullscreen || document.webkitExitFullscreen;
    if (exit) exit.call(document);
  }
}

fullscreenButton.addEventListener('click', toggleFullscreen);

pauseButton.addEventListener('click', togglePause);

document.addEventListener('fullscreenchange', () => {
  const isFullscreen = Boolean(document.fullscreenElement);
  fullscreenButton.textContent = isFullscreen ? '⤢' : '⛶';
  fullscreenButton.title = isFullscreen ? 'Exit fullscreen' : 'Toggle fullscreen';
});

document.addEventListener('webkitfullscreenchange', () => {
  const isFullscreen = Boolean(document.webkitFullscreenElement);
  fullscreenButton.textContent = isFullscreen ? '⤢' : '⛶';
});

resetRun();
showOverlay(
  'Skywarden Awakens',
  'Survive the storm, gather the Echo Shards, and face the Stormheart in a final boss battle on Level 11. Kill enemies for coins and spend them on upgrades in the panel on the right.',
  'Begin the Descent',
  true
);
refreshPauseUi();
requestAnimationFrame(gameLoop);
