# FRONTLINE Node.js server

This service is the first online-services slice for the browser game: a WebSocket matchmaking queue and match/session announcements for CTF. It is plain JavaScript on Node.js and can run locally or as a containerized game-server process.

## Run locally

```sh
cd server
npm install
npm start
```

The server listens on `0.0.0.0:3001` by default. Check `http://localhost:3001/health` for health and queue information.

## Configuration

| Variable | Default | Description |
| --- | ---: | --- |
| `PORT` | `3001` | HTTP and WebSocket port |
| `MIN_MATCH_PLAYERS` | `2` | Minimum players before a match can be formed (never below 2) |
| `QUEUE_GRACE_MS` | `15000` | Time to gather players before starting a partial match |

Matches have a maximum of 10 players, split across blue and red teams. The match announcement includes the CTF mode, map, score limit of 12, team assignment, roster, and initial scores.

## WebSocket protocol

Connect to `ws://localhost:3001` (use `wss://` behind TLS in production). Messages are JSON.

Client messages:

```json
{ "type": "queue.join", "mode": "ctf", "name": "ROOKIE" }
{ "type": "queue.cancel" }
{ "type": "match.leave" }
{ "type": "ping" }
```

Server events include `connected`, `queue.count`, `queue.joined`, `queue.cancelled`, `match.found`, `match.player-left`, `match.left`, `pong`, and `error`.

## Current scope

This is matchmaking/session infrastructure, not yet an authoritative combat simulation. The browser still needs the CTF scene, movement/shooting replication, server-validated captures, reconnect handling, and match-end results wired to this protocol before online matches can be played. Do not treat client-reported kills, scores, or captures as trusted server data.
