import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { callname } from '../src/multiplayer/protocol.js';
import { HIGHLIGHTS, PLANE_TYPES, BOAT_TYPES, vehicleType } from '../src/multiplayer/Usage.js';

const freshMs = 15000;
const count = n => Number.isFinite(n) && n >= 0 ? n : 0;
const blank = username => ({ username, onlineMs:0, flightMs:0, boatMs:0, planeMs:{}, boatTypeMs:{}, flightTypeMs:{}, highlights:[], sessions:0 });
export async function createUsageMetrics({ directory=process.env.USAGE_LOG_DIR || resolve('logs/usage'), now=Date.now }={}) {
	const file=join(directory,'users.json'), users=new Map(), sessions=new Map();
	try {
		const saved=JSON.parse(await readFile(file,'utf8'));
		for (const r of Array.isArray(saved.users) ? saved.users.slice(0,10000) : []) {
			const name=callname(r.username); if(!name)continue;
			const clean=blank(name);
			for(const k of ['onlineMs','flightMs','boatMs','sessions'])clean[k]=count(r[k]);
			for(const [key,types] of [['planeMs',PLANE_TYPES],['boatTypeMs',BOAT_TYPES],['flightTypeMs',PLANE_TYPES]])for(const t of types)if(count(r[key]?.[t]))clean[key][t]=count(r[key][t]);
			clean.highlights=HIGHLIGHTS.filter(h=>r.highlights?.includes(h)); users.set(name.toLowerCase(),clean);
		}
	} catch(e) { if(e.code!=='ENOENT')throw e; }
	let writing=Promise.resolve();
	function advance(s,t=now()) {
		const elapsed=Math.max(0,t-s.last), active=Math.max(0,Math.min(t,s.activityAt+freshMs)-s.last);
		s.last=t; const r=s.record; r.onlineMs+=elapsed;
		if(!s.vehicle)return;
		if(s.vehicle.kind==='boat'){r.boatMs+=active;r.boatTypeMs[s.vehicle.type]=(r.boatTypeMs[s.vehicle.type]||0)+active;}
		else {r.planeMs[s.vehicle.type]=(r.planeMs[s.vehicle.type]||0)+active;if(s.airborne){r.flightMs+=active;r.flightTypeMs[s.vehicle.type]=(r.flightTypeMs[s.vehicle.type]||0)+active;}}
	}
	const flush=()=>{
		for(const s of sessions.values())advance(s);
		const data=JSON.stringify({version:1,updatedAt:new Date(now()).toISOString(),users:[...users.values()]});
		const op=writing.then(async()=>{await mkdir(directory,{recursive:true});await writeFile(file+'.tmp',data,{mode:0o600});await rename(file+'.tmp',file);});
		writing=op.catch(()=>{});return op;
	};
	const timer=setInterval(()=>flush().catch(e=>console.error('Usage metrics storage failed:',e.message)),10000);timer.unref();
	return { file,
		join(id,username){const key=username.toLowerCase();let record=users.get(key);if(!record){if(users.size>=10000)return;record=blank(username);users.set(key,record);}record.sessions++;sessions.set(id,{record,last:now(),activityAt:-Infinity,vehicle:null,airborne:false});},
		update(id,{vehicle,airborne,highlight}){const s=sessions.get(id);if(!s)return;advance(s);s.activityAt=now();s.vehicle=vehicleType(vehicle);s.airborne=airborne===true;if(HIGHLIGHTS.includes(highlight)&&!s.record.highlights.includes(highlight))s.record.highlights.push(highlight);},
		leave(id){const s=sessions.get(id);if(s){advance(s);sessions.delete(id);}},
		get(username){for(const s of sessions.values())advance(s);const r=users.get(username.toLowerCase());return r?structuredClone({...r,highlightCount:r.highlights.length}):null;},
		summary(){
			for(const s of sessions.values())advance(s);
			const totals={online_users:sessions.size,tracked_profiles:users.size,tracked_sessions_total:0,online_time_ms_total:0,flight_time_ms_total:0,boat_time_ms_total:0,highlights_total:0};
			for(const r of users.values()){totals.tracked_sessions_total+=r.sessions;totals.online_time_ms_total+=r.onlineMs;totals.flight_time_ms_total+=r.flightMs;totals.boat_time_ms_total+=r.boatMs;totals.highlights_total+=r.highlights.length;}
			return totals;
		},
		flush,
		async close(){clearInterval(timer);for(const id of sessions.keys())this.leave(id);await flush();},
	};
}
