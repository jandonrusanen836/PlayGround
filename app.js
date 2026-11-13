import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';

const canvas = document.querySelector('#game');
const startScreen = document.querySelector('#start-screen');
const hud = document.querySelector('#hud');
const pauseScreen = document.querySelector('#pause-screen');
const resultScreen = document.querySelector('#result-screen');
const lobbyScreen = document.querySelector('#lobby-screen');
const toastEl = document.querySelector('#toast');
const liveDot = document.querySelector('.live-dot');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x6c7a75);
scene.fog = new THREE.Fog(0x6c7a75, 14, 64);

const camera = new THREE.PerspectiveCamera(76, innerWidth / innerHeight, 0.05, 200);
camera.rotation.order = 'YXZ';
scene.add(camera);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

const ambient = new THREE.HemisphereLight(0xe8f0ea, 0x272c2a, 1.6);
scene.add(ambient);
const sun = new THREE.DirectionalLight(0xfff4d9, 2.5);
sun.position.set(-18, 28, 12);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -38;
sun.shadow.camera.right = 38;
sun.shadow.camera.top = 38;
sun.shadow.camera.bottom = -38;
sun.shadow.bias = -0.00012;
scene.add(sun);
const fill = new THREE.DirectionalLight(0x8eb7df, 0.9);
fill.position.set(22, 8, -18);
scene.add(fill);

const floorMat = new THREE.MeshStandardMaterial({ color: 0x5f625d, roughness: 0.98, metalness: 0.02 });
const wallMat = new THREE.MeshStandardMaterial({ color: 0x8b948d, roughness: 0.96, metalness: 0.05 });
const metalMat = new THREE.MeshStandardMaterial({ color: 0x242d2e, roughness: 0.48, metalness: 0.8 });
const darkMat = new THREE.MeshStandardMaterial({ color: 0x1a2121, roughness: 0.62, metalness: 0.7 });
const oliveMat = new THREE.MeshStandardMaterial({ color: 0x4d5c46, roughness: 0.88, metalness: 0.08 });
const sandMat = new THREE.MeshStandardMaterial({ color: 0xb7a78d, roughness: 1, metalness: 0.02 });
const hazardMat = new THREE.MeshStandardMaterial({ color: 0xd0a767, roughness: 0.7, metalness: 0.08 });
const propMat = new THREE.MeshStandardMaterial({ color: 0x676c62, roughness: 0.8, metalness: 0.08 });
const whiteText = new THREE.MeshBasicMaterial({ color: 0xefeff2 });

const colliders = [];
const armorCrates = [];
const bots = [];
const tracers = [];
const clock = new THREE.Clock();

const keys = {};
const pointer = { active: false, sensitivity: 0.0028 };
const ui = {
  scoreBlue: document.querySelector('#blue-score'),
  scoreRed: document.querySelector('#red-score'),
  matchClock: document.querySelector('#match-clock'),
  healthBar: document.querySelector('#health-bar'),
  healthNum: document.querySelector('#health-num'),
  ammo: document.querySelector('#ammo'),
  objective: document.querySelector('#objective'),
  killFeed: document.querySelector('#kill-feed'),
  hitMarker: document.querySelector('#hit-marker'),
  damage: document.querySelector('.damage-vignette'),
  reload: document.querySelector('#reload-indicator'),
  interaction: document.querySelector('#interaction-hint'),
  resultKicker: document.querySelector('#result-kicker'),
  resultTitle: document.querySelector('#result-title'),
  resultCopy: document.querySelector('#result-copy'),
  finalKills: document.querySelector('#final-kills'),
  finalDeaths: document.querySelector('#final-deaths'),
  finalAccuracy: document.querySelector('#final-accuracy'),
};

const game = {
  state: 'menu',
  playing: false,
  paused: false,
  over: false,
  matchTime: 600,
  ammo: 30,
  reserveAmmo: 120,
  health: 100,
  kills: 0,
  deaths: 0,
  shots: 0,
  hits: 0,
  scoreBlue: 0,
  scoreRed: 0,
  fireCooldown: 0,
  reloadTimer: 0,
  hitFlash: 0,
  dealDamage: 0,
  bob: 0,
  stepTimer: 0,
  lastFrame: 0,
  toastTime: 0,
  roundId: 0,
};

const player = {
  pos: new THREE.Vector3(0, 1.68, 22),
  vel: new THREE.Vector3(),
  yaw: Math.PI,
  pitch: 0,
  speed: 5.8,
  sprintSpeed: 8.5,
  radius: 0.7,
  canShoot: true,
};

const enemySpawnPoints = [
  [-24, 24], [-16, -22], [0, -24], [19, -18], [22, 18], [-8, 20], [1, 25], [-26, 4], [25, 2], [12, 11],
];

function spawnPointsForScreen() {
  const points = [];
  for (let i = 0; i < 5; i++) {
    const sx = -25 + Math.random() * 50;
    const sz = -25 + Math.random() * 50;
    if (Math.abs(sx) < 6 && Math.abs(sz) < 6) continue;
    points.push([sx, sz]);
  }
  return points;
}

function addBox(name, x, y, z, sx, sy, sz, material, collides = true) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  if (collides) {
    colliders.push({
      name,
      minX: x - sx * 0.5,
      maxX: x + sx * 0.5,
      minZ: z - sz * 0.5,
      maxZ: z + sz * 0.5,
      y: y,
      h: sy,
    });
  }
  return mesh;
}

function addCylinder(name, x, y, z, r, h, material, collides = true) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 12), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  if (collides) {
    colliders.push({ name, minX: x - r, maxX: x + r, minZ: z - r, maxZ: z + r, y: y, h: h });
  }
  return mesh;
}

function buildArena() {
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(72, 72), floorMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  addBox('north wall', 0, 3, -31, 64, 6, 1.2, wallMat);
  addBox('south wall', 0, 3, 31, 64, 6, 1.2, wallMat);
  addBox('west wall', -31, 3, 0, 1.2, 6, 62, wallMat);
  addBox('east wall', 31, 3, 0, 1.2, 6, 62, wallMat);

  addBox('hangar', -19, 4.2, -22, 18, 8.4, 7.5, propMat);
  addBox('hangar roof', -19, 8.4, -22, 20, 0.5, 9.5, metalMat);
  addBox('warehouse', 20, 4, -20, 12, 8, 18, propMat);
  addBox('warehouse roof', 20, 8.1, -20, 13, 0.4, 19, metalMat);

  const containers = [
    [-13, 0, 0x7a6a49, 11, 3.1],
    [12, 10, 0x6b7366, 9, 3.1],
    [21, 4, 0x725c4e, 8, 3.2],
    [-21, 15, 0x7a6647, 7.8, 3.0],
    [5, -14, 0x697162, 9.2, 3.2],
    [-9, -16, 0x7d603c, 8.5, 3.1],
  ];
  for (const [x, z, color, w, h] of containers) {
    addBox(`container-${x}-${z}`, x, h * 0.5, z, w, h, 3.1, new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.18 }));
    addBox(`container-rib-${x}-${z}`, x, h * 0.5, z + 1.55, w - 0.6, h - 0.2, 0.08, metalMat, false);
    addBox(`container-lid-${x}-${z}`, x, h - 0.1, z, w, 0.18, 3.08, metalMat, false);
  }

  const barrierData = [
    [0, 2, 8, 1.2, 2.4],
    [-4, 8, 5, 1.3, 2.2],
    [5, -9, 4.5, 1.3, 2.2],
    [18, -6, 3, 1.2, 2.1],
    [-16, -10, 3.1, 1.3, 2.2],
    [7, 20, 5, 1.2, 2.0],
    [-9, 22, 4, 1.2, 2.1],
    [19, 16, 3.7, 1.2, 2.1],
  ];

  for (const [x, z, d, w, h] of barrierData) {
    const b = addBox(`barrier-${x}-${z}`, x, h / 2, z, w, h, d, new THREE.MeshStandardMaterial({ color: 0x6d756b, roughness: 0.82, metalness: 0.12 }));
    b.position.y = h / 2;
    addBox(`barrier-stripe-${x}-${z}`, x, h * 0.7, z + d * 0.5 + 0.01, w * 0.7, 0.12, 0.04, hazardMat, false);
  }

  const crateSpawns = [[-5, -3], [-24, -1], [17, 17], [2, -22], [-2, 17], [26, -4], [14, -23], [19, 22], [-18, 12]];
  for (let i = 0; i < crateSpawns.length; i++) {
    const [x, z] = crateSpawns[i];
    const crate = addBox(`crate-${i}`, x, 0.75, z, 1.5, 1.5, 1.5, propMat);
    crate.rotation.y = (i % 2) * 0.16;
  }

  for (let i = 0; i < 3; i++) {
    const x = -28 + i * 5;
    addBox(`pallet-${i}`, x, 0.22, 21, 2.2, 0.35, 1.5, propMat);
    addBox(`pallet-rib-${i}`, x - 0.7, 0.38, 21, 0.12, 0.14, 1.5, oliveMat, false);
    addBox(`pallet-rib2-${i}`, x + 0.7, 0.38, 21, 0.12, 0.14, 1.5, oliveMat, false);
  }

  for (let i = 0; i < 7; i++) {
    const x = -28 + i * 8.5;
    const pole = addCylinder(`pole-${i}`, x, 7, 0, 0.18, 14, metalMat, false);
    pole.castShadow = true;
    const arm = addBox(`arm-${i}`, x, 12.9, -1.2, 1.6, 0.12, 0.22, metalMat, false);
    const flood = new THREE.PointLight(0xffd9a9, 18, 16, 2);
    flood.position.set(x, 12.8, -1.2);
    scene.add(flood);
    const glow = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.5), new THREE.MeshBasicMaterial({ color: 0xf8e9bf }));
    glow.position.set(x, 12.9, -1.2);
    scene.add(glow);
    arm.userData.glow = glow;
  }

  for (let i = 0; i < 50; i++) {
    const debris = new THREE.Mesh(new THREE.BoxGeometry(0.16 + Math.random() * 0.28, 0.03, 0.1 + Math.random() * 0.18), new THREE.MeshStandardMaterial({ color: i % 3 ? 0x6c7064 : 0xb38d4b, roughness: 0.95 }));
    debris.position.set((Math.random() - 0.5) * 56, 0.015, (Math.random() - 0.5) * 56);
    debris.rotation.y = Math.random() * Math.PI;
    debris.receiveShadow = true;
    scene.add(debris);
  }

  const stripeMat = new THREE.MeshBasicMaterial({ color: 0xd5a85b });
  for (let x = -22; x < 22; x += 4) {
    const stripe = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.12), stripeMat);
    stripe.rotation.x = -Math.PI / 2;
    stripe.position.set(x, 0.02, 0);
    scene.add(stripe);
  }
}

function createWeaponModel() {
  const group = new THREE.Group();
  const weaponMat = new THREE.MeshStandardMaterial({ color: 0x1a2121, roughness: 0.46, metalness: 0.8 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.18, 0.48), weaponMat);
  body.position.set(0, 0, 0);
  group.add(body);

  const upper = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.24), new THREE.MeshStandardMaterial({ color: 0x404d47, roughness: 0.6, metalness: 0.52 }));
  upper.position.set(0, 0.08, -0.12);
  group.add(upper);

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.68, 12), metalMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.02, -0.48);
  group.add(barrel);

  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.11, 0.18), new THREE.MeshStandardMaterial({ color: 0x2d352f, roughness: 0.75, metalness: 0.38 }));
  handle.position.set(0, -0.16, 0.1);
  handle.rotation.z = -0.28;
  group.add(handle);

  const scope = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, 0.12), new THREE.MeshStandardMaterial({ color: 0x19252a, roughness: 0.22, metalness: 0.72 }));
  scope.position.set(0, 0.18, -0.24);
  group.add(scope);

  const muzzleFlash = new THREE.PointLight(0xffbb67, 0, 3.5);
  muzzleFlash.position.set(0, 0.02, -0.88);
  group.add(muzzleFlash);

  const flare = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.3, 8), new THREE.MeshBasicMaterial({ color: 0xffd992, transparent: true, opacity: 0 }));
  flare.rotation.x = -Math.PI / 2;
  flare.position.set(0, 0.02, -0.96);
  group.add(flare);

  camera.add(group);
  group.position.set(0.36, -0.3, -0.76);
  group.rotation.set(-0.03, 0.02, -0.02);
  return { group, muzzleFlash, flare };
}

const rifle = createWeaponModel();

function createEnemy(index) {
  const team = 'red';
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x9f5d4d, roughness: 0.7, metalness: 0.12 });
  const headMat = new THREE.MeshStandardMaterial({ color: 0xd2b296, roughness: 0.9, metalness: 0.02 });
  const weaponMat = new THREE.MeshStandardMaterial({ color: 0x1d1e1f, roughness: 0.52, metalness: 0.7 });

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.78, 1.1, 0.38), bodyMat);
  torso.position.y = 1.2;
  torso.castShadow = true;
  torso.receiveShadow = true;
  group.add(torso);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 18, 18), headMat);
  head.position.y = 2.0;
  head.castShadow = true;
  group.add(head);

  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.8, 0.16), bodyMat);
  armL.position.set(-0.52, 1.2, 0);
  armL.rotation.z = -0.5;
  armL.castShadow = true;
  group.add(armL);

  const armR = armL.clone();
  armR.position.x = 0.52;
  armR.rotation.z = 0.5;
  group.add(armR);

  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.9, 0.2), bodyMat);
  legL.position.set(-0.18, 0.45, 0);
  legL.castShadow = true;
  group.add(legL);

  const legR = legL.clone();
  legR.position.x = 0.18;
  group.add(legR);

  const gun = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.13, 0.54), weaponMat);
  gun.position.set(0.45, 1.2, -0.18);
  gun.rotation.x = -0.35;
  gun.castShadow = true;
  group.add(gun);

  const spawn = enemySpawnPoints[index % enemySpawnPoints.length];
  group.position.set(spawn[0], 0, spawn[1]);
  scene.add(group);

  return {
    team,
    id: `bot-${index}`,
    mesh: group,
    pos: new THREE.Vector3(spawn[0], 0, spawn[1]),
    vel: new THREE.Vector3(),
    yaw: 0,
    hp: 100,
    alive: true,
    speed: 3.3 + Math.random() * 1.4,
    shootCooldown: 0.7 + Math.random() * 0.9,
    wanderYaw: Math.random() * Math.PI * 2,
    drift: Math.random() * 10,
    lastHitTime: 0,
    damageFlash: 0,
  };
}

function resetBots() {
  for (const bot of bots) {
    scene.remove(bot.mesh);
  }
  bots.length = 0;
  const count = 5;
  for (let i = 0; i < count; i++) {
    bots.push(createEnemy(i));
  }
}

function resetRound() {
  game.roundId += 1;
  game.state = 'playing';
  game.playing = true;
  game.paused = false;
  game.over = false;
  game.matchTime = 600;
  game.ammo = 30;
  game.reserveAmmo = 120;
  game.health = 100;
  game.kills = 0;
  game.deaths = 0;
  game.shots = 0;
  game.hits = 0;
  game.scoreBlue = 0;
  game.scoreRed = 0;
  game.fireCooldown = 0;
  game.reloadTimer = 0;
  game.hitFlash = 0;
  game.toastTime = 0;
  player.pos.set(0, 1.68, 22);
  player.vel.set(0, 0, 0);
  player.yaw = Math.PI;
  player.pitch = 0;
  setCamera();
  resetBots();
  updateHud();
  hud.classList.remove('hidden');
  pauseScreen.classList.add('hidden');
  resultScreen.classList.add('hidden');
  lobbyScreen.classList.add('hidden');
  startScreen.classList.add('hidden');
  document.body.requestPointerLock?.();
}

function showResult(win) {
  game.over = true;
  game.playing = false;
  hud.classList.add('hidden');
  document.exitPointerLock?.();
  resultScreen.classList.remove('hidden');
  ui.resultKicker.textContent = win ? 'MATCH COMPLETE' : 'MATCH COMPLETE';
  ui.resultTitle.textContent = win ? 'VICTORY.' : 'DEFEAT.';
  ui.resultCopy.textContent = win ? 'The yard is yours. Your squad held the line.' : 'The enemy squad outlasted your team. Re-deploy.';
  ui.finalKills.textContent = String(game.kills);
  ui.finalDeaths.textContent = String(game.deaths);
  ui.finalAccuracy.textContent = `${game.shots ? Math.round((game.hits / game.shots) * 100) : 0}%`;
}

function updateHud() {
  const healthPct = Math.max(0, Math.min(100, game.health));
  ui.healthBar.style.width = `${healthPct}%`;
  ui.healthNum.textContent = String(Math.ceil(healthPct));
  ui.ammo.textContent = String(game.ammo);
  ui.scoreBlue.textContent = String(game.scoreBlue).padStart(2, '0');
  ui.scoreRed.textContent = String(game.scoreRed).padStart(2, '0');
  const seconds = Math.max(0, Math.ceil(game.matchTime));
  const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
  const secs = String(seconds % 60).padStart(2, '0');
  ui.matchClock.textContent = `${mins}:${secs}`;

  if (game.reloadTimer > 0) {
    ui.reload.classList.add('active');
  } else {
    ui.reload.classList.remove('active');
  }
  if (game.hitFlash > 0) {
    ui.damage.classList.add('active');
  } else {
    ui.damage.classList.remove('active');
  }
}

function toast(text) {
  toastEl.textContent = text;
  toastEl.classList.add('active');
  game.toastTime = 2.4;
}

function setCamera() {
  camera.position.set(player.pos.x, player.pos.y, player.pos.z);
  camera.rotation.y = player.yaw;
  camera.rotation.x = player.pitch;
}

function intersectsWall(x, z) {
  const radius = player.radius;
  const futureX = x;
  const futureZ = z;
  for (const c of colliders) {
    const withinX = futureX + radius > c.minX && futureX - radius < c.maxX;
    const withinZ = futureZ + radius > c.minZ && futureZ - radius < c.maxZ;
    if (withinX && withinZ) return true;
  }
  return false;
}

function movePlayer(dt) {
  const moveInput = new THREE.Vector3();
  if (keys.KeyA || keys.ArrowLeft) moveInput.x -= 1;
  if (keys.KeyD || keys.ArrowRight) moveInput.x += 1;
  if (keys.KeyW || keys.ArrowUp) moveInput.z -= 1;
  if (keys.KeyS || keys.ArrowDown) moveInput.z += 1;
  if (moveInput.lengthSq() > 0) moveInput.normalize();

  const sprinting = (keys.ShiftLeft || keys.ShiftRight) && moveInput.lengthSq() > 0;
  const currentSpeed = sprinting ? player.sprintSpeed : player.speed;
  const dir = new THREE.Vector3(Math.sin(player.yaw), 0, Math.cos(player.yaw));
  const strafe = new THREE.Vector3(-dir.z, 0, dir.x);
  const desired = new THREE.Vector3();
  desired.addScaledVector(dir, moveInput.z * -1);
  desired.addScaledVector(strafe, moveInput.x);
  if (desired.lengthSq() > 0) desired.normalize().multiplyScalar(currentSpeed * dt);

  const nextX = player.pos.x + desired.x;
  const nextZ = player.pos.z + desired.z;

  if (!intersectsWall(nextX, player.pos.z)) player.pos.x = nextX;
  if (!intersectsWall(player.pos.x, nextZ)) player.pos.z = nextZ;

  if (moveInput.lengthSq() > 0) {
    game.stepTimer += dt * (sprinting ? 10 : 6);
    game.bob = Math.sin(game.stepTimer) * (sprinting ? 0.058 : 0.03);
  } else {
    game.bob *= 0.8;
  }

  player.pos.y = 1.68 + game.bob;
  camera.position.set(player.pos.x, player.pos.y, player.pos.z);
  camera.rotation.y = player.yaw;
  camera.rotation.x = player.pitch;
  camera.position.y = player.pos.y;
}

function tryReload() {
  if (game.reloadTimer > 0 || game.ammo >= 30 || game.reserveAmmo <= 0 || !game.playing) return;
  game.reloadTimer = 1.25;
  ui.reload.classList.add('active');
  toast('RELOADING');
}

function finishReload() {
  const needed = 30 - game.ammo;
  const used = Math.min(needed, game.reserveAmmo);
  game.ammo += used;
  game.reserveAmmo -= used;
  ui.reload.classList.remove('active');
  toast('MAGAZINE READY');
}

function addTracers(start, end, color = 0x9af2ff) {
  tracers.push({ start: start.clone(), end: end.clone(), life: 0.08, color });
}

function doShot() {
  if (!game.playing || game.paused || game.over) return;
  if (game.reloadTimer > 0) return;
  if (game.ammo <= 0) {
    tryReload();
    return;
  }
  if (game.fireCooldown > 0) return;

  game.fireCooldown = 0.12;
  game.ammo -= 1;
  game.shots += 1;
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  const origin = camera.position.clone();
  const tracerEnd = origin.clone().add(forward.clone().multiplyScalar(30));

  let bestHit = null;
  let bestDist = Infinity;

  for (const bot of bots) {
    if (!bot.alive) continue;
    const headPos = bot.mesh.position.clone().add(new THREE.Vector3(0, 1.9, 0));
    const toBot = headPos.clone().sub(origin);
    const dist = toBot.length();
    if (dist > 34) continue;
    const dir = toBot.normalize();
    const dot = forward.dot(dir);
    if (dot < 0.96) continue;
    if (dist < bestDist) {
      bestDist = dist;
      bestHit = { bot, dist, dir, pos: headPos };
    }
  }

  if (bestHit) {
    const hitRoll = Math.random();
    const hitChance = 0.85 - Math.min(bestHit.dist / 50, 0.35);
    if (hitRoll < hitChance) {
      bestHit.bot.hp -= 34 + Math.random() * 16;
      game.hits += 1;
      addTracers(origin, bestHit.pos, 0xf7f2a8);
      ui.hitMarker.classList.add('active');
      setTimeout(() => ui.hitMarker.classList.remove('active'), 80);
      if (bestHit.bot.hp <= 0) {
        bestHit.bot.alive = false;
        bestHit.bot.mesh.visible = false;
        game.kills += 1;
        game.scoreBlue += 1;
        ui.scoreBlue.textContent = String(game.scoreBlue).padStart(2, '0');
        toast('TARGET ELIMINATED');
        addKillFeed('YOU', bestHit.bot.id);
      }
    } else {
      addTracers(origin, tracerEnd, 0x8fe8ff);
    }
  } else {
    addTracers(origin, tracerEnd, 0x8fe8ff);
  }

  rifle.muzzleFlash.intensity = 2.5;
  rifle.flare.material.opacity = 1;
  rifle.group.position.x = 0.34 + Math.random() * 0.04;
  rifle.group.rotation.z = -0.06 + Math.random() * 0.06;
}

function addKillFeed(killer, target) {
  const feed = document.querySelector('#kill-feed');
  const line = document.createElement('div');
  line.className = 'kill-entry';
  line.innerHTML = `<span>${killer}</span> <span class="victim">${target}</span>`;
  feed.appendChild(line);
  while (feed.children.length > 4) feed.removeChild(feed.firstChild);
}

function handleBots(dt) {
  for (const bot of bots) {
    if (!bot.alive) continue;
    const toPlayer = player.pos.clone().sub(bot.mesh.position);
    const dist = toPlayer.length();
    bot.mesh.position.y = 0;
    if (dist < 18 && dist > 0.1) {
      const dir = toPlayer.normalize();
      const desiredYaw = Math.atan2(dir.x, dir.z);
      bot.yaw = THREE.MathUtils.lerp(bot.yaw, desiredYaw, 0.09);
      bot.mesh.rotation.y = bot.yaw;
      const canMove = !intersectsWall(bot.mesh.position.x + dir.x * bot.speed * dt, bot.mesh.position.z + dir.z * bot.speed * dt);
      if (canMove) {
        bot.mesh.position.x += dir.x * bot.speed * dt;
        bot.mesh.position.z += dir.z * bot.speed * dt;
      }
      bot.shootCooldown -= dt;
      if (dist < 17 && bot.shootCooldown <= 0) {
        const aim = new THREE.Vector3(player.pos.x - bot.mesh.position.x, player.pos.y - 1.1, player.pos.z - bot.mesh.position.z).normalize();
        const forward = new THREE.Vector3(Math.sin(bot.yaw), 0, Math.cos(bot.yaw));
        const spread = forward.dot(aim);
        if (spread > 0.5) {
          bot.shootCooldown = 1 + Math.random() * 0.8;
          const hit = Math.random() < 0.7;
          const origin = bot.mesh.position.clone().add(new THREE.Vector3(0, 1.4, 0));
          const end = player.pos.clone().add(new THREE.Vector3(0, 1.5, 0));
          addTracers(origin, end, 0xffb0a4);
          if (hit) {
            game.health -= 10 + Math.random() * 12;
            game.hitFlash = 0.16;
            ui.damage.classList.add('active');
            if (game.health <= 0) {
              game.health = 0;
              game.deaths += 1;
              game.scoreRed += 1;
              toast('YOU WERE ELIMINATED');
              addKillFeed('ENEMY', 'YOU');
              setTimeout(() => {
                if (!game.over) showResult(false);
              }, 270);
            }
          }
        }
      }
    } else {
      bot.wanderYaw += (Math.random() - 0.5) * 0.075;
      bot.mesh.rotation.y = THREE.MathUtils.lerp(bot.mesh.rotation.y, bot.wanderYaw, 0.06);
      const moveVec = new THREE.Vector3(Math.sin(bot.wanderYaw), 0, Math.cos(bot.wanderYaw));
      const nx = bot.mesh.position.x + moveVec.x * bot.speed * 0.45 * dt;
      const nz = bot.mesh.position.z + moveVec.z * bot.speed * 0.45 * dt;
      if (!intersectsWall(nx, bot.mesh.position.z)) bot.mesh.position.x = nx;
      if (!intersectsWall(bot.mesh.position.x, nz)) bot.mesh.position.z = nz;
      bot.shootCooldown -= dt;
    }
  }
}

function handleTracers(dt) {
  for (let i = tracers.length - 1; i >= 0; i--) {
    const t = tracers[i];
    t.life -= dt;
    if (t.life <= 0) {
      tracers.splice(i, 1);
    }
  }
}

function updateAim() {
  if (!pointer.active) return;
  const dx = mouse.deltaX || 0;
  const dy = mouse.deltaY || 0;
  player.yaw -= dx * pointer.sensitivity;
  player.pitch -= dy * pointer.sensitivity;
  player.pitch = THREE.MathUtils.clamp(player.pitch, -1.5, 1.5);
  camera.rotation.y = player.yaw;
  camera.rotation.x = player.pitch;
}

const mouse = { deltaX: 0, deltaY: 0 };
window.addEventListener('mousemove', (e) => {
  if (document.pointerLockElement !== canvas && game.playing) return;
  mouse.deltaX = e.movementX || 0;
  mouse.deltaY = e.movementY || 0;
});

document.addEventListener('pointerlockchange', () => {
  pointer.active = document.pointerLockElement === canvas;
  if (!pointer.active && game.playing && !game.over && !game.paused) {
    game.paused = true;
    pauseScreen.classList.remove('hidden');
    hud.classList.add('hidden');
  }
});

window.addEventListener('keydown', (event) => {
  keys[event.code] = true;
  if (event.code === 'KeyR') tryReload();
  if (event.code === 'Escape' && game.playing && !game.over) {
    game.paused = true;
    pauseScreen.classList.remove('hidden');
    hud.classList.add('hidden');
    document.exitPointerLock?.();
  }
  if (event.code === 'KeyP') {
    if (game.playing) {
      game.paused = !game.paused;
      pauseScreen.classList.toggle('hidden', !game.paused);
      hud.classList.toggle('hidden', game.paused);
      if (!game.paused) document.body.requestPointerLock?.();
    }
  }
});

window.addEventListener('keyup', (event) => { keys[event.code] = false; });

canvas.addEventListener('mousedown', (event) => {
  if (!game.playing || game.paused || game.over) return;
  if (document.pointerLockElement !== canvas) {
    canvas.requestPointerLock();
    return;
  }
  doShot();
  if (event.button === 2) return false;
});

canvas.addEventListener('contextmenu', (event) => event.preventDefault());

const deployButton = document.querySelector('#deploy');
const findMatchButton = document.querySelector('#find-match');
const cancelQueueButton = document.querySelector('#cancel-queue');
const queueStatus = document.querySelector('.queue-status');
const queueTitle = document.querySelector('#queue-title');
const queueDetail = document.querySelector('#queue-detail');
const queueTimer = document.querySelector('#queue-timer');
let queueInterval = 0;
let queueTimeout = 0;
let queueStartedAt = 0;

function stopMatchmaking() {
  window.clearInterval(queueInterval);
  window.clearTimeout(queueTimeout);
  queueInterval = 0;
  queueTimeout = 0;
  queueStatus.classList.remove('searching');
  queueTitle.textContent = 'READY TO DEPLOY';
  queueDetail.textContent = 'Practice match · bots fill open slots';
  queueTimer.textContent = '00:00';
  findMatchButton.disabled = false;
  findMatchButton.querySelector('span').textContent = 'FIND MATCH';
  cancelQueueButton.classList.add('hidden');
}

function beginMatchmaking() {
  if (queueInterval || game.playing) return;
  queueStartedAt = Date.now();
  queueStatus.classList.add('searching');
  queueTitle.textContent = 'SEARCHING FOR MATCH';
  queueDetail.textContent = 'Building a local practice match…';
  findMatchButton.disabled = true;
  findMatchButton.querySelector('span').textContent = 'SEARCHING';
  cancelQueueButton.classList.remove('hidden');
  queueInterval = window.setInterval(() => {
    const elapsed = Math.floor((Date.now() - queueStartedAt) / 1000);
    queueTimer.textContent = `00:${String(elapsed).padStart(2, '0')}`;
  }, 250);
  queueTimeout = window.setTimeout(() => {
    window.clearInterval(queueInterval);
    queueInterval = 0;
    queueStatus.classList.remove('searching');
    queueTitle.textContent = 'MATCH FOUND';
    queueDetail.textContent = 'Iron Yard · bots assigned to open slots';
    queueTimer.textContent = 'READY';
    cancelQueueButton.classList.add('hidden');
    queueTimeout = window.setTimeout(() => {
      stopMatchmaking();
      lobbyScreen.classList.add('hidden');
      resetRound();
      toast('PRACTICE MATCH STARTING');
    }, 850);
  }, 3200);
}

deployButton.addEventListener('click', () => {
  startScreen.classList.add('hidden');
  lobbyScreen.classList.remove('hidden');
});
findMatchButton.addEventListener('click', beginMatchmaking);
cancelQueueButton.addEventListener('click', stopMatchmaking);
document.querySelector('#lobby-back').addEventListener('click', () => {
  stopMatchmaking();
  lobbyScreen.classList.add('hidden');
  startScreen.classList.remove('hidden');
});

document.querySelector('#sound-toggle').addEventListener('click', () => {
  const btn = document.querySelector('#sound-toggle');
  const enabled = btn.dataset.on !== 'false';
  btn.dataset.on = String(!enabled);
  btn.innerHTML = enabled ? '♫ <span>SOUND OFF</span>' : '♫ <span>SOUND ON</span>';
  toast(enabled ? 'SOUND OFF' : 'SOUND ON');
});

const pauseButton = document.querySelector('#pause-button');
pauseButton.addEventListener('click', () => {
  if (!game.playing || game.over) return;
  game.paused = true;
  pauseScreen.classList.remove('hidden');
  hud.classList.add('hidden');
  document.exitPointerLock?.();
});

document.querySelector('#resume').addEventListener('click', () => {
  game.paused = false;
  pauseScreen.classList.add('hidden');
  hud.classList.remove('hidden');
  document.body.requestPointerLock?.();
});

document.querySelector('#quit').addEventListener('click', () => {
  game.playing = false;
  game.paused = false;
  pauseScreen.classList.add('hidden');
  startScreen.classList.remove('hidden');
  hud.classList.add('hidden');
  document.exitPointerLock?.();
});

document.querySelector('#play-again').addEventListener('click', () => {
  resetRound();
});

document.querySelector('#main-menu').addEventListener('click', () => {
  resultScreen.classList.add('hidden');
  startScreen.classList.remove('hidden');
  game.playing = false;
  game.over = false;
  hud.classList.add('hidden');
  document.exitPointerLock?.();
});

function updateMinimap() {
  const c = document.querySelector('#minimap');
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, c.width, c.height);
  ctx.fillStyle = '#232b2c';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = '#8ecfbb';
  ctx.strokeRect(5, 5, c.width - 10, c.height - 10);

  const scale = 1.9;
  const mapCenterX = c.width / 2;
  const mapCenterY = c.height / 2;

  ctx.fillStyle = '#67d2d4';
  const px = mapCenterX + player.pos.x * scale;
  const py = mapCenterY + player.pos.z * scale;
  ctx.beginPath();
  ctx.arc(px, py, 3, 0, Math.PI * 2);
  ctx.fill();

  for (const bot of bots) {
    if (!bot.alive) continue;
    ctx.fillStyle = '#ff8f78';
    ctx.fillRect(mapCenterX + bot.mesh.position.x * scale - 2, mapCenterY + bot.mesh.position.z * scale - 2, 4, 4);
  }
}

function updateRenderer() {
  const delta = Math.min(clock.getDelta(), 0.05);
  const dt = delta || 0.016;
  game.lastFrame = dt;

  if (game.playing && !game.paused && !game.over) {
    game.matchTime -= dt;
    if (game.matchTime <= 0) {
      game.matchTime = 0;
      const win = game.scoreBlue >= game.scoreRed;
      showResult(win);
    }

    if (game.fireCooldown > 0) game.fireCooldown -= dt;
    if (game.reloadTimer > 0) {
      game.reloadTimer -= dt;
      if (game.reloadTimer <= 0) finishReload();
    }
    if (game.toastTime > 0) game.toastTime -= dt;
    if (game.toastTime <= 0) toastEl.classList.remove('active');
    if (game.hitFlash > 0) game.hitFlash -= dt;
    else ui.damage.classList.remove('active');

    updateAim();
    movePlayer(dt);
    handleBots(dt);
    handleTracers(dt);
    updateMinimap();

    if (game.ammo === 0 && game.reserveAmmo > 0 && !game.reloadTimer) {
      tryReload();
    }

    if (game.health <= 0) {
      game.health = 0;
      showResult(false);
    }

    if (game.scoreBlue >= 20 || game.scoreRed >= 20) {
      showResult(game.scoreBlue >= 20);
    }
  }

  if (game.fireCooldown > 0) {
    rifle.muzzleFlash.intensity *= 0.72;
    rifle.flare.material.opacity *= 0.7;
  } else {
    rifle.muzzleFlash.intensity = 0;
    rifle.flare.material.opacity = 0;
  }

  const bobAmount = game.playing && !game.paused && !game.over ? game.bob : 0;
  rifle.group.position.y = -0.3 + bobAmount * 0.7;
  rifle.group.rotation.x = -0.03 + (game.fireCooldown > 0 ? 0.04 : 0) + Math.sin(performance.now() * 0.01) * 0.002;
  rifle.group.rotation.z = -0.02 + (Math.random() - 0.5) * 0.01;

  renderer.render(scene, camera);
  updateHud();
}

function animate() {
  requestAnimationFrame(animate);
  updateRenderer();
}

buildArena();
resetBots();
updateHud();
animate();

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
});

window.addEventListener('blur', () => {
  if (game.playing && !game.over) {
    game.paused = true;
    pauseScreen.classList.remove('hidden');
    hud.classList.add('hidden');
    document.exitPointerLock?.();
  }
});

window.addEventListener('contextmenu', (e) => e.preventDefault());

const renderTracers = () => {
  for (const tracer of tracers) {
    const posA = tracer.start.clone();
    const posB = tracer.end.clone();
    const dir = posB.clone().sub(posA);
    const length = dir.length();
    if (length === 0) continue;
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, length, 6, 1), new THREE.MeshBasicMaterial({ color: tracer.color, transparent: true, opacity: Math.max(0, tracer.life * 8) }));
    beam.position.copy(posA.clone().add(posB).multiplyScalar(0.5));
    beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    scene.add(beam);
    setTimeout(() => scene.remove(beam), 70);
  }
};
setInterval(() => {
  renderTracers();
}, 16);
