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
let arenaGroup = null;
let currentMapId = 'iron-yard';
const armorCrates = [];
const bots = [];
const practicePlayerCount = document.querySelector('#practice-player-count');
const hudPlayerCount = document.querySelector('#hud-player-count');
const tracers = [];
const clock = new THREE.Clock();

const keys = {};
const pointer = { active: false, sensitivity: 0.0028 };
const touchInput = { moveX: 0, moveY: 0, sprinting: false, crouched: false, firing: false, lookX: 0, lookY: 0 };
const touchUi = {
  movePad: document.querySelector('#move-pad'),
  stick: document.querySelector('#stick-knob'),
  lookZone: document.querySelector('#touch-look-zone'),
  sprint: document.querySelector('#touch-sprint'),
  crouch: document.querySelector('#touch-crouch'),
  reload: document.querySelector('#touch-reload'),
  fire: document.querySelector('#touch-fire'),
};
let movePointerId = null;
let lookPointer = null;
const heldTouchPointers = new Map();
function clearTouchControls() {
  touchInput.moveX = 0;
  touchInput.moveY = 0;
  touchInput.sprinting = false;
  touchInput.crouched = false;
  touchInput.firing = false;
  touchInput.lookX = 0;
  touchInput.lookY = 0;
  movePointerId = null;
  lookPointer = null;
  heldTouchPointers.clear();
  mouse.firing = false;
  if (touchUi.stick) touchUi.stick.style.transform = 'translate(0px, 0px)';
  [touchUi.sprint, touchUi.crouch, touchUi.fire].forEach((button) => {
    button?.classList.remove('active');
    button?.setAttribute('aria-pressed', 'false');
  });
}
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

const weapons = [
  { id: 'pistol', name: 'SIDEARM 9MM', short: 'SIDEARM', caliber: '9MM', category: 'PISTOL', unlockLevel: 1, magazine: 12, reserve: 48, damage: 38, fireRate: 0.32, reload: 1.05, range: 30, aimDot: 0.965, hitChance: 0.82, pellets: 1, mode: 'SEMI-AUTO' },
  { id: 'rifle', name: 'RANGER 5.56', short: 'RANGER', caliber: '5.56', category: 'ASSAULT RIFLE', unlockLevel: 4, magazine: 30, reserve: 120, damage: 42, fireRate: 0.12, reload: 1.25, range: 34, aimDot: 0.96, hitChance: 0.85, pellets: 1, mode: 'FULL AUTO' },
  { id: 'shotgun', name: 'BREACH 12G', short: 'BREACH', caliber: '12G', category: 'SHOTGUN', unlockLevel: 8, magazine: 6, reserve: 30, damage: 23, fireRate: 0.72, reload: 1.65, range: 15, aimDot: 0.91, hitChance: 0.74, pellets: 6, mode: 'PUMP ACTION' },
  { id: 'sniper', name: 'LONGSHOT .308', short: 'LONGSHOT', caliber: '.308', category: 'SNIPER RIFLE', unlockLevel: 12, magazine: 5, reserve: 25, damage: 100, fireRate: 1.05, reload: 1.8, range: 60, aimDot: 0.99, hitChance: 0.96, pellets: 1, mode: 'BOLT ACTION' },
];

const progression = (() => {
  try {
    const saved = JSON.parse(localStorage.getItem('frontline-progression') || '{}');
    return { level: Math.max(1, Number(saved.level) || 1), xp: Math.max(0, Number(saved.xp) || 0), weaponId: saved.weaponId || 'pistol' };
  } catch {
    return { level: 1, xp: 0, weaponId: 'pistol' };
  }
})();

function xpForNextLevel(level = progression.level) {
  return 100 + (level - 1) * 25;
}

function saveProgression() {
  localStorage.setItem('frontline-progression', JSON.stringify(progression));
}

function getWeapon(id = progression.weaponId) {
  return weapons.find((weapon) => weapon.id === id) || weapons[0];
}

function renderArsenal() {
  const arsenal = document.querySelector('#arsenal');
  if (!arsenal) return;
  const active = getWeapon();
  const xpNeeded = xpForNextLevel();
  document.querySelector('#profile-level').textContent = `LV. ${progression.level}`;
  document.querySelector('#menu-weapon-name').textContent = active.name;
  document.querySelector('#menu-weapon-type').innerHTML = `${active.category} <i>•</i> LV. ${active.unlockLevel}+`;
  document.querySelector('#menu-weapon-ammo').innerHTML = `${active.magazine} <span>/ ${active.reserve}</span>`;
  document.querySelector('#xp-caption').textContent = `${progression.xp} / ${xpNeeded} XP TO NEXT LEVEL`;
  document.querySelector('#xp-progress').style.width = `${Math.min(100, progression.xp / xpNeeded * 100)}%`;
  arsenal.innerHTML = weapons.map((weapon, index) => {
    const unlocked = progression.level >= weapon.unlockLevel;
    return `<button type="button" class="arsenal-item${weapon.id === active.id ? ' selected' : ''}${unlocked ? '' : ' locked'}" data-weapon="${weapon.id}" ${unlocked ? '' : 'disabled'} title="${unlocked ? `Select ${weapon.name}` : `Unlock at level ${weapon.unlockLevel}`}" aria-label="${unlocked ? weapon.name : `${weapon.name}, locked until level ${weapon.unlockLevel}`}"><b>${index + 1}</b><span>${weapon.short}</span><small>${unlocked ? weapon.category : `LV. ${weapon.unlockLevel}`}</small></button>`;
  }).join('');
  arsenal.querySelectorAll('[data-weapon]:not(:disabled)').forEach((button) => {
    button.addEventListener('click', () => selectWeapon(button.dataset.weapon));
  });
  updateWeaponHud();
}

function updateWeaponHud() {
  const weapon = getWeapon();
  const name = document.querySelector('#hud-weapon-name');
  if (name) name.innerHTML = `${weapon.short} <span>${weapon.caliber}</span>`;
  const reserve = document.querySelector('#reserve-ammo');
  if (reserve) reserve.textContent = String(game.reserveAmmo);
  const type = document.querySelector('#hud-weapon-type');
  if (type) type.innerHTML = `${weapon.category} <span>•</span> ${weapon.mode}`;
  const key = document.querySelector('#weapon-key');
  if (key) key.textContent = String(weapons.indexOf(weapon) + 1);
}

function selectWeapon(id, announce = true) {
  const weapon = weapons.find((item) => item.id === id);
  if (!weapon || progression.level < weapon.unlockLevel) return;
  progression.weaponId = id;
  saveProgression();
  operatorPreview?.configureWeapon(id);
  if (game.playing) {
    game.ammo = weapon.magazine;
    game.reserveAmmo = weapon.reserve;
    game.reloadTimer = 0;
    game.fireCooldown = 0;
    ui.reload.classList.remove('active');
    updateHud();
  }
  renderArsenal();
  if (announce) toast(`${weapon.name} EQUIPPED`);
}

function grantXP(amount) {
  progression.xp += amount;
  let leveled = false;
  while (progression.xp >= xpForNextLevel()) {
    progression.xp -= xpForNextLevel();
    progression.level += 1;
    leveled = true;
  }
  saveProgression();
  renderArsenal();
  if (leveled) {
    const newlyUnlocked = weapons.filter((weapon) => weapon.unlockLevel === progression.level);
    toast(newlyUnlocked.length ? `LEVEL ${progression.level} · ${newlyUnlocked[0].name} UNLOCKED` : `LEVEL ${progression.level} REACHED`);
  }
  return leveled;
}

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

const maps = {
  'iron-yard': {
    name: 'IRON YARD', descriptor: 'INDUSTRIAL DEPOT',
    floor: 0x5f625d, wall: 0x8b948d, prop: 0x676c62, fog: 0x6c7a75,
    spawns: [[-24, 24], [-16, -22], [0, -24], [19, -18], [22, 18], [-8, 20], [1, 25], [-26, 4], [25, 2], [12, 11]],
    buildings: [[-19, 4.2, -22, 18, 8.4, 7.5], [20, 4, -20, 12, 8, 18]],
    containers: [[-13, 0], [12, 10], [21, 4], [-21, 15], [5, -14], [-9, -16]],
    barriers: [[0, 2, 8, 1.2, 2.4], [-4, 8, 5, 1.3, 2.2], [5, -9, 4.5, 1.3, 2.2], [18, -6, 3, 1.2, 2.1], [-16, -10, 3.1, 1.3, 2.2], [7, 20, 5, 1.2, 2.0], [-9, 22, 4, 1.2, 2.1], [19, 16, 3.7, 1.2, 2.1]],
  },
  dustline: {
    name: 'DUSTLINE', descriptor: 'DESERT CHECKPOINT',
    floor: 0x897957, wall: 0xb9a77f, prop: 0x8a6846, fog: 0x9a8868,
    spawns: [[-25, 22], [-19, -23], [-2, -25], [22, -19], [25, 20], [-9, 24], [4, 26], [-27, 5], [26, 0], [14, 14]],
    buildings: [[-20, 3.4, -21, 15, 6.8, 11], [18, 3.8, -20, 16, 7.6, 13]],
    containers: [[-12, 1], [11, 12], [21, 5], [-21, 15], [5, -12], [-8, -16]],
    barriers: [[-1, 1, 7, 1.4, 2.5], [-5, 9, 4, 1.2, 2], [6, -7, 5, 1.4, 2.3], [18, -5, 4, 1.2, 2], [-16, -8, 4, 1.3, 2.1], [8, 20, 4, 1.2, 1.9], [-9, 21, 5, 1.2, 2], [19, 15, 4, 1.4, 2.2]],
  },
  frostline: {
    name: 'FROSTLINE', descriptor: 'ARCTIC FORWARD BASE',
    floor: 0x778387, wall: 0xb6c4c5, prop: 0x59696d, fog: 0x879a9d,
    spawns: [[-24, 25], [-17, -23], [1, -25], [20, -17], [23, 19], [-7, 21], [2, 26], [-27, 3], [26, 1], [13, 12]],
    buildings: [[-20, 4.5, -21, 17, 9, 9], [19, 4.3, -19, 14, 8.6, 16]],
    containers: [[-14, 2], [11, 11], [21, 4], [-21, 16], [6, -13], [-8, -17]],
    barriers: [[0, 2, 9, 1.3, 2.3], [-5, 8, 4, 1.2, 2.1], [5, -9, 5, 1.4, 2.4], [17, -5, 3, 1.3, 2], [-17, -9, 4, 1.2, 2], [8, 19, 5, 1.2, 2], [-9, 22, 4, 1.4, 2.2], [19, 15, 4, 1.2, 2]],
  },
};

function mapInfo(mapId = currentMapId) {
  return maps[mapId] || maps['iron-yard'];
}

function updatePlayerCounts() {
  const activeBots = bots.filter((bot) => bot.alive).length;
  const countLabel = `1 HUMAN · ${activeBots}/${bots.length} AI ACTIVE`;
  if (practicePlayerCount && practicePlayerCount.textContent !== countLabel) {
    practicePlayerCount.textContent = countLabel;
  }
  if (hudPlayerCount && hudPlayerCount.textContent !== countLabel) {
    hudPlayerCount.textContent = countLabel;
  }
}

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

const previewCanvas = document.querySelector('#operator-preview-canvas');
let operatorPreview = null;

function createOperatorPreview() {
  if (!previewCanvas) return null;
  const previewScene = new THREE.Scene();
  const previewCamera = new THREE.PerspectiveCamera(34, 1, 0.1, 30);
  previewCamera.position.set(0, 1.28, 5.3);
  previewCamera.lookAt(0, 1.08, 0);
  const previewRenderer = new THREE.WebGLRenderer({ canvas: previewCanvas, alpha: true, antialias: true });
  previewRenderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  previewRenderer.setClearColor(0x000000, 0);
  previewRenderer.outputColorSpace = THREE.SRGBColorSpace;
  previewRenderer.toneMapping = THREE.ACESFilmicToneMapping;
  previewRenderer.toneMappingExposure = 1.12;
  previewScene.add(new THREE.HemisphereLight(0xe5f0e5, 0x252b27, 2.1));
  const keyLight = new THREE.DirectionalLight(0xffedcf, 3.1);
  keyLight.position.set(-3, 5, 4);
  previewScene.add(keyLight);
  const rimLight = new THREE.DirectionalLight(0x9bbbe0, 2.2);
  rimLight.position.set(3, 3, -3);
  previewScene.add(rimLight);

  const operator = new THREE.Group();
  previewScene.add(operator);
  const mats = {
    cloth: new THREE.MeshStandardMaterial({ color: 0x4b5845, roughness: 0.96 }),
    clothDark: new THREE.MeshStandardMaterial({ color: 0x343f35, roughness: 0.98 }),
    webbing: new THREE.MeshStandardMaterial({ color: 0x59604a, roughness: 0.92 }),
    armor: new THREE.MeshStandardMaterial({ color: 0x252e2b, roughness: 0.7, metalness: 0.18 }),
    armorEdge: new THREE.MeshStandardMaterial({ color: 0x536057, roughness: 0.65, metalness: 0.25 }),
    black: new THREE.MeshStandardMaterial({ color: 0x171d1c, roughness: 0.68, metalness: 0.2 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x202522, roughness: 1 }),
    skin: new THREE.MeshStandardMaterial({ color: 0xa9775e, roughness: 0.88 }),
    lens: new THREE.MeshStandardMaterial({ color: 0x526d71, roughness: 0.2, metalness: 0.65, transparent: true, opacity: 0.78 }),
    accent: new THREE.MeshStandardMaterial({ color: 0x9b624c, roughness: 0.82 }),
    gun: new THREE.MeshStandardMaterial({ color: 0x202625, roughness: 0.42, metalness: 0.72 }),
    gunPolymer: new THREE.MeshStandardMaterial({ color: 0x343c38, roughness: 0.75, metalness: 0.18 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x162323, roughness: 0.16, metalness: 0.7 }),
  };
  const box = (parent, size, material, pos, rot = [0, 0, 0]) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    mesh.position.set(...pos);
    mesh.rotation.set(...rot);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const sphere = (parent, scale, material, pos) => {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 14), material);
    mesh.scale.set(...scale);
    mesh.position.set(...pos);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const limb = (parent, start, end, radius, material, radiusEnd = radius) => {
    const a = new THREE.Vector3(...start);
    const b = new THREE.Vector3(...end);
    const delta = b.clone().sub(a);
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusEnd, radius, delta.length(), 12), material);
    mesh.position.copy(a.add(b).multiplyScalar(0.5));
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.clone().normalize());
    mesh.userData.baseLength = delta.length();
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const positionLimb = (mesh, start, end) => {
    const a = new THREE.Vector3(...start);
    const b = new THREE.Vector3(...end);
    const delta = b.clone().sub(a);
    mesh.position.copy(a.add(b).multiplyScalar(0.5));
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.clone().normalize());
    mesh.scale.y = delta.length() / mesh.userData.baseLength;
  };

  // Layered combat uniform and plate carrier, with visible seams, straps and pouches.
  box(operator, [0.7, 0.86, 0.34], mats.cloth, [0, 1.32, 0]);
  box(operator, [0.58, 0.62, 0.16], mats.armor, [0, 1.37, -0.19]);
  box(operator, [0.61, 0.08, 0.18], mats.armorEdge, [0, 1.7, -0.19]);
  box(operator, [0.1, 0.62, 0.045], mats.webbing, [-0.23, 1.36, -0.28], [0, 0, -0.08]);
  box(operator, [0.1, 0.62, 0.045], mats.webbing, [0.23, 1.36, -0.28], [0, 0, 0.08]);
  for (const x of [-0.2, 0, 0.2]) {
    box(operator, [0.14, 0.21, 0.11], mats.armorEdge, [x, 1.22, -0.3]);
    box(operator, [0.13, 0.2, 0.12], mats.black, [x, 1.02, -0.2]);
    box(operator, [0.018, 0.15, 0.015], mats.webbing, [x + 0.045, 1.22, -0.365]);
  }
  box(operator, [0.74, 0.13, 0.15], mats.clothDark, [0, 0.84, 0]);
  box(operator, [0.77, 0.075, 0.11], mats.armor, [0, 0.79, -0.02]);
  for (const side of [-1, 1]) {
    const x = side * 0.18;
    box(operator, [0.25, 0.75, 0.27], mats.clothDark, [x, 0.43, 0]);
    box(operator, [0.255, 0.2, 0.09], mats.armor, [x, 0.46, -0.16]);
    box(operator, [0.19, 0.28, 0.08], mats.armorEdge, [x, 0.25, -0.15]);
    box(operator, [0.29, 0.16, 0.4], mats.rubber, [x, 0.1, -0.05]);
    box(operator, [0.3, 0.045, 0.41], mats.black, [x, 0.035, -0.05]);
    for (let lace = 0; lace < 4; lace++) box(operator, [0.12, 0.012, 0.018], mats.webbing, [x, 0.14 + lace * 0.025, -0.19]);
    box(operator, [0.11, 0.25, 0.06], mats.cloth, [x, 0.59, -0.14]);
  }
  const previewArms = [];
  for (const side of [-1, 1]) {
    const shoulder = [side * 0.4, 1.62, 0.01];
    const elbow = side === 1 ? [0.32, 1.42, -0.2] : [-0.25, 1.43, -0.24];
    const hand = side === 1 ? [0.23, 1.14, -0.51] : [-0.02, 1.15, -0.66];
    sphere(operator, [0.2, 0.17, 0.21], mats.armor, shoulder);
    limb(operator, [side * 0.43, 1.58, 0], elbow, 0.115, mats.cloth, 0.105);
    sphere(operator, [0.12, 0.12, 0.12], mats.armorEdge, elbow);
    const forearm = limb(operator, elbow, hand, 0.09, mats.cloth, 0.075);
    const glove = sphere(operator, [0.075, 0.065, 0.09], mats.black, hand);
    previewArms.push({ side, elbow, forearm, glove });
    box(operator, [0.12, 0.08, 0.04], mats.accent, [side * 0.43, 1.62, -0.16]);
  }
  // Balaclava lower face, ballistic eye protection, helmet shell and side rails.
  sphere(operator, [0.18, 0.21, 0.17], mats.skin, [0, 2.0, 0]);
  const previewSmirk = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.075, 1.925, -0.153),
    new THREE.Vector3(-0.035, 1.908, -0.169),
    new THREE.Vector3(0.018, 1.911, -0.169),
    new THREE.Vector3(0.075, 1.941, -0.153),
  ]);
  const mouth = new THREE.Mesh(new THREE.TubeGeometry(previewSmirk, 18, 0.008, 6, false), mats.clothDark);
  mouth.castShadow = true;
  operator.add(mouth);
  sphere(operator, [0.012, 0.012, 0.008], mats.accent, [0.075, 1.941, -0.154]);
  sphere(operator, [0.235, 0.17, 0.23], mats.armor, [0, 2.14, 0]);
  box(operator, [0.49, 0.055, 0.14], mats.armorEdge, [0, 2.08, -0.12]);
  box(operator, [0.37, 0.105, 0.035], mats.black, [0, 2.03, -0.17]);
  box(operator, [0.33, 0.07, 0.025], mats.lens, [0, 2.03, -0.195]);
  box(operator, [0.42, 0.035, 0.035], mats.armor, [0, 2.29, -0.02]);
  for (const side of [-1, 1]) {
    box(operator, [0.045, 0.18, 0.1], mats.armorEdge, [side * 0.22, 2.02, -0.02]);
    box(operator, [0.06, 0.12, 0.18], mats.armor, [side * 0.24, 2.08, 0.04]);
  }

  const weapon = new THREE.Group();
  operator.add(weapon);
  const configureWeapon = (id) => {
    weapon.children.forEach((child) => child.geometry?.dispose());
    weapon.clear();
    const active = getWeapon(id);
    const isPistol = id === 'pistol';
    const isShotgun = id === 'shotgun';
    const isSniper = id === 'sniper';
    previewArms.forEach((arm) => {
      const hand = isPistol
        ? (arm.side === 1 ? [0.23, 1.14, -0.51] : [-0.2, 1.37, -0.28])
        : (arm.side === 1 ? [0.23, 1.14, -0.51] : [-0.02, 1.15, -0.66]);
      positionLimb(arm.forearm, arm.elbow, hand);
      arm.glove.position.set(...hand);
    });
    const bodyLength = isPistol ? 0.38 : isShotgun ? 0.76 : isSniper ? 0.88 : 0.68;
    const bodyWidth = isPistol ? 0.12 : 0.17;
    const receiver = box(weapon, [bodyWidth, isPistol ? 0.14 : 0.19, bodyLength], mats.gun, [0, 0, -bodyLength * 0.22]);
    receiver.material = mats.gun;
    const barrelLength = isPistol ? 0.24 : isShotgun ? 0.5 : isSniper ? 0.7 : 0.48;
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(isShotgun ? 0.032 : 0.022, isShotgun ? 0.032 : 0.026, barrelLength, 14), mats.gun);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.015, -bodyLength * 0.55 - barrelLength * 0.43);
    barrel.castShadow = true;
    weapon.add(barrel);
    box(weapon, [bodyWidth * 0.72, isPistol ? 0.23 : 0.25, 0.12], mats.gunPolymer, [0, -0.17, 0.02], [0.24, 0, 0]);
    if (!isPistol) {
      box(weapon, [bodyWidth * 1.15, 0.14, 0.3], mats.gunPolymer, [0, -0.01, bodyLength * 0.43]);
      box(weapon, [0.09, 0.13, 0.24], mats.gunPolymer, [0, -0.21, -0.12]);
      box(weapon, [0.27, 0.045, 0.055], mats.gun, [0, 0.13, -bodyLength * 0.36]);
      for (let rail = 0; rail < 4; rail++) box(weapon, [0.025, 0.018, 0.055], mats.armorEdge, [0, 0.16, -bodyLength * 0.34 - rail * 0.065]);
      const opticLength = isSniper ? 0.32 : 0.16;
      box(weapon, [0.09, isSniper ? 0.13 : 0.1, opticLength], mats.black, [0, 0.25, -bodyLength * 0.22]);
      const opticGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.012, 16), mats.glass);
      opticGlass.rotation.x = Math.PI / 2;
      opticGlass.position.set(0, 0.25, -bodyLength * 0.22 - opticLength * 0.52);
      weapon.add(opticGlass);
      if (isShotgun) box(weapon, [0.09, 0.1, 0.42], mats.gunPolymer, [0, -0.17, -0.43]);
      if (isSniper) {
        box(weapon, [0.13, 0.08, 0.25], mats.gunPolymer, [0, -0.13, bodyLength * 0.45]);
        box(weapon, [0.08, 0.025, 0.16], mats.armorEdge, [0, -0.08, bodyLength * 0.45]);
      }
    } else {
      box(weapon, [0.09, 0.065, 0.14], mats.gunPolymer, [0, 0.1, -0.08]);
      box(weapon, [0.11, 0.03, 0.12], mats.black, [0, 0.145, -0.08]);
    }
    box(weapon, [0.045, 0.045, 0.065], mats.armorEdge, [0, 0.04, -bodyLength * 0.48]);
    weapon.position.set(isPistol ? 0.22 : 0.12, 1.31, -0.53);
    const label = document.querySelector('#preview-weapon-name');
    if (label) label.textContent = active.name;
  };
  configureWeapon(progression.weaponId);
  return { scene: previewScene, camera: previewCamera, renderer: previewRenderer, operator, configureWeapon };
}

function resizeOperatorPreview() {
  if (!operatorPreview || !previewCanvas) return;
  const width = Math.max(1, previewCanvas.clientWidth);
  const height = Math.max(1, previewCanvas.clientHeight);
  if (operatorPreview.width === width && operatorPreview.height === height) return;
  operatorPreview.width = width;
  operatorPreview.height = height;
  operatorPreview.renderer.setSize(width, height, false);
  operatorPreview.camera.aspect = width / height;
  operatorPreview.camera.updateProjectionMatrix();
}

function createEnemy(index) {
  const team = 'red';
  const group = new THREE.Group();
  const uniformMat = new THREE.MeshStandardMaterial({ color: 0x485448, roughness: 0.96, metalness: 0.02 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: 0x3d483d, roughness: 0.98, metalness: 0.01 });
  const armorMat = new THREE.MeshStandardMaterial({ color: 0x303a34, roughness: 0.66, metalness: 0.18 });
  const armorEdgeMat = new THREE.MeshStandardMaterial({ color: 0x697361, roughness: 0.58, metalness: 0.28 });
  const fabricDetailMat = new THREE.MeshStandardMaterial({ color: 0x69715b, roughness: 0.92, metalness: 0.04 });
  const bootMat = new THREE.MeshStandardMaterial({ color: 0x242a26, roughness: 0.9, metalness: 0.04 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xb9886d, roughness: 0.92, metalness: 0 });
  const faceDetailMat = new THREE.MeshStandardMaterial({ color: 0x593a32, roughness: 0.8, metalness: 0 });
  const visorMat = new THREE.MeshStandardMaterial({ color: 0x9ab8b7, roughness: 0.2, metalness: 0.62, transparent: true, opacity: 0.58 });
  const unitMarkMat = new THREE.MeshStandardMaterial({ color: 0x96594b, roughness: 0.82, metalness: 0.04 });
  const weaponMat = new THREE.MeshStandardMaterial({ color: 0x1d2321, roughness: 0.52, metalness: 0.7 });

  const addPart = (geometry, material, position, rotation = null) => {
    const part = new THREE.Mesh(geometry, material);
    part.position.set(...position);
    if (rotation) part.rotation.set(...rotation);
    part.castShadow = true;
    part.receiveShadow = true;
    group.add(part);
    return part;
  };
  const addBox = (size, material, position, rotation = null) => addPart(new THREE.BoxGeometry(...size), material, position, rotation);
  const addSphere = (size, material, position) => {
    const part = addPart(new THREE.SphereGeometry(1, 16, 12), material, position);
    part.scale.set(...size);
    return part;
  };

  // Field uniform under a fitted plate carrier: all gear here is visual only.
  addBox([0.72, 1.04, 0.34], uniformMat, [0, 1.2, 0]);
  addBox([0.56, 0.64, 0.075], armorMat, [0, 1.3, -0.205]);
  addBox([0.5, 0.08, 0.09], armorEdgeMat, [0, 1.65, -0.215]);
  addBox([0.12, 0.64, 0.06], fabricDetailMat, [-0.24, 1.3, -0.25], [0, 0, -0.08]);
  addBox([0.12, 0.64, 0.06], fabricDetailMat, [0.24, 1.3, -0.25], [0, 0, 0.08]);
  for (const side of [-1, 1]) {
    addBox([0.15, 0.22, 0.1], armorMat, [side * 0.31, 1.34, -0.18]);
    addBox([0.14, 0.18, 0.11], armorEdgeMat, [side * 0.2, 1.02, -0.25]);
    addBox([0.08, 0.23, 0.1], unitMarkMat, [side * 0.39, 1.48, -0.1]);
  }
  addBox([0.62, 0.13, 0.08], armorMat, [0, 0.81, -0.03]);
  addBox([0.76, 0.1, 0.1], armorMat, [0, 0.76, 0]);

  // Sleeved arms, shoulder shells, and restrained unit-color tabs.
  for (const side of [-1, 1]) {
    addPart(new THREE.CylinderGeometry(0.115, 0.13, 0.64, 10), uniformMat, [side * 0.47, 1.23, 0], [0, 0, side * 0.12]);
    addSphere([0.19, 0.16, 0.2], armorMat, [side * 0.4, 1.58, 0]);
    addBox([0.12, 0.09, 0.04], unitMarkMat, [side * 0.45, 1.59, -0.16]);
    addBox([0.13, 0.16, 0.15], armorEdgeMat, [side * 0.49, 1.05, -0.01]);
  }

  // Separate field trousers, hard kneepads with fasteners, shin guards, and ordinary combat boots.
  for (const side of [-1, 1]) {
    const x = side * 0.18;
    addBox([0.23, 0.72, 0.25], pantsMat, [x, 0.45, 0]);
    addBox([0.25, 0.19, 0.08], armorMat, [x, 0.48, -0.16]);
    addBox([0.17, 0.29, 0.075], armorEdgeMat, [x, 0.29, -0.145]);
    addSphere([0.025, 0.025, 0.018], fabricDetailMat, [x - 0.075, 0.49, -0.208]);
    addSphere([0.025, 0.025, 0.018], fabricDetailMat, [x + 0.075, 0.49, -0.208]);
    addBox([0.27, 0.17, 0.4], bootMat, [x, 0.11, -0.045]);
    addBox([0.28, 0.045, 0.41], armorEdgeMat, [x, 0.035, -0.045]);
    for (let lace = 0; lace < 3; lace++) {
      addBox([0.1, 0.012, 0.018], fabricDetailMat, [x, 0.16 + lace * 0.025, -0.18]);
    }
  }

  // Exposed lower face, eye-level glass visor, and protective helmet shell.
  addSphere([0.18, 0.21, 0.17], skinMat, [0, 1.99, -0.005]);
  const smirkCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.078, 1.918, -0.154),
    new THREE.Vector3(-0.04, 1.902, -0.171),
    new THREE.Vector3(0.018, 1.906, -0.174),
    new THREE.Vector3(0.078, 1.936, -0.154),
  ]);
  addPart(new THREE.TubeGeometry(smirkCurve, 16, 0.008, 6, false), faceDetailMat, [0, 0, 0]);
  addSphere([0.012, 0.012, 0.008], unitMarkMat, [0.078, 1.936, -0.156]);
  addSphere([0.235, 0.17, 0.23], armorMat, [0, 2.13, 0.005]);
  addBox([0.46, 0.055, 0.12], armorEdgeMat, [0, 2.075, -0.12]);
  addBox([0.355, 0.105, 0.035], armorMat, [0, 2.02, -0.174]);
  addBox([0.315, 0.068, 0.022], visorMat, [0, 2.02, -0.198]);
  addBox([0.08, 0.025, 0.025], fabricDetailMat, [0, 1.9, -0.17]);
  for (const side of [-1, 1]) addBox([0.045, 0.12, 0.08], armorEdgeMat, [side * 0.215, 2.02, -0.02]);

  const gun = addBox([0.14, 0.13, 0.54], weaponMat, [0.45, 1.2, -0.18], [-0.35, 0, 0]);
  gun.castShadow = true;

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
  clearTouchControls();
  game.roundId += 1;
  game.state = 'playing';
  game.playing = true;
  game.paused = false;
  game.over = false;
  game.matchTime = 600;
  game.ammo = getWeapon().magazine;
  game.reserveAmmo = getWeapon().reserve;
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
}

function showResult(win) {
  if (game.over) return;
  clearTouchControls();
  game.over = true;
  game.playing = false;
  grantXP(50 + game.kills * 10);
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
  updatePlayerCounts();
  const healthPct = Math.max(0, Math.min(100, game.health));
  ui.healthBar.style.width = `${healthPct}%`;
  ui.healthNum.textContent = String(Math.ceil(healthPct));
  ui.ammo.textContent = String(game.ammo);
  updateWeaponHud();
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
  const moveInput = new THREE.Vector3(touchInput.moveX, touchInput.moveY, 0);
  if (keys.KeyA || keys.ArrowLeft) moveInput.x -= 1;
  if (keys.KeyD || keys.ArrowRight) moveInput.x += 1;
  if (keys.KeyW || keys.ArrowUp) moveInput.z -= 1;
  if (keys.KeyS || keys.ArrowDown) moveInput.z += 1;
  if (moveInput.lengthSq() > 1) moveInput.normalize();

  const sprinting = ((keys.ShiftLeft || keys.ShiftRight) || touchInput.sprinting) && moveInput.lengthSq() > 0;
  const crouched = touchInput.crouched || keys.ControlLeft || keys.ControlRight;
  const currentSpeed = (sprinting ? player.sprintSpeed : player.speed) * (crouched ? 0.52 : 1);
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
  const weapon = getWeapon();
  if (game.reloadTimer > 0 || game.ammo >= weapon.magazine || game.reserveAmmo <= 0 || !game.playing) return;
  game.reloadTimer = weapon.reload;
  ui.reload.classList.add('active');
  toast('RELOADING');
}

function finishReload() {
  const needed = getWeapon().magazine - game.ammo;
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

  const weapon = getWeapon();
  game.fireCooldown = weapon.fireRate;
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
    if (dist > weapon.range) continue;
    const dir = toBot.normalize();
    const dot = forward.dot(dir);
    if (dot < weapon.aimDot) continue;
    if (dist < bestDist) {
      bestDist = dist;
      bestHit = { bot, dist, dir, pos: headPos };
    }
  }

  if (bestHit) {
    const hitRoll = Math.random();
    const rangeFactor = bestHit.dist / weapon.range;
    const hitChance = Math.max(0.25, weapon.hitChance - rangeFactor * (weapon.id === 'shotgun' ? 0.42 : 0.18));
    if (hitRoll < hitChance) {
      const closeRangeBonus = weapon.id === 'shotgun' ? Math.max(0.18, 1 - rangeFactor * 0.72) : 1;
      bestHit.bot.hp -= weapon.damage * weapon.pellets * closeRangeBonus * (0.9 + Math.random() * 0.2);
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
        const leveled = grantXP(35);
        if (!leveled) toast('TARGET ELIMINATED');
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
  const mouseDX = pointer.active ? mouse.deltaX : 0;
  const mouseDY = pointer.active ? mouse.deltaY : 0;
  const dx = mouseDX * pointer.sensitivity + touchInput.lookX;
  const dy = mouseDY * pointer.sensitivity + touchInput.lookY;
  mouse.deltaX = 0;
  mouse.deltaY = 0;
  touchInput.lookX = 0;
  touchInput.lookY = 0;
  if (!dx && !dy) return;
  player.yaw -= dx;
  player.pitch = THREE.MathUtils.clamp(player.pitch - dy, -1.5, 1.5);
  camera.rotation.y = player.yaw;
  camera.rotation.x = player.pitch;
}

const mouse = { deltaX: 0, deltaY: 0, firing: false };
window.addEventListener('mousemove', (e) => {
  if (document.pointerLockElement !== canvas && game.playing) return;
  mouse.deltaX = e.movementX || 0;
  mouse.deltaY = e.movementY || 0;
});

document.addEventListener('pointerlockchange', () => {
  pointer.active = document.pointerLockElement === canvas;
  if (!pointer.active && game.playing && !game.over && !game.paused) {
    clearTouchControls();
    game.paused = true;
    pauseScreen.classList.remove('hidden');
    hud.classList.add('hidden');
  }
});

window.addEventListener('keydown', (event) => {
  keys[event.code] = true;
  const weaponHotkey = { Digit1: 'pistol', Digit2: 'rifle', Digit3: 'shotgun', Digit4: 'sniper' }[event.code];
  if (weaponHotkey && !event.repeat && progression.level >= getWeapon(weaponHotkey).unlockLevel) selectWeapon(weaponHotkey);
  if (event.code === 'KeyR') tryReload();
  if (event.code === 'Escape' && game.playing && !game.over) {
    clearTouchControls();
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
      if (!game.paused) canvas.requestPointerLock?.();
    }
  }
});

window.addEventListener('keyup', (event) => { keys[event.code] = false; });

canvas.addEventListener('mousedown', (event) => {
  if (event.button !== 0 || !game.playing || game.paused || game.over) return;
  if (document.pointerLockElement !== canvas) {
    canvas.requestPointerLock();
    return;
  }
  mouse.firing = true;
  doShot();
});
window.addEventListener('mouseup', () => { mouse.firing = false; });

canvas.addEventListener('contextmenu', (event) => event.preventDefault());

function updateJoystick(event) {
  const bounds = touchUi.movePad.getBoundingClientRect();
  const centerX = bounds.left + bounds.width / 2;
  const centerY = bounds.top + bounds.height / 2;
  const maxRadius = bounds.width * 0.34;
  let dx = event.clientX - centerX;
  let dy = event.clientY - centerY;
  const distance = Math.hypot(dx, dy);
  if (distance > maxRadius) {
    dx = (dx / distance) * maxRadius;
    dy = (dy / distance) * maxRadius;
  }
  touchInput.moveX = dx / maxRadius;
  touchInput.moveY = dy / maxRadius;
  touchUi.stick.style.transform = `translate(${dx}px, ${dy}px)`;
}

touchUi.movePad.addEventListener('pointerdown', (event) => {
  if (!game.playing || game.paused || game.over || movePointerId !== null) return;
  event.preventDefault();
  movePointerId = event.pointerId;
  touchUi.movePad.setPointerCapture(event.pointerId);
  updateJoystick(event);
});
touchUi.movePad.addEventListener('pointermove', (event) => {
  if (event.pointerId === movePointerId) updateJoystick(event);
});
function releaseMovePointer(event) {
  if (event.pointerId !== movePointerId) return;
  movePointerId = null;
  touchInput.moveX = 0;
  touchInput.moveY = 0;
  touchUi.stick.style.transform = 'translate(0px, 0px)';
}
touchUi.movePad.addEventListener('pointerup', releaseMovePointer);
touchUi.movePad.addEventListener('pointercancel', releaseMovePointer);
touchUi.movePad.addEventListener('lostpointercapture', releaseMovePointer);

touchUi.lookZone.addEventListener('pointerdown', (event) => {
  if (!game.playing || game.paused || game.over || lookPointer) return;
  event.preventDefault();
  lookPointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
  touchUi.lookZone.setPointerCapture(event.pointerId);
});
touchUi.lookZone.addEventListener('pointermove', (event) => {
  if (!lookPointer || event.pointerId !== lookPointer.id) return;
  event.preventDefault();
  touchInput.lookX += (event.clientX - lookPointer.x) * 0.0042;
  touchInput.lookY += (event.clientY - lookPointer.y) * 0.0042;
  lookPointer.x = event.clientX;
  lookPointer.y = event.clientY;
});
function releaseLookPointer(event) {
  if (!lookPointer || event.pointerId !== lookPointer.id) return;
  lookPointer = null;
}
touchUi.lookZone.addEventListener('pointerup', releaseLookPointer);
touchUi.lookZone.addEventListener('pointercancel', releaseLookPointer);
touchUi.lookZone.addEventListener('lostpointercapture', releaseLookPointer);

function releaseActionPointer(event) {
  const action = heldTouchPointers.get(event.pointerId);
  if (!action) return;
  heldTouchPointers.delete(event.pointerId);
  touchInput[action] = false;
  const button = action === 'sprinting' ? touchUi.sprint : action === 'crouched' ? touchUi.crouch : touchUi.fire;
  button.classList.remove('active');
  button.setAttribute('aria-pressed', 'false');
}
function holdAction(button, action) {
  button.addEventListener('pointerdown', (event) => {
    if (!game.playing || game.paused || game.over) return;
    event.preventDefault();
    event.stopPropagation();
    if (heldTouchPointers.has(event.pointerId)) return;
    heldTouchPointers.set(event.pointerId, action);
    touchInput[action] = true;
    button.classList.add('active');
    button.setAttribute('aria-pressed', 'true');
    button.setPointerCapture(event.pointerId);
    if (action === 'firing') doShot();
  });
  button.addEventListener('pointerup', releaseActionPointer);
  button.addEventListener('pointercancel', releaseActionPointer);
  button.addEventListener('lostpointercapture', releaseActionPointer);
}
holdAction(touchUi.sprint, 'sprinting');
holdAction(touchUi.crouch, 'crouched');
holdAction(touchUi.fire, 'firing');
touchUi.reload.addEventListener('pointerdown', (event) => {
  if (!game.playing || game.paused || game.over) return;
  event.preventDefault();
  event.stopPropagation();
  tryReload();
});
touchUi.reload.addEventListener('click', (event) => event.preventDefault());
window.addEventListener('pointerup', releaseActionPointer);
window.addEventListener('pointercancel', releaseActionPointer);
window.addEventListener('blur', () => {
  clearTouchControls();
  Object.keys(keys).forEach((code) => { keys[code] = false; });
});

const deployButton = document.querySelector('#deploy');
const findMatchButton = document.querySelector('#find-match');
const cancelQueueButton = document.querySelector('#cancel-queue');
const queueStatus = document.querySelector('.queue-status');
const queueTitle = document.querySelector('#queue-title');
const queueDetail = document.querySelector('#queue-detail');
const queueTimer = document.querySelector('#queue-timer');
const queueOptions = [...document.querySelectorAll('.queue-option')];
const lobbyDisclaimer = document.querySelector('#lobby-disclaimer');
let selectedMatchType = 'practice';
let queueInterval = 0;
let queueTimeout = 0;
let queueStartedAt = 0;

const friendsList = document.querySelector('#friends-list');
const friendsNote = document.querySelector('#friends-note');
const squadList = document.querySelector('#squad-list');
const partyCount = document.querySelector('#party-count');
const friendsStorageKey = 'frontline-friends';
let friends = (() => {
  try {
    const saved = JSON.parse(localStorage.getItem(friendsStorageKey) || '[]');
    return Array.isArray(saved) ? saved.filter((friend) => friend && typeof friend.name === 'string').slice(0, 100).map((friend) => ({
      name: friend.name.trim().slice(0, 20),
      invited: Boolean(friend.invited),
    })).filter((friend) => friend.name) : [];
  } catch {
    return [];
  }
})();

function saveFriends() {
  try { localStorage.setItem(friendsStorageKey, JSON.stringify(friends)); } catch { /* Storage may be unavailable. */ }
}

function makeSquadMember(initial, name, detail, status, extraClass = '') {
  const row = document.createElement('div');
  row.className = `squad-member ${extraClass}`.trim();
  const avatar = document.createElement('div');
  avatar.className = 'squad-avatar';
  avatar.textContent = initial;
  const identity = document.createElement('div');
  const label = document.createElement('strong');
  label.textContent = name;
  const sublabel = document.createElement('small');
  sublabel.textContent = detail;
  identity.append(label, sublabel);
  const state = document.createElement('span');
  state.className = status === 'READY' ? 'member-ready' : 'slot-dash';
  state.textContent = status;
  row.append(avatar, identity, state);
  return row;
}

function renderFriends() {
  friendsList.replaceChildren();
  const invited = friends.filter((friend) => friend.invited).slice(0, 4);
  const activePartySize = 1 + invited.length;
  partyCount.textContent = `${activePartySize} / 5`;
  squadList.replaceChildren(makeSquadMember('R', 'ROOKIE', 'FIRETEAM LEADER', 'READY', 'squad-you'));
  invited.forEach((friend) => squadList.append(makeSquadMember(friend.name.slice(0, 1).toUpperCase(), friend.name.toUpperCase(), 'INVITE SENT · LOCAL DEMO', 'PENDING')));
  for (let slot = activePartySize; slot < 5; slot += 1) {
    squadList.append(makeSquadMember('＋', 'OPEN SLOT', 'BOT FILL', '—'));
  }

  friends.forEach((friend) => {
    const row = document.createElement('div');
    row.className = 'friend-row';
    const identity = document.createElement('div');
    identity.className = 'friend-identity';
    const avatar = document.createElement('span');
    avatar.className = 'friend-avatar';
    avatar.textContent = friend.name.slice(0, 1).toUpperCase();
    const name = document.createElement('strong');
    name.textContent = friend.name;
    identity.append(avatar, name);
    const actions = document.createElement('div');
    actions.className = 'friend-actions';
    const inviteButton = document.createElement('button');
    inviteButton.type = 'button';
    inviteButton.dataset.friendAction = friend.invited ? 'cancel' : 'invite';
    inviteButton.dataset.friendName = friend.name;
    inviteButton.textContent = friend.invited ? 'CANCEL' : 'INVITE';
    inviteButton.disabled = !friend.invited && activePartySize >= 5;
    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'friend-remove';
    removeButton.dataset.friendAction = 'remove';
    removeButton.dataset.friendName = friend.name;
    removeButton.textContent = 'REMOVE';
    actions.append(inviteButton, removeButton);
    row.append(identity, actions);
    friendsList.append(row);
  });
}

function setMatchType(type) {
  if (queueInterval || queueTimeout) return;
  selectedMatchType = type;
  queueOptions.forEach((option) => {
    const selected = option.dataset.matchType === type;
    option.classList.toggle('selected', selected);
    option.setAttribute('aria-pressed', String(selected));
  });
  const online = type === 'online';
  queueStatus.classList.remove('searching');
  queueTitle.textContent = online ? 'ONLINE SERVICE NOT CONFIGURED' : 'READY TO DEPLOY';
  queueDetail.textContent = online ? 'A multiplayer server is required to search.' : 'Practice match · bots fill open slots';
  queueTimer.textContent = online ? '--:--' : '00:00';
  findMatchButton.disabled = online;
  findMatchButton.querySelector('span').textContent = online ? 'ONLINE UNAVAILABLE' : 'FIND MATCH';
  lobbyDisclaimer.textContent = online
    ? 'ONLINE MULTIPLAYER REQUIRES A MATCHMAKING SERVER'
    : 'LOCAL PRACTICE MATCHMAKING · BOTS FILL OPEN SLOTS';
}

queueOptions.forEach((option) => {
  option.addEventListener('click', () => setMatchType(option.dataset.matchType));
});

document.querySelector('#add-friend-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const input = document.querySelector('#friend-name');
  const name = input.value.trim().replace(/\\s+/g, ' ').slice(0, 20);
  if (!name) return;
  if (friends.some((friend) => friend.name.toLowerCase() === name.toLowerCase())) {
    friendsNote.textContent = `${name} is already on your friends list.`;
    return;
  }
  friends.push({ name, invited: false });
  saveFriends();
  renderFriends();
  input.value = '';
  friendsNote.textContent = `${name} added to your local friends list.`;
});

friendsList.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-friend-action]');
  if (!button) return;
  const friend = friends.find((entry) => entry.name === button.dataset.friendName);
  if (!friend) return;
  if (button.dataset.friendAction === 'remove') {
    friends = friends.filter((entry) => entry !== friend);
    friendsNote.textContent = `${friend.name} removed from your friends list.`;
  } else if (button.dataset.friendAction === 'invite') {
    if (friends.filter((entry) => entry.invited).length >= 4) {
      friendsNote.textContent = 'Your fireteam is full.';
      return;
    }
    friend.invited = true;
    friendsNote.textContent = `Demo invite prepared for ${friend.name}; no message was sent.`;
  } else {
    friend.invited = false;
    friendsNote.textContent = `Party invite to ${friend.name} cancelled.`;
  }
  saveFriends();
  renderFriends();
});

renderFriends();

function stopMatchmaking() {
  window.clearInterval(queueInterval);
  window.clearTimeout(queueTimeout);
  queueInterval = 0;
  queueTimeout = 0;
  cancelQueueButton.classList.add('hidden');
  queueOptions.forEach((option) => { option.disabled = false; });
  setMatchType(selectedMatchType);
}

function beginMatchmaking() {
  if (selectedMatchType !== 'practice' || queueInterval || game.playing) return;
  queueOptions.forEach((option) => { option.disabled = true; });
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
  clearTouchControls();
  game.paused = true;
  pauseScreen.classList.remove('hidden');
  hud.classList.add('hidden');
  document.exitPointerLock?.();
});

document.querySelector('#resume').addEventListener('click', () => {
  game.paused = false;
  if (matchMedia('(pointer: coarse)').matches) {
    pauseScreen.classList.add('hidden');
    hud.classList.remove('hidden');
    return;
  }
  pauseScreen.classList.add('hidden');
  hud.classList.remove('hidden');
  canvas.requestPointerLock?.();
});

document.querySelector('#quit').addEventListener('click', () => {
  clearTouchControls();
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

    if ((mouse.firing || touchInput.firing) && getWeapon().id === 'rifle') doShot();
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
  if (operatorPreview) {
    resizeOperatorPreview();
    operatorPreview.operator.rotation.y = Math.sin(performance.now() * 0.00025) * 0.035;
    operatorPreview.renderer.render(operatorPreview.scene, operatorPreview.camera);
  }
  updateHud();
}

function animate() {
  requestAnimationFrame(animate);
  updateRenderer();
}

buildArena();
resetBots();
operatorPreview = createOperatorPreview();
resizeOperatorPreview();
renderArsenal();
updateHud();
animate();

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  resizeOperatorPreview();
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
