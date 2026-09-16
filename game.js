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
// Level definitions: 10 hand-tuned levels, each with its own look and feel.
// Shard count increases every level (starting at 4) and there is no magnetic
// pull — the player must fly directly over a shard to collect it. Enemy
// speed/health/spawn rate ramp up steadily for a difficulty climb toward the
// finale.
// ---------------------------------------------------------------------------
const LEVELS = [
  {
    name: 'Level 1: Skyfall Meadows', shards: 4, spawnBase: 2.0, spawnMin: 1.05,
    enemySpeed: 34, enemyHp: 1.6, stormSpeed: 0.04,
    skyTop: [110, 130, 200], skyBottom: [10, 14, 30], accent: '#77d7ff',
  },
  {
    name: 'Level 2: Whispering Cliffs', shards: 5, spawnBase: 1.75, spawnMin: 0.92,
    enemySpeed: 44, enemyHp: 2.1, stormSpeed: 0.055,
    skyTop: [95, 140, 190], skyBottom: [10, 16, 34], accent: '#8fe3d8',
  },
  {
    name: 'Level 3: Glasswind Terraces', shards: 6, spawnBase: 1.5, spawnMin: 0.8,
    enemySpeed: 52, enemyHp: 2.7, stormSpeed: 0.07,
    skyTop: [120, 110, 210], skyBottom: [12, 12, 32], accent: '#be7cff',
  },
  {
    name: 'Level 4: Amber Reach', shards: 7, spawnBase: 1.25, spawnMin: 0.66,
    enemySpeed: 62, enemyHp: 3.4, stormSpeed: 0.085,
    skyTop: [190, 140, 90], skyBottom: [30, 16, 12], accent: '#ffb56b',
  },
  {
    name: 'Level 5: Emberfall Ridge', shards: 8, spawnBase: 1.05, spawnMin: 0.56,
    enemySpeed: 72, enemyHp: 4.2, stormSpeed: 0.1,
    skyTop: [200, 90, 70], skyBottom: [32, 10, 14], accent: '#ff7a59',
  },
  {
    name: 'Level 6: Stormglass Expanse', shards: 9, spawnBase: 0.9, spawnMin: 0.48,
    enemySpeed: 84, enemyHp: 5.1, stormSpeed: 0.12,
    skyTop: [80, 100, 210], skyBottom: [8, 10, 30], accent: '#77aaff',
  },
  {
    name: 'Level 7: Wraithlight Hollow', shards: 10, spawnBase: 0.76, spawnMin: 0.4,
    enemySpeed: 96, enemyHp: 6.1, stormSpeed: 0.14,
    skyTop: [70, 60, 120], skyBottom: [6, 6, 18], accent: '#c58cff',
  },
  {
    name: 'Level 8: The Hollow Vault', shards: 11, spawnBase: 0.63, spawnMin: 0.33,
    enemySpeed: 110, enemyHp: 7.3, stormSpeed: 0.16,
    skyTop: [60, 50, 90], skyBottom: [5, 5, 14], accent: '#ff8fd0',
  },
  {
    name: 'Level 9: Ashen Spire Approach', shards: 12, spawnBase: 0.5, spawnMin: 0.26,
    enemySpeed: 126, enemyHp: 8.7, stormSpeed: 0.185,
    skyTop: [140, 40, 40], skyBottom: [20, 4, 6], accent: '#ff5c5c',
  },
  {
    name: 'Level 10: The Ashen Regent\'s Bastion', shards: 13, spawnBase: 0.38, spawnMin: 0.2,
    enemySpeed: 144, enemyHp: 10.5, stormSpeed: 0.22,
    skyTop: [40, 10, 10], skyBottom: [4, 2, 6], accent: '#ffdc7a',
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
let enemies = [];
let shards = [];
let player = null;

const upgrades = {
  health: 0,
  damage: 0,
  fireRate: 0,
  doubleCannon: 0,
  drones: 0,
  forcefield: 0,
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
  particles = [];
  projectiles = [];
  droneProjectiles = [];
  enemies = [];
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
  shardText.textContent = `${collected} / ${currentLevel().shards}`;
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
    const cost = maxed ? null : upgradeCost(key);

    const card = document.createElement('div');
    card.className = `upgrade-card${maxed ? ' maxed' : ''}`;

    const head = document.createElement('div');
    head.className = 'upgrade-head';
    head.innerHTML = `<span class="upgrade-name">${def.icon} ${def.name}</span><span class="upgrade-level">${lvl}/${def.maxLevel}</span>`;

    const desc = document.createElement('p');
    desc.className = 'upgrade-desc';
    desc.textContent = lvl > 0 ? def.describe(lvl) : 'Not yet purchased';

    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = maxed ? 'Maxed Out' : `Buy — 🪙 ${cost}`;
    button.disabled = maxed || coins < cost;
    button.addEventListener('click', () => buyUpgrade(key));

    card.appendChild(head);
    card.appendChild(desc);
    card.appendChild(button);
    upgradesList.appendChild(card);

    upgradeCardRefs[key] = { button, maxed, cost };
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

function showOverlay(title, text, buttonLabel) {
  overlayTitle.textContent = title;
  overlayText.textContent = text;
  startButton.textContent = buttonLabel;
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
    });
  }

  player.cooldown = baseFireRate();
}

function updateDrones(dt) {
  const droneCount = upgrades.drones;
  if (droneCount === 0) return;

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
        damage: Math.max(1, Math.round(baseDamage() * 0.6)),
      });

      player.droneCooldowns[droneKey] = 0.7;
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

  spawnTimer -= dt;
  if (spawnTimer <= 0) {
    spawnEnemy();
    spawnTimer = Math.max(level.spawnMin, level.spawnBase - stormPhase * (level.spawnBase - level.spawnMin));
  }

  for (const enemy of enemies) {
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const dist = Math.hypot(dx, dy) || 1;
    const speedBoost = 1 + stormPhase * 0.6;

    enemy.x += (dx / dist) * enemy.speed * speedBoost * dt;
    enemy.y += (dy / dist) * enemy.speed * speedBoost * dt;
    enemy.hitFlash = Math.max(0, enemy.hitFlash - dt * 3);

    const attackRange = enemy.radius + player.radius + 6;
    if (dist < attackRange) {
      damagePlayer(16 * dt * (1 + stormPhase * 1.1));
      createBurst(player.x, player.y, '#ff6b7d', 5);
    }
  }

  const allShots = [...projectiles, ...droneProjectiles];
  for (const projectile of allShots) {
    for (const enemy of enemies) {
      const dx = projectile.x - enemy.x;
      const dy = projectile.y - enemy.y;
      if (Math.hypot(dx, dy) <= projectile.radius + enemy.radius) {
        enemy.hp -= projectile.damage;
        enemy.hitFlash = 1;
        projectile.dead = true;
        createBurst(projectile.x, projectile.y, '#9be7ff', 8);

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
  if (collectedTotal >= level.shards) {
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

  for (let i = 0; i < 8; i += 1) {
    const hillY = WORLD.height - 80 - i * 16;
    ctx.fillStyle = `rgba(${br + 15}, ${bg + 15}, ${bb + 25}, ${0.5 + i * 0.06})`;
    ctx.beginPath();
    ctx.moveTo(0, WORLD.height);
    for (let x = 0; x <= WORLD.width; x += 100) {
      ctx.lineTo(x, hillY + Math.sin(x * 0.03 + i) * 25);
    }
    ctx.lineTo(WORLD.width, WORLD.height);
    ctx.closePath();
    ctx.fill();
  }
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
  ctx.fillStyle = enemy.hitFlash > 0 ? '#ffd1a7' : '#ff7a59';
  ctx.beginPath();
  ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(20, 20, 35, 0.75)';
  ctx.fillRect(-enemy.radius, -enemy.radius - 12, enemy.radius * 2, 6);
  ctx.fillStyle = '#9be7ff';
  ctx.fillRect(-enemy.radius, -enemy.radius - 12, (enemy.hp / enemy.maxHp) * enemy.radius * 2, 6);
  ctx.restore();
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

  for (const projectile of projectiles) drawProjectile(projectile);
  for (const projectile of droneProjectiles) drawProjectile(projectile);
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
      'The Ashen Regent Falls',
      'All ten sky fragments are restored. The storm breaks, the kingdom breathes again, and Aetherfall is saved.',
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
  'Survive the storm, gather the Echo Shards, and rebuild the broken sky across 10 levels. Kill enemies for coins and spend them on upgrades in the panel on the right.',
  'Begin the Descent'
);
refreshPauseUi();
requestAnimationFrame(gameLoop);
