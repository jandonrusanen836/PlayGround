import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { WebSocket, WebSocketServer } from 'ws';

const PORT = Number(process.env.PORT) || 3001;
const MIN_MATCH_PLAYERS = Math.max(2, Number(process.env.MIN_MATCH_PLAYERS) || 2);
const MAX_MATCH_PLAYERS = 10;
const QUEUE_GRACE_MS = Math.max(0, Number(process.env.QUEUE_GRACE_MS) || 15_000);
const queue = [];
const matches = new Map();
const peers = new Map();

const httpServer = createServer((request, response) => {
  if (request.url === '/health' || request.url === '/api/status') {
    const body = JSON.stringify({
      ok: true,
      service: 'frontline-match-server',
      queuedPlayers: queue.length,
      activeMatches: matches.size,
      minMatchPlayers: MIN_MATCH_PLAYERS,
      maxMatchPlayers: MAX_MATCH_PLAYERS,
    });
    response.writeHead(200, {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'access-control-allow-origin': '*',
    });
    response.end(body);
    return;
  }

  response.writeHead(404, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify({ error: 'not_found' }));
});

const wss = new WebSocketServer({ server: httpServer, maxPayload: 4096 });

function send(peer, type, data = {}) {
  if (peer.readyState === WebSocket.OPEN) {
    peer.send(JSON.stringify({ type, ...data }));
  }
}

function broadcastQueue() {
  const status = { queuedPlayers: queue.length, maxPlayers: MAX_MATCH_PLAYERS };
  for (const peer of peers.keys()) send(peer, 'queue.count', status);
}

function removeFromQueue(peer) {
  const index = queue.findIndex((entry) => entry.peer === peer);
  if (index !== -1) queue.splice(index, 1);
  if (peer.queueTimer) clearTimeout(peer.queueTimer);
  peer.queueTimer = null;
  peer.queuedAt = null;
  broadcastQueue();
}

function makeMatch() {
  if (queue.length < MIN_MATCH_PLAYERS) return;
  const size = Math.min(MAX_MATCH_PLAYERS, queue.length);
  const entrants = queue.splice(0, size);
  const matchId = randomUUID();
  const players = entrants.map(({ peer, name }, index) => ({
    id: peer.playerId,
    name,
    team: index % 2 === 0 ? 'blue' : 'red',
  }));
  const match = {
    id: matchId,
    mode: 'ctf',
    map: 'iron-yard',
    scoreLimit: 12,
    scores: { blue: 0, red: 0 },
    players,
    createdAt: Date.now(),
  };
  matches.set(matchId, match);

  entrants.forEach(({ peer }) => {
    if (peer.queueTimer) clearTimeout(peer.queueTimer);
    peer.queueTimer = null;
    peer.queuedAt = null;
    peer.matchId = matchId;
    send(peer, 'match.found', {
      match: {
        id: match.id,
        mode: match.mode,
        map: match.map,
        scoreLimit: match.scoreLimit,
        team: players.find((player) => player.id === peer.playerId).team,
        players,
        scores: match.scores,
      },
    });
  });
  broadcastQueue();
  console.log(`Match ${matchId} created with ${players.length} player(s).`);
}

function joinQueue(peer, payload) {
  if (peer.matchId) {
    send(peer, 'error', { code: 'already_in_match', message: 'Leave your current match first.' });
    return;
  }
  if (peer.queuedAt) {
    send(peer, 'queue.joined', { position: queue.findIndex((entry) => entry.peer === peer) + 1 });
    return;
  }

  const requestedMode = payload.mode;
  if (requestedMode !== 'ctf') {
    send(peer, 'error', { code: 'unsupported_mode', message: 'Only CTF matchmaking is available.' });
    return;
  }
  const rawName = typeof payload.name === 'string' ? payload.name : 'ROOKIE';
  const name = rawName.replace(/[<>\u0000-\u001f]/g, '').trim().slice(0, 20) || 'ROOKIE';
  peer.playerId = peer.playerId || randomUUID();
  peer.queuedAt = Date.now();
  queue.push({ peer, name });
  send(peer, 'queue.joined', {
    position: queue.length,
    minPlayers: MIN_MATCH_PLAYERS,
    maxPlayers: MAX_MATCH_PLAYERS,
  });
  broadcastQueue();

  if (queue.length >= MAX_MATCH_PLAYERS) {
    makeMatch();
    return;
  }
  peer.queueTimer = setTimeout(makeMatch, QUEUE_GRACE_MS);
}

function leaveMatch(peer) {
  const match = matches.get(peer.matchId);
  if (!match) {
    peer.matchId = null;
    return;
  }
  match.players = match.players.filter((player) => player.id !== peer.playerId);
  for (const other of peers.keys()) {
    if (other.matchId === match.id) {
      send(other, 'match.player-left', { playerId: peer.playerId });
    }
  }
  peer.matchId = null;
  if (match.players.length === 0) matches.delete(match.id);
}

wss.on('connection', (peer) => {
  peers.set(peer, { connectedAt: Date.now() });
  peer.playerId = randomUUID();
  send(peer, 'connected', { playerId: peer.playerId, protocol: 1 });
  broadcastQueue();

  peer.on('message', (raw) => {
    let payload;
    try {
      payload = JSON.parse(raw.toString());
    } catch {
      send(peer, 'error', { code: 'invalid_json', message: 'Messages must be JSON.' });
      return;
    }
    if (!payload || typeof payload.type !== 'string') {
      send(peer, 'error', { code: 'invalid_message', message: 'A message type is required.' });
      return;
    }

    switch (payload.type) {
      case 'queue.join':
        joinQueue(peer, payload);
        break;
      case 'queue.cancel':
        if (peer.matchId) {
          send(peer, 'error', { code: 'already_in_match', message: 'Leave your current match first.' });
          break;
        }
        removeFromQueue(peer);
        send(peer, 'queue.cancelled');
        break;
      case 'match.leave':
        leaveMatch(peer);
        send(peer, 'match.left');
        break;
      case 'ping':
        send(peer, 'pong', { at: Date.now() });
        break;
      default:
        send(peer, 'error', { code: 'unknown_message', message: 'Unsupported message type.' });
    }
  });

  peer.on('close', () => {
    removeFromQueue(peer);
    leaveMatch(peer);
    peers.delete(peer);
    broadcastQueue();
  });
});

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`FRONTLINE Node.js match server listening on :${PORT}`);
  console.log(`CTF matchmaking: ${MIN_MATCH_PLAYERS}-${MAX_MATCH_PLAYERS} players; ${QUEUE_GRACE_MS}ms queue grace.`);
});
