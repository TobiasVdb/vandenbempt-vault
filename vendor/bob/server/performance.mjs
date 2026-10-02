import { appendFile, mkdir, readFile, rename, stat } from 'node:fs/promises';
import { resolve, join } from 'node:path';

const MAX_BODY=24576;
const number=(v,max=1e9)=>Number.isFinite(v)&&v>=0&&v<=max;
const text=(v,max=80)=>typeof v==='string'&&v.length<=max&&!/[\u0000-\u001f]/.test(v);
const stages=v=>Array.isArray(v)?v.slice(0,32).filter(s=>s&&text(s.name)&&number(s.ms,3600000)).map(s=>({name:s.name,ms:s.ms})):[];
const renderStats=v=>Object.fromEntries(['draws','triangles','pipelines'].filter(k=>number(v?.[k])).map(k=>[k,v[k]]));
const pipelineStats=v=>Object.fromEntries(['requested','syncCompiles','syncMs','pending'].filter(k=>number(v?.[k],3600000)).map(k=>[k,v[k]]));
const renderPasses=v=>Array.isArray(v)?v.slice(0,32).filter(p=>p&&text(p.name)&&number(p.ms,3600000)&&number(p.collectMs,3600000)&&number(p.draws)&&number(p.triangles)).map(p=>({name:p.name,ms:p.ms,collectMs:p.collectMs,draws:p.draws,triangles:p.triangles})):[];
function frameDiagnostics(v){
	if(!v||!number(v.cpuMs,3600000)||!text(v.phase))return undefined;
	return {cpuMs:v.cpuMs,phase:v.phase,cpuStages:stages(v.cpuStages),renderStats:renderStats(v.renderStats),pipelines:pipelineStats(v.pipelines),renderPasses:renderPasses(v.renderPasses)};
}
export function validPerformanceReport(r){
	if(!r||typeof r!=='object'||!text(r.id,36)||!text(r.capturedAt,40)||!Number.isFinite(Date.parse(r.capturedAt)))return false;
	if(!['low-fps','frame-stall'].includes(r.reason)||!number(r.fps,1000)||!number(r.worstFrameMs,3600000)||!number(r.cpuMs,3600000))return false;
	if(!Array.isArray(r.position)||r.position.length!==3||!r.position.every(n=>Number.isFinite(n)&&Math.abs(n)<1e6))return false;
	if(!Array.isArray(r.cpuStages)||r.cpuStages.length>32||!r.cpuStages.every(s=>s&&text(s.name)&&number(s.ms,3600000)))return false;
	return ['draws','triangles'].every(k=>number(r.renderStats?.[k]))&&number(r.activeLights,100000);
}
// POST-only handler can also be mounted by an embedding host under its game subpath.
export function createPerformanceApi({ directory=process.env.PERFORMANCE_LOG_DIR||resolve('logs/performance'), origins=[], maxBytes=10*1024*1024 }={}){
	const file=join(directory,'reports.ndjson'), seen=new Set(), limits=new Map();
	let writes=readPerformanceReports(directory,2048).then(reports=>{for(const r of reports)seen.add(r.id);});
	const append=report=>{
		const operation=writes.then(async()=>{
			if(seen.has(report.id))return;
			await mkdir(directory,{recursive:true});
			const line=JSON.stringify({...report,receivedAt:new Date().toISOString()})+'\n';
			let size=0;try{size=(await stat(file)).size;}catch(e){if(e.code!=='ENOENT')throw e;}
			if(size&&size+Buffer.byteLength(line)>maxBytes)await rename(file,file+'.1');
			await appendFile(file,line,{encoding:'utf8',mode:0o600});seen.add(report.id);
			if(seen.size>2048)seen.delete(seen.values().next().value);
		});
		writes=operation.catch(()=>{});return operation;
	};
	return {file, async handle(req,res){
		const reply=(status,message)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({message}));};
		if(req.method!=='POST'){reply(405,'POST required');return;}
		if(req.headers.origin){
			let allowed=origins.includes(req.headers.origin);
			try{const origin=new URL(req.headers.origin);allowed ||= origin.host===req.headers.host || (['localhost','127.0.0.1','[::1]'].includes(origin.hostname)&&['localhost','127.0.0.1','[::1]'].includes(new URL('http://'+req.headers.host).hostname));}catch{}
			if(!allowed){reply(403,'Origin rejected');return;}
		}
		const key=req.socket.remoteAddress,now=Date.now();
		let limit=limits.get(key);if(!limit||now-limit.start>=60000){limit={start:now,count:0};limits.set(key,limit);}
		if(limits.size>512)limits.delete(limits.keys().next().value);
		if(++limit.count>30){reply(429,'Report rate exceeded');return;}
		if(!req.headers['content-type']?.startsWith('application/json')){reply(415,'JSON required');return;}
		if(Number(req.headers['content-length'])>MAX_BODY){reply(413,'Report too large');return;}
		try{
			let bytes=0;const chunks=[];
			for await(const chunk of req){bytes+=chunk.length;if(bytes>MAX_BODY){reply(413,'Report too large');return;}chunks.push(chunk);}
			const r=JSON.parse(Buffer.concat(chunks).toString('utf8'));
			if(!validPerformanceReport(r)){reply(400,'Invalid performance report');return;}
			// Whitelist diagnostic fields; never persist request headers, player names or arbitrary payloads.
			const report={id:r.id,capturedAt:r.capturedAt,reason:r.reason,fps:r.fps,worstFrameMs:r.worstFrameMs,cpuMs:r.cpuMs,position:r.position,cpuStages:r.cpuStages.map(s=>({name:s.name,ms:s.ms})),renderStats:Object.fromEntries(Object.entries(r.renderStats).filter(([k,v])=>['draws','triangles','pipelines'].includes(k)&&number(v))),activeLights:r.activeLights,gpu:null};
			for(const k of ['location','version','sessionId','mode','cameraMode','vehicle','aaMode'])if(text(r[k]))report[k]=r[k];
			for(const k of ['renderScale','speed','timeOfDay','viewportWidth','viewportHeight'])if(number(r[k]))report[k]=r[k];
			for(const k of ['build','phase','gpuStatus'])if(text(r[k]))report[k]=r[k];
			for(const k of ['windowFrames','windowMs','frameIntervalMs'])if(number(r[k]))report[k]=r[k];
			for(const k of ['currentFrame','previousFrame']){const frame=frameDiagnostics(r[k]);if(frame)report[k]=frame;}
			if(r.pipelines)report.pipelines=pipelineStats(r.pipelines);
			if(r.renderPasses)report.renderPasses=renderPasses(r.renderPasses);
			if(r.gpu&&typeof r.gpu==='object'&&Array.isArray(r.gpu.items))report.gpu={compute:number(r.gpu.compute)?r.gpu.compute:null,render:number(r.gpu.render)?r.gpu.render:null,items:r.gpu.items.slice(0,128).filter(s=>s&&text(s.name)&&number(s.ms)).map(s=>({name:s.name,ms:s.ms}))};
			await append(report);reply(201,'Stored');
		}catch(e){if(e instanceof SyntaxError){reply(400,'Invalid JSON');return;}console.error('Performance report storage failed:',e.message);reply(503,'Storage unavailable');}
	},close:()=>writes};
}

export async function readPerformanceReports(directory=process.env.PERFORMANCE_LOG_DIR||resolve('logs/performance'),limit=20){
	const reports=[];
	for(const name of ['reports.ndjson.1','reports.ndjson']){
		let contents;try{contents=await readFile(join(directory,name),'utf8');}catch(e){if(e.code==='ENOENT')continue;throw e;}
		for(const line of contents.split('\n'))if(line.trim()){try{reports.push(JSON.parse(line));}catch{/* Ignore an incomplete final write after a process crash. */}}
	}
	return reports.slice(-limit);
}
