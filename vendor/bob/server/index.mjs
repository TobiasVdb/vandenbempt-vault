import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';
import { VERSION, MAX_PLAYERS, ROOM_PATTERN, callname, validPose, sanitizeWorldState, sanitizeVehicleState } from '../src/multiplayer/protocol.js';
import { FISH } from '../src/game/FishTable.js';

const forbid = socket => socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');

// One process owns each room. No database, accounts, or client-supplied player IDs.
// No HTTP server of its own: a host app routes its chosen upgrade path to handleUpgrade.
export function createCoopRooms({ origins = [], maxConnections = 256, maxPlayers = MAX_PLAYERS } = {}) {
	const rooms = new Map();
	const wss = new WebSocketServer({ noServer: true, maxPayload: 4096, perMessageDeflate: false });
	const handleUpgrade = (req, socket, head) => {
		if (wss.clients.size >= maxConnections || (origins.length && !origins.includes(req.headers.origin))) { forbid(socket); return; }
		wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws));
	};
	const send = (ws, data) => {
		if (ws.readyState === WebSocket.OPEN) {
			if (ws.bufferedAmount > 65536) { ws.terminate(); return; }
			ws.send(JSON.stringify(data));
		}
	};
	const snapshot = room => ( {
		type: 'snapshot',
		players: [ ...room.players.values() ].map( p => ( { id: p.id, name: p.name, avatar: p.avatar, pose: p.pose } ) ),
		tally: room.tally,
		...( room.world ? { world: room.world } : {} ),
		vehicles: Object.fromEntries( room.vehicles || [] ),
	} );
	const broadcast = (room, message) => { for (const p of room.players.values()) send(p.ws, message); };
	wss.on('connection', ws => {
		let player, room, tokens = 60, updated = Date.now();
		ws.alive = true;
		ws.on('pong', () => { ws.alive = true; });
		const joinTimeout = setTimeout(() => { if (!player) ws.close(1008, 'Join timeout'); }, 10000);
		ws.on('error', () => {});
		ws.on('message', (raw, binary) => {
			const now = Date.now(); tokens = Math.min(60, tokens + (now - updated) * 0.03); updated = now;
			if (--tokens < 0 || binary) { ws.close(1008, 'Invalid traffic'); return; }
			let m; try { m = JSON.parse(raw.toString()); } catch { ws.close(1008, 'Invalid JSON'); return; }
			if (!m || typeof m !== 'object') return;
			if (!player) {
				const name = callname(m.name);
				if (m.type !== 'join' || m.version !== VERSION || typeof m.room !== 'string' || !ROOM_PATTERN.test(m.room) || !name || !Number.isInteger(m.avatar) || m.avatar < 0 || m.avatar > 3) { send(ws, { type: 'error', message: 'Enter a valid room and callname.' }); ws.close(1008); return; }
				room = rooms.get(m.room);
				if (room?.players.size >= maxPlayers) { send(ws, { type: 'error', message: `This crew is full (${maxPlayers} players).` }); ws.close(1008); return; }
				if (!room) {
					room = { players: new Map(), tally: { count: 0, kg: 0 }, vehicles: new Map(), world: sanitizeWorldState(m.world) };
					rooms.set(m.room, room);
				}
				// Keep overhead names unambiguous within a room.
				let unique = name, suffix = 2;
				while ([...room.players.values()].some(p => p.name.toLowerCase() === unique.toLowerCase())) unique = name.slice(0, 16) + '-' + suffix++;
				player = { id: randomUUID(), name: unique, avatar: m.avatar, ws, room: m.room, pose: null, catchSequence: 0, lastCatch: 0 };
				room.players.set(player.id, player); clearTimeout(joinTimeout);
				send(ws, { type: 'welcome', id: player.id, name: unique, room: m.room });
				if (room.gate) send(ws, { type: 'gate', value: room.gate });
				broadcast(room, snapshot(room)); return;
			}
			if (m.type === 'pose' && validPose(m.pose)) {
				const p = m.pose;
				player.pose = { position: p.position, yaw: p.yaw, mode: p.mode, fishing: p.fishing,
					...(p.t !== undefined ? { t: p.t } : {}), ...(p.local ? { local: p.local } : {}),
					boat: p.boat ? { position: p.boat.position, rotation: p.boat.rotation, ...(p.boat.quat ? { quat: p.boat.quat } : {}), ...(p.boat.kind ? { kind: p.boat.kind } : {}) } : null };
			}
			// shared world state: the cavern's rock gate (0..1), relayed to the rest of the room and kept
			// for players who join later
			if (m.type === 'gate' && Number.isFinite(m.value) && m.value >= 0 && m.value <= 1) {
				room.gate = m.value;
				for (const p of room.players.values()) if (p !== player) send(p.ws, { type: 'gate', value: m.value });
			}
			if (m.type === 'world') {
				const world = sanitizeWorldState(m.world);
				if (world) {
					room.world = { ...(room.world || {}), ...world };
					broadcast(room, { type: 'world', world: room.world });
				}
			}
			if (m.type === 'vehicle') {
				const vehicle = sanitizeVehicleState(m.vehicle);
				if (vehicle) {
					room.vehicles.set(vehicle.id, vehicle);
					for (const p of room.players.values()) if (p !== player) send(p.ws, { type: 'vehicle', vehicle });
				}
			}
			if (m.type === 'catch' && Number.isSafeInteger(m.sequence) && m.sequence > player.catchSequence && Object.hasOwn(FISH, m.species) && Number.isFinite(m.kg) && m.kg >= FISH[m.species].kg[0] && m.kg <= FISH[m.species].kg[1] && now - player.lastCatch > 1000) {
				player.catchSequence = m.sequence; player.lastCatch = now;
				room.tally.count++; room.tally.kg += m.kg;
				broadcast(room, { type: 'catch', name: player.name, species: m.species, kg: m.kg });
			}
		});
		ws.on('close', () => {
			clearTimeout(joinTimeout);
			if (!player) return;
			room.players.delete(player.id);
			if (!room.players.size) rooms.delete(player.room); else broadcast(room, snapshot(room));
		});
	});
	// 20 Hz: clients interpolate between timestamped poses (PoseBuffer), so the rate sets latency, not smoothness
	const tick = setInterval(() => { for (const room of rooms.values()) broadcast(room, snapshot(room)); }, 50);
	const heartbeat = setInterval(() => {
		for (const ws of wss.clients) { if (!ws.alive) ws.terminate(); else { ws.alive = false; ws.ping(); } }
	}, 15000);
	return { rooms, handleUpgrade, close: async () => {
		clearInterval(tick); clearInterval(heartbeat);
		for (const ws of wss.clients) ws.terminate();
		await new Promise(r => wss.close(r));
	} };
}

// Standalone host: the built game, /coop and /health from one process.
export function createCoopServer({ root = resolve('dist'), origins = [], maxConnections = 256 } = {}) {
	const coop = createCoopRooms({ origins, maxConnections });
	const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.wasm': 'application/wasm', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.woff2': 'font/woff2' };
	const server = createServer(async (req, res) => {
		if (req.url === '/health') { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ ok: true, rooms: coop.rooms.size })); return; }
		if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
		try {
			const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
			const file = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
			if (!file.startsWith(root + sep) || !(await stat(file)).isFile()) throw new Error('Not found');
			res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' });
			res.end(req.method === 'HEAD' ? undefined : await readFile(file));
		} catch { res.writeHead(404); res.end('Not found'); }
	});
	server.on('upgrade', (req, socket, head) => { if (req.url === '/coop') coop.handleUpgrade(req, socket, head); else forbid(socket); });
	return { server, rooms: coop.rooms, close: async () => {
		await coop.close();
		await new Promise(r => server.close(r));
	} };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
	const app = createCoopServer({ origins: (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean) });
	app.server.listen(Number(process.env.PORT || 8787), process.env.HOST || '0.0.0.0', () => console.log('BOB co-op listening on', app.server.address()));
	for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => { await app.close(); process.exit(0); });
}
