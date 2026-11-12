/*
 * Project Horizons — Chapter 4 Season 1
 * Playable browser battle-royale tribute.
 *
 * All assets are procedurally drawn. Names, locations, weapons, battle-pass
 * structure, shop pricing, and systems follow Chapter 4 Season 1.
 *
 * Controls:
 *   WASD / Arrows  Move
 *   Mouse          Aim
 *   Left Click     Shoot
 *   1–4            Switch weapon slot
 *   R              Reload
 *   F              Interact (open chests)
 *   Space          Jump / hop
 *   Enter          Open / close lobby menu
 */

// ===========================================================================
// CONSTANTS / THEME (Chapter 4 Season 1)
// ===========================================================================

const W = 1280, H = 720;
const WORLD = 4000;

const PALETTE = {
  grass: '#7aa95e',
  grassDark: '#5d813f',
  grassLight: '#9cc473',
  dirt: '#8b6a4a',
  stone: '#b9c0c6',
  water: '#4a90d9',
  wood: '#c9a25a',
  brick: '#c95a5a',
  metal: '#aab4c2',
  gold: '#ffd166',
  goldDark: '#e8a33d',
  accent: '#ff4757',
  ui: '#07080c'
};

const LOCATIONS = [
  { name: 'The Citadel',       x: 900,  y: 900,  radius: 260, color: '#b8c4d6', type: 'castle' },
  { name: 'Mega City',         x: 1700, y: 900,  radius: 300, color: '#e3e8ee', type: 'metro' },
  { name: 'Shattered Slabs',   x: 2500, y: 900,  radius: 220, color: '#a8a8a8', type: 'slabs' },
  { name: 'Knotty Nets',       x: 500,  y: 1700, radius: 160, color: '#6f9a5e', type: 'camp' },
  { name: 'Lonely Labs',       x: 2900, y: 1700, radius: 170, color: '#e0e0e0', type: 'lab' },
  { name: 'Anvil Square',      x: 1700, y: 2200, radius: 240, color: '#d8d8d8', type: 'town' },
  { name: 'Brutal Bastion',    x: 900,  y: 2500, radius: 250, color: '#8d6e63', type: 'fort' },
  { name: 'Faulty Splits',     x: 2500, y: 2500, radius: 230, color: '#c0c0c0', type: 'city' }
];

const WEAPON_DATA = {
  stinger:  { name: 'Stinger SMG',       dmg: 18, rof: 95,  range: 640, spread: 1.5, mag: 30, reload: 1.6, color: PALETTE.gold, icon: '🔫', type: 'smg' },
  thunder:  { name: 'Thunder Burst SMG', dmg: 22, rof: 150, range: 620, spread: 1.1, mag: 24, reload: 1.9, color: '#a8b4d1', icon: '💥', type: 'smg' },
  hammer:   { name: 'Hammer AR',         dmg: 26, rof: 110, range: 780, spread: 0.6, mag: 24, reload: 2.1, color: '#c9a25a', icon: '🔫', type: 'ar' },
  ranger:   { name: 'Ranger Shotgun',    dmg: 88, rof: 420, range: 270, spread: 4.4, mag: 6,  reload: 2.4, color: PALETTE.brick, icon: '🏹', type: 'sg' },
  flare:    { name: 'Flare Gun',         dmg: 32, rof: 700, range: 720, spread: 0.4, mag: 1,  reload: 2.6, color: PALETTE.accent, icon: '🧨', type: 'flare' },
  chug:     { name: 'Chug Cannon',       dmg: 0,  rof: 500, range: 460, spread: 0,   mag: 6,  reload: 2.0, color: '#2ecc71', icon: '🍗', type: 'heal' }
};

const LOOT_ORDER = ['stinger', 'thunder', 'hammer', 'ranger', 'flare', 'chug'];

// Economy
const BATTLE_PASS_COST = 950;
const LEVEL_UP_COINS = 1450;
const QUEST_COIN_MIN = 5;
const QUEST_COIN_MAX = 10;

// ===========================================================================
// STORAGE
// ===========================================================================

let storage = {
  coins: 300,
  xp: 0,
  level: 1,
  ownedSkins: ['knight'],
  ownedEmotes: [],
  ownedWraps: [],
  ownedLoads: [],
  equippedSkin: 'knight',
  equippedWrap: 'basic',
  equippedEmote: null,
  selectedMusic: 'main',
  mode: 'ai',   // 'ai' or 'real'
  aiCount: 40,
  passOwned: false,
  passTier: 0,
  passXp: 0,
  quests: [],
  favorites: {},
  stats: { wins: 0, kills: 0, matches: 0 }
};

function loadStorage() {
  try {
    const s = localStorage.getItem('c4s1_game');
    if (s) storage = { ...storage, ...JSON.parse(s) };
  } catch (e) { console.warn('storage load failed', e); }
  if (!storage.quests || storage.quests.length !== 3) storage.quests = generateQuests();
  saveStorage();
}
function saveStorage() {
  try { localStorage.setItem('c4s1_game', JSON.stringify(storage)); } catch (e) {}
}

function generateQuests() {
  const pool = [
    'Eliminate 3 opponents',
    'Open 5 chests',
    'Travel 1500m',
    'Deal 500 damage',
    'Survive top 10',
    'Land at The Citadel',
    'Heal 100 HP',
    'Eliminate 1 opponent with a shotgun',
    'Open 3 chests at Mega City'
  ];
  return pool.slice().sort(() => Math.random() - 0.5).slice(0, 3).map(t => ({
    text: t, done: false, reward: Math.floor(Math.random() * (QUEST_COIN_MAX - QUEST_COIN_MIN + 1)) + QUEST_COIN_MIN
  }));
}

// ===========================================================================
// BATTLE PASS & SHOP DATA
// ===========================================================================

// 8 tiers: skins + emotes (Chapter 4 Season 1 flavored)
const BATTLE_PASS = [
  { tier: 1, reward: { kind: 'skin', id: 'knight', name: 'Steel Knight', icon: '⚔️', color: '#c9c9c9', favored: 1 }, locked: true },
  { tier: 2, reward: { kind: 'emote', id: 'salute', name: 'Victory Salute', icon: '🫡', color: PALETTE.gold, favored: 1 }, locked: true },
  { tier: 3, reward: { kind: 'skin', id: 'mecha', name: 'Neon Mecha', icon: '🤖', color: '#00f2ff', favored: 2 }, locked: true },
  { tier: 4, reward: { kind: 'skin', id: 'samurai', name: 'Cyber Samurai', icon: '🗡️', color: '#a855f7', favored: 3 }, locked: true },
  { tier: 5, reward: { kind: 'emote', id: 'dab', name: 'Snowday Dab', icon: '🕺', color: PALETTE.gold, favored: 2 }, locked: true },
  { tier: 6, reward: { kind: 'skin', id: 'frost', name: 'Frost Ranger', icon: '🏹', color: '#93c5fd', favored: 3 }, locked: true },
  { tier: 7, reward: { kind: 'skin', id: 'gold', name: 'Gilded Champion', icon: '👑', color: PALETTE.gold, favored: 5 }, locked: true },
  { tier: 8, reward: { kind: 'skin', id: 'shadow', name: 'Shadow Ops', icon: '🕶️', color: '#1e293b', favored: 5 }, locked: true }
];

const SKIN_COLORS = {
  knight: '#c9c9c9', mecha: '#00f2ff', samurai: '#a855f7', frost: '#93c5fd', gold: PALETTE.gold, shadow: '#1e293b'
};

const SHOP_ITEMS = [
  { id: 'skin_stinger', kind: 'skin', name: 'Arsenal Stinger', icon: '🔫', base: 1400, favored: 4, cat: 'skins' },
  { id: 'skin_glider', kind: 'skin', name: 'Glide Captain', icon: '🪂', base: 1600, favored: 3, cat: 'skins' },
  { id: 'wrap_ice', kind: 'wrap', name: 'Frost Wrap', icon: '🧊', base: 400, favored: 2, cat: 'wraps' },
  { id: 'wrap_gold', kind: 'wrap', name: 'Gilded Wrap', icon: '🏆', base: 600, favored: 4, cat: 'wraps' },
  { id: 'emote_rock', kind: 'emote', name: 'Rock Out', icon: '🤘', base: 300, favored: 3, cat: 'emotes' },
  { id: 'emote_bow', kind: 'emote', name: 'Heroic Bow', icon: '🙇', base: 350, favored: 3, cat: 'emotes' },
  { id: 'load_citadel', kind: 'load', name: 'Citadel Loading', icon: '🏰', base: 500, favored: 2, cat: 'loads' },
  { id: 'load_battlebus', kind: 'load', name: 'Battle Bus Loading', icon: '🚌', base: 550, favored: 3, cat: 'loads' },
  { id: 'bundle_bastion', kind: 'bundle', name: 'Bastion Bundle', icon: '📦', base: 2400, favored: 5, cat: 'bundles' }
];

const MUSIC_TRACKS = [
  { id: 'main', name: 'Chapter 4 Season 1 Lobby' },
  { id: 'calm', name: 'The Citadel Ambient' },
  { id: 'upbeat', name: 'Mega City Beat' }
];

function shopPrice(it) {
  const mult = 1 + it.favored * 0.15;
  return Math.round(it.base * mult);
}
function isOwned(it) {
  if (it.kind === 'skin') return storage.ownedSkins.includes(it.id);
  if (it.kind === 'emote') return storage.ownedEmotes.includes(it.id);
  if (it.kind === 'wrap') return storage.ownedWraps.includes(it.id);
  if (it.kind === 'load') return storage.ownedLoads.includes(it.id);
  return false;
}
function markOwned(it) {
  if (it.kind === 'skin') storage.ownedSkins.push(it.id);
  if (it.kind === 'emote') storage.ownedEmotes.push(it.id);
  if (it.kind === 'wrap') storage.ownedWraps.push(it.id);
  if (it.kind === 'load') storage.ownedLoads.push(it.id);
}

// ===========================================================================
// GAME STATE
// ===========================================================================

const STATE_STARTUP = 'startup';
const STATE_LOBBY = 'lobby';
const STATE_PLAYING = 'playing';
const STATE_DEAD = 'dead';

let state = STATE_STARTUP;
let canvas, ctx, ui;
let lastT = 0;

// World drawing cache
let grassTex;

// Camera
let cam = { x: 0, y: 0 };

// Input
const input = {
  left: false, right: false, up: false, down: false,
  mouseDown: false, aim: { x: W / 2, y: H / 2 }
};
const keys = {};

// Entities
let players = [];
let selfIdx = 0;
let bullets = [];
let chests = [];
let animals = [];
let vehicles = [];
let floating = [];
let storm = { x: WORLD / 2, y: WORLD / 2, r: WORLD * 0.55, targetR: WORLD * 0.55, damage: 0, shrink: false };
let stormTimer = 0;
let bus = { x: -400, y: 300, active: false, dir: { x: 1, y: -0.2 }, passengers: [] };

// ===========================================================================
// INIT
// ===========================================================================

function init() {
  canvas = document.getElementById('game');
  ctx = canvas.getContext('2d');
  ui = document.getElementById('ui');
  grassTex = makeGrassTexture();

  bindInput();
  loadStorage();

  // boot-up animation
  bootSequence();

  // startup button
  document.getElementById('startBtn').addEventListener('click', () => {
    document.getElementById('startup').style.display = 'none';
    enterLobby();
  });

  requestAnimationFrame(loop);
}

// Chapter 4 Season 1 boot sequence: battle bus flies across the screen
let boot = { active: true, t: 0, busX: -260, busY: 260, done: false };
const bootCanvas = document.getElementById('bootCanvas');
const bootCtx = bootCanvas ? bootCanvas.getContext('2d') : null;

function bootSequence() {
  if (!bootCanvas) { boot.done = true; finishBoot(); return; }
  bootCanvas.width = W; bootCanvas.height = H;
  function frame(ts) {
    if (!boot.active) return;
    boot.t += 16;
    const bctx = bootCtx;
    bctx.fillStyle = '#050609'; bctx.fillRect(0, 0, W, H);
    // subtle stars / grid
    bctx.strokeStyle = 'rgba(255,255,255,0.04)'; bctx.lineWidth = 1;
    for (let i = 0; i < W; i += 40) { bctx.beginPath(); bctx.moveTo(i, 0); bctx.lineTo(i, H); bctx.stroke(); }
    for (let i = 0; i < H; i += 40) { bctx.beginPath(); bctx.moveTo(0, i); bctx.lineTo(W, i); bctx.stroke(); }

    // bus flight path
    const progress = Math.min(1, boot.t / 1500);
    boot.busX = -260 + (W + 300) * progress;
    boot.busY = 260 + Math.sin(progress * Math.PI) * -120;

    drawBattleBusIcon(bctx, boot.busX, boot.busY, 0);

    // trail
    bctx.strokeStyle = 'rgba(255,209,102,0.35)'; bctx.lineWidth = 3;
    bctx.beginPath(); bctx.moveTo(boot.busX - 40, boot.busY + 22); bctx.lineTo(boot.busX - 120, boot.busY + 40); bctx.stroke();

    // title glow behind
    const glow = Math.sin(boot.t * 0.003) * 12 + 28;
    bctx.fillStyle = 'rgba(255,209,102,0.10)';
    bctx.beginPath(); ctxArcSoft(bctx, W/2, H/2 - 40, glow); bctx.fill();

    if (progress >= 1 && !boot.done) {
      boot.done = true;
      setTimeout(() => {
        document.getElementById('startBtn').style.display = 'block';
        bootCanvas.style.opacity = '0';
        setTimeout(() => { boot.active = false; }, 600);
      }, 400);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function ctxArcSoft(cx, x, y, r) { cx.beginPath(); cx.arc(x, y, r, 0, Math.PI * 2); }

function drawBattleBusIcon(cx, x, y, scale) {
  cx.save();
  cx.translate(x, y);
  cx.scale(scale || 1, scale || 1);
  // bus body
  cx.fillStyle = '#e3e8ee';
  cx.fillRect(-44, -16, 88, 34);
  cx.fillStyle = '#cbd5e0';
  cx.fillRect(-34, -30, 68, 16); // top
  // windows
  cx.fillStyle = '#aec7e8';
  cx.fillRect(-36, -14, 16, 10); cx.fillRect(-12, -14, 16, 10); cx.fillRect(12, -14, 16, 10); cx.fillRect(20, -14, 16, 10);
  // wheels
  cx.fillStyle = '#2d3748';
  cx.beginPath(); cx.arc(-22, 6, 9, 0, Math.PI * 2); cx.fill();
  cx.beginPath(); cx.arc(22, 6, 9, 0, Math.PI * 2); cx.fill();
  // balloon on top
  cx.fillStyle = '#ffd166';
  cx.beginPath(); cx.arc(0, -36, 18, 0, Math.PI * 2); cx.fill();
  cx.fillStyle = '#e8a33d'; cx.beginPath(); cx.arc(0, -36, 18, 0, Math.PI * 2); cx.stroke();
  cx.fillStyle = '#fff'; cx.beginPath(); cx.arc(0, -40, 3, 0, Math.PI * 2); cx.fill();
  // engine glow
  cx.fillStyle = 'rgba(255,209,102,0.5)';
  cx.beginPath(); cx.arc(-38, 2, 6, 0, Math.PI * 2); cx.fill();
  cx.beginPath(); cx.arc(38, 2, 6, 0, Math.PI * 2); cx.fill();
  cx.restore();
}

function finishBoot() {
  if (document.getElementById('startBtn')) document.getElementById('startBtn').style.display = 'block';
}


function enterLobby() {
  state = STATE_LOBBY;
  setHudVisible(false);
  showPanel('lobby');
  renderLobby();
  drawMapPreview();
}

// ===========================================================================
// INPUT
// ===========================================================================

function bindInput() {
  window.addEventListener('mousemove', e => {
    const r = canvas.getBoundingClientRect();
    input.aim = { x: e.clientX - r.left, y: e.clientY - r.top };
  });
  window.addEventListener('mousedown', e => { if (e.button === 0) input.mouseDown = true; });
  window.addEventListener('mouseup', e => { if (e.button === 0) input.mouseDown = false; });
  window.addEventListener('contextmenu', e => e.preventDefault());
  window.addEventListener('keydown', e => {
    keys[e.code] = true;
    const k = e.key.toLowerCase();
    if (k === 'w') input.up = true;
    if (k === 's') input.down = true;
    if (k === 'a') input.left = true;
    if (k === 'd') input.right = true;
    if (/^[1-4]$/.test(k)) { const me = getSelf(); if (me) me.switchWeapon(LOOT_ORDER[Number(k) - 1] || 'stinger'); }
    if (k === 'r') { const me = getSelf(); if (me) me.reload(performance.now()); }
    if (k === 'f') { const me = getSelf(); if (me) interact(me); }
    if (k === 'e') { const me = getSelf(); if (me) toggleVehicle(me); }
    if (k === ' ') { const me = getSelf(); if (me) { me.vx += (Math.random() - 0.5) * 10; me.vy += (Math.random() - 0.5) * 10; } }
    if (k === 'enter') toggleMenu();
  });
  window.addEventListener('keyup', e => {
    keys[e.code] = false;
    const k = e.key.toLowerCase();
    if (k === 'w') input.up = false;
    if (k === 's') input.down = false;
    if (k === 'a') input.left = false;
    if (k === 'd') input.right = false;
  });
}

// ===========================================================================
// PANELS
// ===========================================================================

function showPanel(id) {
  document.querySelectorAll('.panel').forEach(el => el.classList.remove('visible'));
  const el = document.getElementById(id);
  if (el) el.classList.add('visible');
}
function setHudVisible(v) { document.getElementById('hud').style.display = v ? 'block' : 'none'; }

function toggleMenu() {
  if (state === STATE_PLAYING) { state = STATE_LOBBY; setHudVisible(false); showPanel('lobby'); renderLobby(); }
  else if (state === STATE_LOBBY) { state = STATE_PLAYING; setHudVisible(true); showPanel(null); }
}

// ===========================================================================
// LOBBY RENDER
// ===========================================================================

function renderLobby() {
  // coins / level / xp
  const c = document.getElementById('coinAmt'); if (c) c.textContent = 'C ' + storage.coins;
  const lvl = document.getElementById('lvl'); if (lvl) lvl.textContent = storage.level;
  const shopC = document.getElementById('shopCoinAmt'); if (shopC) shopC.textContent = 'C ' + storage.coins;
  const bpC = document.getElementById('bpCoinAmt'); if (bpC) bpC.textContent = 'C ' + storage.coins;
  const bpT = document.getElementById('bpTier'); if (bpT) bpT.textContent = storage.passTier;
  const xp = document.getElementById('xpbar'); if (xp) { const need = storage.level * 500; xp.style.width = Math.min(100, (storage.xp / need) * 100) + '%'; }

  // mode
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.mode === storage.mode);
  });
  const aiWrap = document.getElementById('aiWrap'); if (aiWrap) aiWrap.style.display = storage.mode === 'ai' ? 'block' : 'none';
  const aiVal = document.getElementById('aiVal'); if (aiVal) aiVal.textContent = storage.aiCount;

  // music
  const mg = document.getElementById('musicGrid'); mg.innerHTML = '';
  MUSIC_TRACKS.forEach((tr, i) => {
    const d = document.createElement('div');
    d.className = 'music-opt ' + (tr.id === storage.selectedMusic ? 'selected' : '');
    d.innerHTML = '<div class="dot ' + (tr.id === storage.selectedMusic ? 'active' : '') + '"></div><div class="t">' + tr.name + '</div>';
    d.onclick = () => { storage.selectedMusic = tr.id; saveStorage(); renderLobby(); };
    mg.appendChild(d);
  });

  // quests
  const qlist = document.getElementById('quests'); qlist.innerHTML = '';
  storage.quests.forEach(q => {
    const d = document.createElement('div');
    d.className = 'quest-item ' + (q.done ? 'done' : '');
    d.innerHTML = '<div class="qmark">' + (q.done ? '✔' : '?') + '</div><div class="qtext">' + q.text + '</div><div class="qreward">' + (q.done ? 'DONE' : q.reward + ' C') + '</div>';
    d.onclick = () => { if (!q.done) completeQuest(q); };
    qlist.appendChild(d);
  });

  // pass status
  const ps = document.getElementById('passStatus');
  if (storage.passOwned) ps.innerHTML = '<div style="color:#2ecc71;font-weight:800;font-size:13px;">Battle Pass owned · Tier ' + storage.passTier + '</div>';
  else ps.innerHTML = '<div style="color:#cfd8ea;font-size:12px;">Unlock 8 skins + 2 emotes for 950 C</div>';
}

// Mode controls
document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', () => { storage.mode = btn.dataset.mode; saveStorage(); renderLobby(); });
});
document.getElementById('aiMinus').addEventListener('click', () => { if (storage.aiCount > 35) { storage.aiCount--; saveStorage(); renderLobby(); } });
document.getElementById('aiPlus').addEventListener('click', () => { if (storage.aiCount < 45) { storage.aiCount++; saveStorage(); renderLobby(); } });

// Play
document.getElementById('playBtn').addEventListener('click', () => {
  spawnChests();
  spawnAnimals();
  spawnVehicles();
  startMatch();
});

// ===========================================================================
// QUESTS
// ===========================================================================

function completeQuest(q) {
  q.done = true;
  const gain = q.reward;
  storage.coins += gain;
  addXp(30);
  saveStorage();
  renderLobby();
  renderQuestsTab();
  showMsg('Quest complete +' + gain + ' C', '#2ecc71');
  if (storage.quests.every(x => x.done)) {
    storage.quests = generateQuests();
    saveStorage();
    renderLobby();
    renderQuestsTab();
  }
}

// ===========================================================================
// MATCH
// ===========================================================================

function startMatch() {
  players = [];
  bullets = [];
  chests = [];
  floating = [];
  storm = { x: WORLD / 2, y: WORLD / 2, r: WORLD * 0.55, targetR: WORLD * 0.55, damage: 0, shrink: false };
  stormTimer = 0;

  const me = spawnPlayer(WORLD / 2, WORLD / 2, 'You', false, storage.equippedSkin);
  selfIdx = 0;
  players.push(me);

  const mode = storage.mode;
  const aiCount = mode === 'ai' ? storage.aiCount : 0;
  const totalTarget = 100;

  // AI players
  for (let i = 1; i <= aiCount && players.length < totalTarget; i++) {
    const loc = LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)];
    const b = spawnPlayer(loc.x + (Math.random() - 0.5) * loc.radius * 1.5, loc.y + (Math.random() - 0.5) * loc.radius * 1.5, 'Bot ' + i, true, randSkin());
    b.team = 'ai';
    players.push(b);
  }
  // real-player placeholders (filled lobby)
  while (players.length < totalTarget) {
    const loc = LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)];
    const p = spawnPlayer(loc.x + (Math.random() - 0.5) * loc.radius * 1.5, loc.y + (Math.random() - 0.5) * loc.radius * 1.5, 'Player ' + players.length, true, randSkin());
    p.team = 'real';
    players.push(p);
  }

  cam = { x: me.x - W / 2, y: me.y - H / 2 };
  busStart();
  state = STATE_PLAYING;
  setHudVisible(true);
  showPanel(null);
}

function randSkin() {
  const s = ['knight', 'mecha', 'samurai', 'frost', 'gold', 'shadow'];
  return s[Math.floor(Math.random() * s.length)];
}

function spawnPlayer(x, y, name, isBot, skin) {
  const p = new Entity(x, y, 16, SKIN_COLORS[skin] || '#fff');
  p.name = name;
  p.isBot = isBot;
  p.skin = skin || 'knight';
  p.color = SKIN_COLORS[p.skin];
  p.team = p.isBot ? (Math.random() < 0.5 ? 'ai' : 'real') : 'solo';
  p.switchWeapon('stinger');
  return p;
}

function getSelf() { return players[selfIdx]; }

// Battle bus + skydive
function busStart() {
  bus.active = true;
  bus.x = -500;
  bus.y = 350;
  bus.dir = { x: 1, y: -0.15 };
  bus.passengers = players.slice();
  setTimeout(() => { skydiveAll(); }, 700);
  setTimeout(() => { bus.active = false; }, 3400);
}

function skydiveAll() {
  bus.passengers.forEach(p => {
    const loc = LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)];
    p.x = loc.x + (Math.random() - 0.5) * 500;
    p.y = loc.y + (Math.random() - 0.5) * 500;
    p.vx = (Math.random() - 0.5) * 6;
    p.vy = (Math.random() - 0.5) * 6;
  });
}

// Chests
function spawnChests() {
  chests = [];
  LOCATIONS.forEach(l => {
    for (let i = 0; i < 6; i++) {
      chests.push({
        x: l.x + (Math.random() - 0.5) * l.radius,
        y: l.y + (Math.random() - 0.5) * l.radius,
        opened: false,
        item: LOOT_ORDER[Math.floor(Math.random() * LOOT_ORDER.length)]
      });
    }
  });
}

function spawnAnimals() {
  animals = [];
  const counts = { wolf: 14, boar: 10, chicken: 12, crow: 16 };
  LOCATIONS.forEach(l => {
    for (let i = 0; i < counts.wolf; i++) {
      animals.push(new Animal('wolf', l.x + (Math.random() - 0.5) * l.radius * 1.3, l.y + (Math.random() - 0.5) * l.radius * 1.3));
    }
    for (let i = 0; i < counts.boar; i++) {
      animals.push(new Animal('boar', l.x + (Math.random() - 0.5) * l.radius * 1.3, l.y + (Math.random() - 0.5) * l.radius * 1.3));
    }
    for (let i = 0; i < counts.chicken; i++) {
      animals.push(new Animal('chicken', l.x + (Math.random() - 0.5) * l.radius * 1.3, l.y + (Math.random() - 0.5) * l.radius * 1.3));
    }
    for (let i = 0; i < counts.crow; i++) {
      animals.push(new Animal('crow', l.x + (Math.random() - 0.5) * l.radius * 1.6, l.y + (Math.random() - 0.5) * l.radius * 1.6));
    }
  });
}

function spawnVehicles() {
  vehicles = [];
  const carColors = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#34495e'];
  LOCATIONS.forEach(l => {
    for (let i = 0; i < 3; i++) {
      vehicles.push(new Vehicle('car', l.x + (Math.random() - 0.5) * l.radius, l.y + (Math.random() - 0.5) * l.radius, carColors[Math.floor(Math.random() * carColors.length)]));
    }
    for (let i = 0; i < 2; i++) {
      vehicles.push(new Vehicle('dirtbike', l.x + (Math.random() - 0.5) * l.radius, l.y + (Math.random() - 0.5) * l.radius, '#e74c3c'));
    }
  });
}

// ===========================================================================
// ENTITY
// ===========================================================================

class Entity {
  constructor(x, y, r, color) {
    this.x = x; this.y = y; this.r = r || 16; this.color = color;
    this.vx = 0; this.vy = 0;
    this.hp = 100; this.maxHp = 100;
    this.dead = false; this.knocked = false; this.eliminated = false;
    this.weaponId = 'stinger';
    this.ammo = WEAPON_DATA.stinger.mag;
    this.ammoReserve = 90;
    this.lastShot = 0;
    this.reloadUntil = 0;
    this.skin = 'knight';
    this.dir = 0;
    this.frame = 0;
  }
  get weapon() { return WEAPON_DATA[this.weaponId]; }
  switchWeapon(id) {
    if (WEAPON_DATA[id]) { this.weaponId = id; this.ammo = WEAPON_DATA[id].mag; this.lastShot = 0; }
  }
  canShoot(t) { return !this.dead && !this.knocked && t >= this.lastShot && t >= this.reloadUntil; }
  shoot(t, target) {
    const w = this.weapon;
    const delay = 60000 / w.rof;
    this.lastShot = t + delay;
    if (this.ammo > 0) this.ammo--;
    const dx = target.x - this.x, dy = target.y - this.y;
    let ang = Math.atan2(dy, dx);
    ang += (Math.random() - 0.5) * w.spread * 0.06;
    const speed = w.type === 'sg' ? 15 : 22;
    return { x: this.x, y: this.y, ang, speed, dmg: w.dmg, type: w.type, range: w.range, owner: this, pellets: w.type === 'sg' ? 6 : 1, life: 0 };
  }
  heal() {
    if (this.weaponId === 'chug' && this.ammo > 0 && this.hp < this.maxHp) {
      this.ammo--;
      this.hp = Math.min(this.maxHp, this.hp + 25);
      return true;
    }
    return false;
  }
  reload(t) {
    if (this.ammo < this.weapon.mag && this.ammoReserve > 0) {
      const need = this.weapon.mag - this.ammo;
      const take = Math.min(need, this.ammoReserve);
      this.ammoReserve -= take;
      this.ammo += take;
      this.reloadUntil = t + this.weapon.reload * 1000;
      return true;
    }
    return false;
  }
  update(dt) {
    if (this.dead) return;
    if (this.inVehicle) return; // vehicle drives position
    this.vx *= 0.88;
    this.vy *= 0.88;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.x = Math.max(40, Math.min(WORLD - 40, this.x));
    this.y = Math.max(40, Math.min(WORLD - 40, this.y));
    if (this.hp <= 0) { this.dead = true; this.eliminated = true; }
    this.frame += dt;
  }
  draw(cx, cy, isSelf) {
    if (this.dead && this.eliminated) return;
    const sx = this.x - cx, sy = this.y - cy;
    if (sx < -120 || sx > W + 120 || sy < -120 || sy > H + 120) return;
    ctx.save();
    ctx.translate(sx, sy);
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(4, 10, 14, 7, 0, 0, Math.PI * 2); ctx.fill();
    // head
    ctx.fillStyle = SKIN_COLORS[this.skin] || '#fff';
    ctx.beginPath(); ctx.arc(0, -7, 12, 0, Math.PI * 2); ctx.fill();
    // torso
    ctx.fillStyle = this.color || '#fff';
    ctx.beginPath(); ctx.moveTo(-10, 9); ctx.lineTo(-8, 22); ctx.lineTo(8, 22); ctx.lineTo(10, 9); ctx.fill();
    // legs
    ctx.fillStyle = '#334155';
    ctx.fillRect(-7, 22, 5, 11); ctx.fillRect(2, 22, 5, 11);
    // weapon
    ctx.fillStyle = this.weapon.color;
    ctx.beginPath(); ctx.arc(13, 5, 6, 0, Math.PI * 2); ctx.fill();
    // hp bar
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(-17, -28, 34, 6);
    ctx.fillStyle = '#2ecc71'; ctx.fillRect(-16, -27, 32 * (this.hp / this.maxHp), 4);
    // name
    ctx.fillStyle = '#fff'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(this.name || 'Player', 0, -34);
    if (isSelf) {
      ctx.strokeStyle = PALETTE.gold; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, -7, 14, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }
}

class Bullet {
  constructor(b) { Object.assign(this, b); this.life = 0; }
  update() { this.x += Math.cos(this.ang) * this.speed; this.y += Math.sin(this.ang) * this.speed; this.life += this.speed; }
}

function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

// ===========================================================================
// ANIMALS (Chapter 4 Season 1 wildlife: wolves, boars, chickens, crows)
// ===========================================================================

class Animal {
  constructor(type, x, y) {
    this.type = type;
    this.x = x; this.y = y;
    this.vx = 0; this.vy = 0;
    this.hp = type === 'wolf' ? 150 : type === 'boar' ? 200 : 40;
    this.maxHp = this.hp;
    this.dead = false;
    this.dir = Math.random() * Math.PI * 2;
    this.wanderTimer = 0;
    this.fleeFrom = null;
    this.fleeTimer = 0;
    // size by type
    this.r = type === 'crow' ? 6 : type === 'chicken' ? 9 : type === 'boar' ? 14 : 12;
    this.color = type === 'wolf' ? '#7f8c8d' : type === 'boar' ? '#8d6e63' : type === 'chicken' ? '#f5f5f5' : '#2c3e50';
  }
  update(dt, players) {
    if (this.dead) { this.vx *= 0.9; this.vy *= 0.9; this.x += this.vx * dt; this.y += this.vy * dt; return; }
    const me = getSelf();
    // flee from nearby players / gunfire
    let flee = null;
    players.forEach(p => {
      if (p.dead || p.eliminated) return;
      const d = dist(this, p);
      const fleeDist = this.type === 'crow' ? 320 : this.type === 'chicken' ? 260 : 220;
      if (d < fleeDist) { if (!flee || d < dist(this, flee)) flee = p; }
    });
    // also flee from close bullets
    bullets.forEach(b => {
      if (dist(this, b) < 180 && b.owner && b.owner === me) flee = b.owner;
    });

    this.wanderTimer += dt;
    if (this.wanderTimer > 900) {
      this.wanderTimer = 0;
      this.dir = Math.random() * Math.PI * 2;
    }

    const spd = this.type === 'crow' ? 2.6 : this.type === 'chicken' ? 2.0 : this.type === 'boar' ? 1.5 : 1.8;
    if (flee) {
      const ang = Math.atan2(this.y - flee.y, this.x - flee.x);
      this.vx += Math.cos(ang) * spd * 1.6;
      this.vy += Math.sin(ang) * spd * 1.6;
    } else {
      this.vx += Math.cos(this.dir) * spd * 0.6;
      this.vy += Math.sin(this.dir) * spd * 0.6;
    }

    this.vx *= 0.86; this.vy *= 0.86;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.x = Math.max(30, Math.min(WORLD - 30, this.x));
    this.y = Math.max(30, Math.min(WORLD - 30, this.y));
    if (this.hp <= 0) this.dead = true;
  }
  draw(cx, cy) {
    if (this.dead) return;
    const sx = this.x - cx, sy = this.y - cy;
    if (sx < -60 || sx > W + 60 || sy < -60 || sy > H + 60) return;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(this.type === 'crow' ? 0 : Math.atan2(this.vy, this.vx));
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(0, 6, this.r * 0.9, this.r * 0.35, 0, 0, Math.PI * 2); ctx.fill();
    if (this.type === 'crow') {
      ctx.fillStyle = '#2c3e50';
      ctx.beginPath(); ctx.arc(0, -2, this.r, 0, Math.PI * 2); ctx.fill(); // body
      ctx.fillStyle = '#1a1a1a';
      ctx.beginPath(); ctx.arc(-6, -6, this.r * 0.55, 0, Math.PI * 2); ctx.fill(); // head
      ctx.fillStyle = '#e74c3c'; ctx.fillRect(-8, -5, 3, 2); // beak
      ctx.fillStyle = '#fff'; ctx.fillRect(-6.5, -7, 1.5, 1.5); // eye
    } else if (this.type === 'chicken') {
      ctx.fillStyle = this.color;
      ctx.beginPath(); ctx.ellipse(0, 0, this.r, this.r * 0.85, 0, 0, Math.PI * 2); ctx.fill(); // body
      ctx.fillStyle = '#e67e22'; ctx.beginPath(); ctx.arc(-this.r + 2, -3, this.r * 0.55, 0, Math.PI * 2); ctx.fill(); // head
      ctx.fillStyle = '#f1c40f'; ctx.fillRect(-this.r + 1, -6, 4, 2); // beak
      ctx.fillStyle = '#c0392b'; ctx.fillRect(0, this.r * 0.5, 4, 5); // wattle
      ctx.fillStyle = '#fff'; ctx.fillRect(-this.r + 0.5, -4, 1.5, 1.5); // eye
    } else if (this.type === 'boar') {
      ctx.fillStyle = this.color;
      ctx.beginPath(); ctx.ellipse(0, 2, this.r * 1.15, this.r * 0.8, 0, 0, Math.PI * 2); ctx.fill(); // body
      ctx.fillStyle = '#7d5a53'; ctx.beginPath(); ctx.arc(this.r * 0.9, -2, this.r * 0.6, 0, Math.PI * 2); ctx.fill(); // head
      ctx.fillStyle = '#ecf0f1'; ctx.fillRect(this.r * 1.2, -5, 3, 4); ctx.fillRect(this.r * 1.2, -1, 3, 4); // tusks
      ctx.fillStyle = '#000'; ctx.fillRect(this.r * 1.05, -4, 1.5, 1.5); // eye
      ctx.fillStyle = '#5d4037';
      ctx.fillRect(-this.r * 0.5, 4, 4, 8); ctx.fillRect(this.r * 0.5 - 4, 4, 4, 8); // legs
    } else { // wolf
      ctx.fillStyle = this.color;
      ctx.beginPath(); ctx.ellipse(0, 0, this.r * 1.1, this.r * 0.75, 0, 0, Math.PI * 2); ctx.fill(); // body
      ctx.fillStyle = '#616a6b'; ctx.beginPath(); ctx.arc(this.r * 0.95, -3, this.r * 0.62, 0, Math.PI * 2); ctx.fill(); // head
      ctx.fillStyle = '#ecf0f1'; ctx.fillRect(this.r * 1.1, -2, 2, 3); // snout
      ctx.fillStyle = '#000'; ctx.fillRect(this.r * 1.0, -4, 1.5, 1.5); // eye
      ctx.fillStyle = '#4b5556';
      ctx.fillRect(-this.r * 0.55, 5, 4, 9); ctx.fillRect(this.r * 0.55 - 4, 5, 4, 9); // legs
      ctx.fillStyle = '#bdc3c7'; ctx.beginPath(); ctx.arc(this.r * 0.5, -6, 3, 0, Math.PI * 2); ctx.fill(); // tail
    }
    // hp bar for damaged
    if (this.hp < this.maxHp) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(-this.r - 2, -this.r - 9, (this.r * 2) + 4, 5);
      ctx.fillStyle = '#e74c3c'; ctx.fillRect(-this.r - 1, -this.r - 8, ((this.r * 2) + 2) * (this.hp / this.maxHp), 3);
    }
    ctx.restore();
  }
}

// ===========================================================================
// VEHICLES (Chapter 4 Season 1: cars and dirt bikes)
// ===========================================================================

class Vehicle {
  constructor(type, x, y, color) {
    this.type = type;
    this.x = x; this.y = y;
    this.vx = 0; this.vy = 0;
    this.angle = 0;
    this.color = color;
    this.hp = type === 'car' ? 800 : 300;
    this.dead = false;
    this.driver = null;
    this.r = type === 'car' ? 22 : 14;
  }
  update(dt) {
    if (this.dead) return;
    if (this.driver) {
      // driving controls mirror player input
      let ax = 0, ay = 0;
      if (input.up) ay -= 1;
      if (input.down) ay += 1;
      if (input.left) ax -= 1;
      if (input.right) ax += 1;
      const spd = this.type === 'car' ? 5.5 : 7.2;
      const turn = this.type === 'car' ? 0.07 : 0.14;
      if (ay !== 0) {
        this.vx += Math.cos(this.angle) * ay * spd * 0.5;
        this.vy += Math.sin(this.angle) * ay * spd * 0.5;
      }
      if (ax !== 0) this.angle += ax * turn * (Math.abs(this.vx) + Math.abs(this.vy)) * 0.02 + 0.05;
      this.driver.x = this.x;
      this.driver.y = this.y;
      this.driver.dead = false;
    }
    this.vx *= 0.94; this.vy *= 0.94;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.x = Math.max(30, Math.min(WORLD - 30, this.x));
    this.y = Math.max(30, Math.min(WORLD - 30, this.y));
    if (this.hp <= 0) this.dead = true;
  }
  draw(cx, cy) {
    if (this.dead) return;
    const sx = this.x - cx, sy = this.y - cy;
    if (sx < -80 || sx > W + 80 || sy < -80 || sy > H + 80) return;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(this.angle);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(0, 5, this.r * 1.2, this.r * 0.4, 0, 0, Math.PI * 2); ctx.fill(); // shadow
    if (this.type === 'car') {
      ctx.fillStyle = this.color;
      ctx.fillRect(-this.r, -this.r * 0.7, this.r * 2, this.r * 1.4); // body
      ctx.fillStyle = '#333'; ctx.fillRect(-this.r * 0.5, -this.r * 1.05, this.r, this.r * 0.6); // roof
      ctx.fillStyle = '#222'; // wheels
      ctx.fillRect(-this.r * 1.15, -this.r * 0.1, this.r * 0.55, this.r * 0.9);
      ctx.fillRect(this.r * 0.6, -this.r * 0.1, this.r * 0.55, this.r * 0.9);
      ctx.fillRect(-this.r * 1.15, this.r * 0.75, this.r * 0.55, this.r * 0.9);
      ctx.fillRect(this.r * 0.6, this.r * 0.75, this.r * 0.55, this.r * 0.9);
      ctx.fillStyle = '#ffd166'; ctx.fillRect(-this.r * 1.35, -this.r * 0.15, this.r * 0.5, this.r * 0.35); // headlight
      ctx.fillStyle = '#ffd166'; ctx.fillRect(this.r * 0.85, this.r * 0.95, this.r * 0.5, this.r * 0.3); // taillight
    } else { // dirtbike
      ctx.fillStyle = this.color;
      ctx.fillRect(-this.r * 0.7, -this.r * 0.6, this.r * 1.4, this.r * 1.2); // frame
      ctx.fillStyle = '#222';
      ctx.beginPath(); ctx.arc(-this.r * 0.75, this.r * 0.55, this.r * 0.55, 0, Math.PI * 2); ctx.fill(); // wheel
      ctx.beginPath(); ctx.arc(this.r * 0.75, this.r * 0.55, this.r * 0.55, 0, Math.PI * 2); ctx.fill(); // wheel
      ctx.fillStyle = '#ffd166'; ctx.fillRect(this.r * 0.85, -this.r * 0.6, this.r * 0.45, this.r * 0.3); // headlight
      ctx.fillStyle = '#333'; ctx.fillRect(-this.r * 0.35, -this.r * 1.1, this.r * 0.7, this.r * 0.35); // handlebar
    }
    if (this.driver) {
      ctx.fillStyle = '#ffd166'; ctx.beginPath(); ctx.arc(0, -this.r * 0.35, 5, 0, Math.PI * 2); ctx.fill(); // driver marker
    }
    ctx.restore();
  }
}


function damageEntity(target, amount, source) {
  if (target.dead || target.eliminated) return;
  target.hp -= amount;
  createFloating(target.x, target.y, '-' + Math.round(amount), '#ff4757');
  if (target.hp <= 0 && !target.dead) {
    target.dead = true; target.eliminated = true;
    if (source === getSelf()) {
      storage.stats.kills++;
      addXp(50);
      storage.coins += 10;
      saveStorage();
      addKillfeed('You eliminated ' + target.name);
    }
    checkEnd();
  }
}

function addKillfeed(t) {
  floating.push({ x: W - 260, y: H - 100, text: t, color: '#cfd8ea', life: 0, kf: true });
}

let killMsgs = [];
function addKillfeed2(t) { killMsgs.push({ text: t, time: 0 }); }

function interact(me) {
  for (const c of chests) {
    if (!c.opened && dist(me, c) < 50) {
      c.opened = true;
      me.switchWeapon(c.item);
      me.ammoReserve += 60;
      createFloating(c.x, c.y, '+' + c.item.toUpperCase(), '#ffd166');
      return;
    }
  }
  toggleVehicle(me);
}

function toggleVehicle(me) {
  // exit if driving
  if (me.inVehicle) {
    const v = me.inVehicle;
    v.driver = null;
    me.inVehicle = null;
    me.x = v.x + Math.cos(v.angle) * 28;
    me.y = v.y + Math.sin(v.angle) * 28;
    me.vx = v.vx * 0.5; me.vy = v.vy * 0.5;
    createFloating(me.x, me.y, 'EXIT', '#cfd8ea');
    return;
  }
  // enter nearest empty vehicle
  let best = null, bd = 70;
  vehicles.forEach(v => {
    if (v.dead || v.driver) return;
    const d = dist(me, v);
    if (d < bd) { bd = d; best = v; }
  });
  if (best) {
    best.driver = me;
    me.inVehicle = best;
    me.x = best.x; me.y = best.y;
    createFloating(me.x, me.y, 'ENTER', '#ffd166');
  }
}

// ===========================================================================
// WORLD SYSTEMS (storm, xp, coins)
// ===========================================================================

let xpMsg = '';
function addXp(xp) {
  storage.xp += xp;
  const need = storage.level * 500;
  if (storage.xp >= need) {
    storage.level++;
    storage.xp -= need;
    storage.coins += LEVEL_UP_COINS;
    addXpMsg('LEVEL UP +' + LEVEL_UP_COINS + ' C');
    // battle pass tier up if owned
    if (storage.passOwned && storage.passTier < BATTLE_PASS.length) {
      storage.passTier++;
      const t = BATTLE_PASS[storage.passTier - 1];
      if (t.reward.kind === 'skin') storage.ownedSkins.push(t.reward.id);
      if (t.reward.kind === 'emote') storage.ownedEmotes.push(t.reward.id);
      saveStorage();
      renderBp();
      renderLobby();
      showMsg('Battle Pass Tier ' + storage.passTier + ' unlocked!', '#ffd166');
    }
  }
  saveStorage();
}
function addXpMsg(m) { xpMsg = m; setTimeout(() => { xpMsg = ''; }, 2500); }

function updateStorm(dt) {
  stormTimer += dt;
  if (stormTimer > 7500) {
    stormTimer = 0;
    const loc = LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)];
    storm.targetR *= 0.76;
    storm.x = WORLD * 0.42 + (loc.x - WORLD * 0.42) * 0.55 + (Math.random() - 0.5) * 450;
    storm.y = WORLD * 0.42 + (loc.y - WORLD * 0.42) * 0.55 + (Math.random() - 0.5) * 450;
    storm.damage += 3;
    storm.shrink = true; setTimeout(() => { storm.shrink = false; }, 1100);
  }
  if (storm.r > storm.targetR) storm.r -= (storm.r - storm.targetR) * 0.0015 * (dt / 16);
}

function checkEnd() {
  const alive = players.filter(p => !p.eliminated);
  if (alive.length <= 1) {
    setTimeout(() => {
      const winner = alive[0];
      storage.stats.matches++;
      if (winner === getSelf()) {
        storage.stats.wins++;
        storage.coins += 100;
        addXp(200);
        showMsg('VICTORY ROYALE', '#ffd166');
      } else {
        showMsg('ELIMINATED', '#ff4757');
      }
      saveStorage();
      renderLobby();
    }, 700);
  }
}

// ===========================================================================
// MAIN LOOP
// ===========================================================================

function loop(t) {
  const dt = Math.min(40, t - lastT);
  lastT = t;
  if (state === STATE_PLAYING) updateGame(dt);
  draw();
  requestAnimationFrame(loop);
}

function updateGame(dt) {
  const now = performance.now();
  const me = getSelf();
  if (!me) return;
  if (me.dead || me.eliminated) { checkEnd(); return; }

  // movement (on foot)
  if (!me.inVehicle) {
    let ax = 0, ay = 0;
    if (input.left) ax -= 1;
    if (input.right) ax += 1;
    if (input.up) ay -= 1;
    if (input.down) ay += 1;
    const len = Math.hypot(ax, ay);
    if (len) { ax /= len; ay /= len; }
    me.vx += ax * 4.2;
    me.vy += ay * 4.2;
  }

  // aim toward mouse
  me.dir = Math.atan2(input.aim.y - H / 2, input.aim.x - W / 2);

  // shoot
  if (input.mouseDown && me.canShoot(now)) {
    const target = { x: me.x + Math.cos(me.dir) * me.weapon.range, y: me.y + Math.sin(me.dir) * me.weapon.range };
    const b = me.shoot(now, target);
    if (b) bullets.push(b);
    if (me.ammo <= 0 && me.ammoReserve > 0) me.reload(now);
  }
  if (me.ammo <= 0 && me.ammoReserve > 0 && now > me.reloadUntil) me.reload(now);

  // bots
  players.forEach(p => {
    if (p === me || p.dead) return;
    const target = findNearestEnemy(p);
    if (target) {
      const ang = Math.atan2(target.y - p.y, target.x - p.x);
      p.vx += Math.cos(ang) * 2.1;
      p.vy += Math.sin(ang) * 2.1;
      p.dir = ang;
      if (now > p.lastShot && dist(p, target) < p.weapon.range) {
        const b = p.shoot(now, target);
        if (b) bullets.push(b);
        if (p.ammo <= 0) p.reload(now);
      }
    }
  });

  players.forEach(p => p.update(dt));
  animals.forEach(a => a.update(dt, players));
  vehicles.forEach(v => v.update(dt));
  bullets.forEach(b => b.update());

  // bullet collisions
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    if (b.life > b.range) { bullets.splice(i, 1); continue; }
    let hit = false;
    // players
    players.forEach(p => {
      if (hit || p === b.owner || p.dead || p.eliminated) return;
      if (dist(b, p) < p.r + 4) {
        let dealt = b.dmg;
        if (b.type === 'sg') dealt = b.dmg * b.pellets * 0.5;
        damageEntity(p, dealt, b.owner);
        createFloating(b.x, b.y, '-' + Math.round(dealt), '#ff4757');
        bullets.splice(i, 1);
        hit = true;
      }
    });
    // animals
    if (!hit) {
      animals.forEach(a => {
        if (a.dead || dist(b, a) < a.r + 3) {
          a.hp -= b.dmg;
          createFloating(b.x, b.y, '-' + Math.round(b.dmg), '#ff4757');
          if (a.hp <= 0) { a.dead = true; createFloating(a.x, a.y, '+MEAT', '#2ecc71'); }
          bullets.splice(i, 1);
          hit = true;
        }
      });
    }
    // vehicles
    if (!hit) {
      vehicles.forEach(v => {
        if (v.dead || dist(b, v) < v.r + 4) {
          v.hp -= b.dmg * 0.6;
          createFloating(b.x, b.y, '-' + Math.round(b.dmg * 0.6), '#bdc3c7');
          if (v.hp <= 0) { v.dead = true; if (v.driver) { v.driver.inVehicle = null; v.driver = null; } }
          bullets.splice(i, 1);
          hit = true;
        }
      });
    }
  }

  updateStorm(dt);
  players.forEach(p => {
    if (p.dead) return;
    if (dist(p, storm) > storm.r) { p.hp -= storm.damage * dt / 1000; createFloating(p.x, p.y, '-STORM', '#ff4757'); }
  });

  // camera follow self
  cam.x += (me.x - W / 2 - cam.x) * 0.11;
  cam.y += (me.y - H / 2 - cam.y) * 0.11;
  cam.x = Math.max(0, Math.min(WORLD - W, cam.x));
  cam.y = Math.max(0, Math.min(WORLD - H, cam.y));

  floating.forEach(f => { f.life += dt; f.y -= dt * 0.14; });
  floating = floating.filter(f => f.life < 1500);
  killMsgs.forEach(m => { m.time += dt; });
  killMsgs = killMsgs.filter(m => m.time < 2200);
}

function findNearestEnemy(p) {
  let best = null, bd = 1e9;
  players.forEach(q => {
    if (q === p || q.dead || q.eliminated) return;
    const d = dist(p, q);
    if (d < bd) { bd = d; best = q; }
  });
  return best;
}

function createFloating(x, y, text, color) { floating.push({ x, y, text, color, life: 0 }); }

// ===========================================================================
// DRAWING
// ===========================================================================

function draw() {
  ctx.fillStyle = '#0b1220';
  ctx.fillRect(0, 0, W, H);

  if (state === STATE_PLAYING || state === STATE_DEAD) {
    drawWorld();
    drawStorm();
    drawVehicles();
    drawBullets();
    drawPlayers();
    drawAnimals();
    drawFloating();
    drawHud();
    drawKillfeed();
  }
}

function makeGrassTexture() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const cx = c.getContext('2d');
  cx.fillStyle = PALETTE.grass; cx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 220; i++) {
    cx.fillStyle = Math.random() > 0.5 ? PALETTE.grassDark : PALETTE.grassLight;
    cx.beginPath();
    cx.arc(Math.random() * 128, Math.random() * 128, Math.random() * 3 + 2, 0, Math.PI * 2);
    cx.fill();
  }
  return c;
}

function drawWorld() {
  const tw = grassTex.width, th = grassTex.height;
  const ox = ((-cam.x) % tw + tw) % tw;
  const oy = ((-cam.y) % th + th) % th;
  for (let ty = -th; ty < H + th; ty += th)
    for (let tx = -tw; tx < W + tw; tx += tw)
      ctx.drawImage(grassTex, tx + ox, ty + oy);

  // locations
  LOCATIONS.forEach(l => {
    ctx.fillStyle = l.color + '1a';
    ctx.beginPath(); ctx.arc(l.x - cam.x, l.y - cam.y, l.radius, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = l.color + '66'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(l.x - cam.x, l.y - cam.y, l.radius, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = l.color; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(l.name, l.x - cam.x, l.y - cam.y - 12);
  });

  // trees (pine style)
  for (let i = 0; i < 420; i++) {
    const x = (i * 997) % WORLD;
    const y = (i * 331) % WORLD;
    const sx = x - cam.x, sy = y - cam.y;
    if (sx < -70 || sx > W + 70 || sy < -70 || sy > H + 70) continue;
    ctx.fillStyle = '#4b6e3f'; ctx.fillRect(sx - 5, sy + 10, 10, 18);
    ctx.fillStyle = '#3a5d33';
    ctx.beginPath(); ctx.moveTo(sx, sy - 18); ctx.lineTo(sx - 16, sy + 6); ctx.lineTo(sx + 16, sy + 6); ctx.fill();
    ctx.beginPath(); ctx.moveTo(sx, sy - 8); ctx.lineTo(sx - 13, sy + 2); ctx.lineTo(sx + 13, sy + 2); ctx.fill();
  }

  // houses
  for (let i = 0; i < 110; i++) {
    const x = (i * 307) % WORLD;
    const y = (i * 169) % WORLD;
    const sx = x - cam.x, sy = y - cam.y;
    if (sx < -140 || sx > W + 140 || sy < -140 || sy > H + 140) continue;
    ctx.fillStyle = '#e8e8e8'; ctx.fillRect(sx - 34, sy - 26, 68, 52);
    ctx.fillStyle = PALETTE.brick; ctx.fillRect(sx - 10, sy - 22, 20, 8); // door
    ctx.fillStyle = '#b9b9b9'; ctx.strokeRect(sx - 34, sy - 26, 68, 52);
    // windows
    ctx.fillStyle = '#5b8def'; ctx.fillRect(sx - 24, sy - 14, 10, 10); ctx.fillRect(sx + 14, sy - 14, 10, 10);
  }

  // chests
  chests.forEach(c => {
    if (c.opened) return;
    const sx = c.x - cam.x, sy = c.y - cam.y;
    ctx.fillStyle = '#bf8040'; ctx.fillRect(sx - 11, sy - 9, 22, 15);
    ctx.fillStyle = PALETTE.gold; ctx.fillRect(sx - 11, sy - 7, 22, 3);
    ctx.fillStyle = '#fff'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('C', sx, sy + 2);
  });
}

function drawStorm() {
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = PALETTE.accent;
  ctx.beginPath(); ctx.arc(WORLD / 2 - cam.x, WORLD / 2 - cam.y, WORLD * 3, 0, Math.PI * 2);
  ctx.beginPath(); ctx.arc(storm.x - cam.x, storm.y - cam.y, storm.r, 0, Math.PI * 2);
  ctx.fill('evenodd');
  ctx.globalAlpha = 1;
  ctx.restore();
  ctx.strokeStyle = PALETTE.accent; ctx.lineWidth = 3; ctx.setLineDash([14, 9]);
  ctx.beginPath(); ctx.arc(storm.x - cam.x, storm.y - cam.y, storm.r, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]);
}

function drawBullets() {
  bullets.forEach(b => {
    ctx.fillStyle = '#ffd166';
    ctx.beginPath(); ctx.arc(b.x - cam.x, b.y - cam.y, 3, 0, Math.PI * 2); ctx.fill();
  });
}

function drawPlayers() {
  const order = [...players].sort((a, b) => a.y - b.y);
  order.forEach(p => p.draw(cam.x, cam.y, p === getSelf()));
}

function drawFloating() {
  floating.forEach(f => {
    if (f.kf) return;
    ctx.fillStyle = f.color; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(f.text, f.x - cam.x, f.y - cam.y);
  });
}

function drawAnimals() {
  animals.forEach(a => a.draw(cam.x, cam.y));
}

function drawVehicles() {
  vehicles.forEach(v => v.draw(cam.x, cam.y));
}

function drawHud() {
  const me = getSelf();
  if (!me) return;

  // weapon slots
  const inv = document.getElementById('inv');
  inv.innerHTML = '';
  LOOT_ORDER.forEach(id => {
    const slot = document.createElement('div');
    slot.className = 'slot ' + (me.weaponId === id ? 'active' : '');
    slot.textContent = WEAPON_DATA[id].icon;
    const ammo = document.createElement('div');
    ammo.className = 'ammo';
    ammo.textContent = me.weaponId === id ? me.ammo : '';
    slot.appendChild(ammo);
    inv.appendChild(slot);
  });

  const rankEl = document.getElementById('rankText');
  const alive = players.filter(p => !p.eliminated);
  const rank = alive.indexOf(me) + 1;
  if (rankEl) rankEl.textContent = '#' + rank + ' / ' + alive.length;
  const killEl = document.getElementById('killText'); if (killEl) killEl.textContent = 'KILLS ' + storage.stats.kills;
  const coinEl = document.getElementById('coinText'); if (coinEl) coinEl.textContent = 'C ' + storage.coins;

  const stormEl = document.getElementById('stormText');
  if (storm.shrink) stormEl.style.display = 'block'; else stormEl.style.display = 'none';

  if (xpMsg) {
    ctx.fillStyle = '#2ecc71'; ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(xpMsg, W / 2, H / 2 - 70);
  }

  // crosshair
  ctx.strokeStyle = PALETTE.gold; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(W / 2, H / 2, 10, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(W / 2, H / 2 - 15); ctx.lineTo(W / 2, H / 2 - 7);
  ctx.moveTo(W / 2, H / 2 + 15); ctx.lineTo(W / 2, H / 2 + 7);
  ctx.moveTo(W / 2 - 15, H / 2); ctx.lineTo(W / 2 - 7, H / 2);
  ctx.moveTo(W / 2 + 15, H / 2); ctx.lineTo(W / 2 + 7, H / 2);
  ctx.stroke();
}

function drawKillfeed() {
  ctx.textAlign = 'right'; ctx.font = '13px sans-serif';
  killMsgs.slice(-6).forEach((m, i) => {
    ctx.fillStyle = m.time < 1200 ? '#cfd8ea' : 'rgba(207,216,234,0.4)';
    ctx.fillText(m.text, W - 20, H - 140 + i * 18);
  });
}

// ===========================================================================
// SHOP / BATTLE PASS / QUESTS PANELS
// ===========================================================================

function renderShop() {
  const grid = document.getElementById('shopGrid'); grid.innerHTML = '';
  SHOP_ITEMS.forEach(it => {
    const price = shopPrice(it);
    const owned = isOwned(it);
    const el = document.createElement('div');
    el.className = 'item ' + (owned ? 'owned' : '') + (storage.coins < price ? ' locked' : '');
    el.innerHTML =
      '<div class="thumb">' + it.icon + '</div>' +
      '<div class="name">' + it.name + '</div>' +
      '<div class="price">' + price + ' C ' + (owned ? 'OWNED' : '') + '</div>' +
      (owned ? '<div class="owned">OWNED</div>' : '');
    el.onclick = () => {
      if (owned) { showMsg('Already owned', '#cfd8ea'); return; }
      if (storage.coins < price) { showMsg('Not enough coins', '#ff4757'); return; }
      storage.coins -= price;
      markOwned(it);
      saveStorage();
      renderShop();
      renderLobby();
      showMsg('Purchased: ' + it.name, '#2ecc71');
    };
    grid.appendChild(el);
  });
}

function renderBp() {
  const grid = document.getElementById('bpGrid'); grid.innerHTML = '';
  BATTLE_PASS.forEach((t, idx) => {
    const unlocked = storage.passOwned && t.tier <= storage.passTier;
    const el = document.createElement('div');
    el.className = 'bp-tier ' + (unlocked ? 'unlocked' : 'locked');
    el.innerHTML =
      '<div class="tier">Tier ' + t.tier + '</div>' +
      '<div class="thumb">' + t.reward.icon + '</div>' +
      '<div class="name">' + t.reward.name + '</div>' +
      (!unlocked && !storage.passOwned ? '<div class="buypass">BUY PASS 950 C</div>' : '') +
      (!unlocked ? '<div class="lock">🔒</div>' : '');
    grid.appendChild(el);
  });
}

document.getElementById('btnBuyPass').addEventListener('click', () => {
  if (storage.passOwned) { showMsg('Pass already owned', '#cfd8ea'); return; }
  if (storage.coins < BATTLE_PASS_COST) { showMsg('Need 950 C', '#ff4757'); return; }
  storage.coins -= BATTLE_PASS_COST;
  storage.passOwned = true;
  saveStorage();
  renderLobby();
  renderBp();
  showMsg('Battle Pass acquired!', '#ffd166');
});

document.getElementById('btnShop').addEventListener('click', () => { showPanel('shop'); renderShop(); });
document.getElementById('closeShop').addEventListener('click', () => { showPanel('lobby'); });

document.getElementById('btnBp').addEventListener('click', () => { showPanel('battlepass'); renderBp(); });
document.getElementById('closeBp').addEventListener('click', () => { showPanel('lobby'); });

document.getElementById('btnQuests').addEventListener('click', () => { showPanel('questsPanel'); renderQuestsTab(); });
document.getElementById('closeQuests').addEventListener('click', () => { showPanel('lobby'); });

function renderQuestsTab() {
  const q = document.getElementById('questsShop'); q.innerHTML = '';
  storage.quests.forEach(qt => {
    const d = document.createElement('div');
    d.className = 'item ' + (qt.done ? 'locked' : '');
    d.innerHTML = '<div class="thumb">🎯</div><div class="name">' + qt.text + '</div><div class="price">' + (qt.done ? 'DONE' : qt.reward + ' C') + '</div>';
    q.appendChild(d);
  });
}

// Equip skin select (if present)
(function fillEquip() {
  const sel = document.getElementById('skinSelect');
  if (!sel) return;
  storage.ownedSkins.forEach(id => {
    const o = document.createElement('option');
    o.value = id;
    o.textContent = id.charAt(0).toUpperCase() + id.slice(1);
    sel.appendChild(o);
  });
  sel.addEventListener('change', () => { storage.equippedSkin = sel.value; saveStorage(); showMsg('Skin equipped', '#cfd8ea'); });
})();

// close menu buttons
document.getElementById('btnMenu').addEventListener('click', toggleMenu);

// ===========================================================================
// MAP PREVIEW (lobby)
// ===========================================================================

function drawMapPreview() {
  const cv = document.getElementById('mapCanvas');
  if (!cv) return;
  const cx = cv.getContext('2d');
  cx.fillStyle = '#07080c'; cx.fillRect(0, 0, cv.width, cv.height);
  const scale = 400 / WORLD;
  const off = 30;
  LOCATIONS.forEach(l => {
    const x = l.x * scale + off;
    const y = l.y * scale + off;
    const r = l.radius * scale;
    ctxSaveCircle(cx, x, y, r, l.color);
    cx.fillStyle = l.color; cx.font = 'bold 10px sans-serif'; cx.textAlign = 'center';
    cx.fillText(l.name, x, y - r - 4);
  });
}
function ctxSaveCircle(cx, x, y, r, color) {
  cx.fillStyle = color + '1a'; cx.beginPath(); cx.arc(x, y, r, 0, Math.PI * 2); cx.fill();
  cx.strokeStyle = color + '66'; cx.lineWidth = 1.5; cx.beginPath(); cx.arc(x, y, r, 0, Math.PI * 2); cx.stroke();
}

function showMsg(text, color) {
  const el = document.getElementById('msg');
  el.textContent = text;
  el.style.color = color || '#fff';
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 2200);
}

// ===========================================================================
// BOOT
// ===========================================================================

init();
