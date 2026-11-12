/**
 * Fortnite Chapter 4 S1 — WebSocket relay server (online multiplayer)
 * Runs alongside the static file server on port 3001.
 * Authoritative-lite: relays player state, validates shooting/hitscan against
 * last-known positions, broadcasts damage/eliminations/build events.
 */
const WebSocket = require('ws');
const http = require('http');

const PORT = Number(process.env.WSS_PORT || 3001);

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Fortnite WSS relay running');
});
server.listen(PORT, () => console.log(`[WSS] relay listening on :${PORT}`));

const wss = new WebSocket.Server({ server });

// Config
const MAP_HALF = 2300;
const PLAYER_RADIUS = 14;
// Keep these simplified per-shot values aligned with the browser's WEAPONS table.
// Shotgun damage is the maximum total damage across its spread pellets.
const WEAPON_STATS = {
  ar:       { range:1000, damage:30 },
  smg:      { range:600, damage:16 },
  maven:    { range:320, damage:10 },
  thunder:  { range:300, damage:12 },
  excaliber:{ range:1200, damage:90 },
  pistol:   { range:650, damage:25 },
  hammer:   { range:280, damage:75 },
};

const players = new Map(); // id -> playerState
const builds = [];         // {id,type,x,y,z,rot,hp,ownerId}
let nextBuildId = 1;
let nextId = 1;

function randId(){ return 'p' + (nextId++).toString(36) + Date.now().toString(36).slice(-4); }

function newPlayer(id, name){
  const angle = Math.random()*Math.PI*2, r = 900 + Math.random()*1600;
  return {
    id, name,
    x: Math.cos(angle)*r, y: 60, z: Math.sin(angle)*r,
    yaw: Math.random()*Math.PI*2, cameraYaw: 0, cameraPitch: -0.25,
    hp: 100, shield: 0, maxHp: 100, maxShield: 100,
    equipped: 'ar', weaponAmmo: 30, alive: true, eliminatedBy: null,
    updated: Date.now(),
  };
}

function clamp(v,a,b){ return v<a?a:v>b?b:v; }
function finiteOr(value, fallback){ const n=Number(value); return Number.isFinite(n)?n:fallback; }
function dist2(a,b){ const dx=a.x-b.x, dz=a.z-b.z; return dx*dx+dz*dz; }

function broadcast(obj){
  const data = JSON.stringify(obj);
  wss.clients.forEach(c => { if (c.readyState === WebSocket.OPEN) c.send(data); });
}

function snapshot(){
  return { type: 'state', players: Array.from(players.values()).map(p => ({
    id:p.id,name:p.name,x:p.x,y:p.y,z:p.z,yaw:p.yaw,cameraYaw:p.cameraYaw,cameraPitch:p.cameraPitch,
    hp:p.hp,shield:p.shield,equipped:p.equipped,weaponAmmo:p.weaponAmmo,alive:p.alive,
    eliminatedBy:p.eliminatedBy,
  })) };
}

// ---- Hitscan (server authoritative) ----
function hitscan(shooter, origin, dir, weapon){
  const stats = WEAPON_STATS[weapon];
  if (!stats) return { hit:false, target:null, dmg:0 };
  const { range, damage:dmg } = stats;
  let best = null, bestD = range*range;
  // ray-box vs each other player (simple capsule approximated by box + radius)
  const end = { x: origin.x + dir.x*range, y: origin.y + dir.y*range, z: origin.z + dir.z*range };
  for (const [id, p] of players){
    if (!p.alive || id === shooter.id) continue;
    // closest point on segment to player center
    const ax = origin.x, ay = origin.y, az = origin.z;
    const bx = end.x, by = end.y, bz = end.z;
    const px = p.x, py = p.y, pz = p.z;
    const abx = bx-ax, aby = by-ay, abz = bz-az;
    const apx = px-ax, apy = py-ay, apz = pz-az;
    const abab = abx*abx + aby*aby + abz*abz;
    let t = abx*apx + aby*apy + abz*apz;
    if (abab > 0) t /= abab;
    t = clamp(t, 0, 1);
    const cx = ax + abx*t, cy = ay + aby*t, cz = az + abz*t;
    const d2 = (cx-px)**2 + (cy-py)**2 + (cz-pz)**2;
    if (d2 < bestD && d2 < (PLAYER_RADIUS+10)**2){
      bestD = d2; best = p;
    }
  }
  return { hit: !!best, target: best, dmg };
}

function applyDamage(targetId, dmg, shooterId){
  const target = players.get(targetId);
  if (!target || !target.alive) return false;
  let remaining = Math.max(0, dmg);
  const shieldDamage = Math.min(target.shield, remaining);
  target.shield -= shieldDamage;
  remaining -= shieldDamage;
  target.hp = clamp(target.hp - remaining, 0, target.maxHp);
  if (target.hp <= 0){
    target.alive = false; target.eliminatedBy = shooterId;
    broadcast({ type: 'eliminate', targetId, shooterId, hp:target.hp, shield:target.shield });
  } else {
    broadcast({ type: 'damage', targetId, dmg, shooterId, hp:target.hp, shield:target.shield });
  }
  return true;
}

wss.on('connection', (ws, req) => {
  const ip = req.socket.remoteAddress;
  let myId = null;
  console.log(`[WSS] connect ${ip}`);

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    const t = msg.type;

    if (t === 'join'){
      myId = randId();
      const name = (msg.name && String(msg.name).slice(0, 16)) || 'Player';
      const p = newPlayer(myId, name);
      players.set(myId, p);
      ws.send(JSON.stringify({ type: 'joined', id: myId, players: Array.from(players.values()) }));
      broadcast({ type: 'playerJoin', player: p });
      broadcast(snapshot());
      console.log(`[WSS] ${name} joined as ${myId}`);
      return;
    }
    if (!myId) return; // not joined yet

    const p = players.get(myId);
    if (!p) return;

    if (t === 'state'){
      // update my transform/status from client (client sends, server relays)
      const now = Date.now();
      p.x = clamp(finiteOr(msg.x,p.x), -MAP_HALF+60, MAP_HALF-60);
      p.y = clamp(finiteOr(msg.y,p.y), 0, 3000);
      p.z = clamp(finiteOr(msg.z,p.z), -MAP_HALF+60, MAP_HALF-60);
      p.yaw = finiteOr(msg.yaw,p.yaw);
      p.cameraYaw = finiteOr(msg.cameraYaw,p.cameraYaw);
      p.cameraPitch = clamp(finiteOr(msg.cameraPitch,p.cameraPitch), -1.1, 0.5);
      p.hp = clamp(finiteOr(msg.hp,p.hp), 0, 100);
      p.shield = clamp(finiteOr(msg.shield,p.shield), 0, 100);
      if (WEAPON_STATS[msg.equipped]) p.equipped = msg.equipped;
      p.weaponAmmo = clamp(finiteOr(msg.weaponAmmo,p.weaponAmmo), 0, 1000);
      p.alive = msg.alive !== false;
      p.updated = now;
    }

    if (t === 'shoot' && p.alive){
      const weapon = p.equipped;
      if (!WEAPON_STATS[weapon]) return;
      const fireRate = weapon==='ar'?180:weapon==='smg'?105:weapon==='maven'?95:weapon==='thunder'?75:weapon==='excaliber'?70:weapon==='pistol'?110:80;
      const fireGap = 60000/fireRate;
      const now=Date.now();
      if (p.weaponAmmo<=0 || now-(p.lastShot||0)<fireGap) return;
      p.lastShot=now;
      p.weaponAmmo--;
      const origin = {
        x: finiteOr(msg.originX,p.x),
        y: finiteOr(msg.originY,p.y+45),
        z: finiteOr(msg.originZ,p.z),
      };
      const dir = {
        x: finiteOr(msg.dirX,0),
        y: finiteOr(msg.dirY,0),
        z: finiteOr(msg.dirZ,1),
      };
      const length = Math.hypot(dir.x,dir.y,dir.z);
      if (!Number.isFinite(length) || length < 1e-6) return;
      dir.x/=length; dir.y/=length; dir.z/=length;
      const res = hitscan(p, origin, dir, weapon);
      // broadcast tracer so others see it
      broadcast({ type: 'shoot', shooterId: myId, originX: origin.x, originY: origin.y, originZ: origin.z,
        dirX: dir.x, dirY: dir.y, dirZ: dir.z, weapon });
      if (res.hit){
        applyDamage(res.target.id, res.dmg, myId);
      }
      // local ammo handled by client; server trusts weaponAmmo from state
    }

    if (t === 'build' && p.alive){
      const shape = ['wall','floor','ramp','roof'].includes(msg.shape) ? msg.shape : 'wall';
      const x = finiteOr(msg.x,NaN), y = finiteOr(msg.y,NaN), z = finiteOr(msg.z,NaN);
      if (![x,y,z].every(Number.isFinite)) return;
      const b = { id: msg.clientId || ('b' + (nextBuildId++)), type: shape,
        x: clamp(x,-MAP_HALF+60,MAP_HALF-60), y: clamp(y,0,3000), z: clamp(z,-MAP_HALF+60,MAP_HALF-60),
        rot: finiteOr(msg.rot,0), hp: 100, ownerId: myId };
      builds.push(b);
      broadcast({ type: 'build', build: b, clientId: msg.clientId || null });
    }

    if (t === 'breakBuild'){
      const idx = builds.findIndex(b => b.id === msg.buildId);
      if (idx >= 0){
        builds.splice(idx, 1);
        broadcast({ type: 'breakBuild', buildId: msg.buildId });
      }
    }
  });

  ws.on('close', () => {
    if (myId){
      players.delete(myId);
      broadcast({ type: 'playerLeave', id: myId });
      broadcast(snapshot());
      console.log(`[WSS] ${myId} disconnected`);
    }
  });
  ws.on('error', () => {});
});

// Periodic full-state broadcast + storm
setInterval(() => {
  if (players.size === 0) return;
  broadcast(snapshot());
}, 50);

console.log(`[WSS] relay ready on ws://localhost:${PORT}`);
