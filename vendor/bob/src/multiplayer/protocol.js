export const VERSION = 1;
export const MAX_PLAYERS = 8;
export const ROOM_PATTERN = /^[A-Z0-9-]{3,32}$/;
// which boat a player is aboard ('lobster' or a fleet id such as 'cabin-28'); older clients omit it
export const BOAT_KIND = /^[a-z0-9@-]{1,48}$/;
export { sanitizeWorldState, sanitizeVehicleState } from './WorldState.js';
export function callname(value) {
	return typeof value === 'string' ? value.normalize('NFKC').replace(/[^\p{L}\p{N} _-]/gu, '').trim().slice(0, 20) : '';
}
const vector = (v, n, bound) => Array.isArray(v) && v.length === n && v.every(x => Number.isFinite(x) && Math.abs(x) <= bound);
export function validPose(p) {
	return p && vector(p.position, 3, 30000) && Number.isFinite(p.yaw) && Math.abs(p.yaw) < 10000
		&& ['walk', 'swim', 'deck', 'boat', 'passenger'].includes(p.mode) && typeof p.fishing === 'boolean'
		// optional: t (sender clock, s) for interpolation, local (position aboard, boat frame)
		&& (p.t === undefined || (Number.isFinite(p.t) && p.t >= 0 && p.t < 1e9))
		&& (p.local === undefined || vector(p.local, 3, 100))
		&& (!p.boat || (vector(p.boat.position, 3, 30000) && vector(p.boat.rotation, 3, 10000)
			&& (p.boat.quat === undefined || vector(p.boat.quat, 4, 1.01))
			&& (p.boat.kind === undefined || (typeof p.boat.kind === 'string' && BOAT_KIND.test(p.boat.kind)))));
}
