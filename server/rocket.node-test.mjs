import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import {createFlightPrediction} from '../vendor/rocket/game/flight-prediction.js'
import path from 'node:path'
import {readFile} from 'node:fs/promises'
import {createLocalStore} from '../vendor/rocket/server/rocket-store.mjs'
import {createRocketService} from '../vendor/rocket/server/rocket-service.mjs'
import {createCrashReplay} from '../vendor/rocket/game/crash-replay.js'
import {breakLandingLeg} from '../vendor/rocket/game/damage.js'
import {createPlumePool} from '../vendor/rocket/game/plume.js'
import express from 'express'
import { createRocketHttp } from '../vendor/rocket/server/rocket-http.mjs'
import { BASE_GRAVITY, BASE_THRUST, LANDING_LIMITS } from '../vendor/rocket/game/flight-balance.js';
import { PLAYABLE_LEVELS } from '../vendor/rocket/game/levels.js';
import { createFlight, stepFlight, FIXED_STEP, DEFAULT_HULL, environmentAt, checkTerrainCollision } from '../vendor/rocket/game/physics.js';
import { newProfile, flightTuning, sanitizeProfile } from '../vendor/rocket/game/progression.js';
import { POD_TUNING } from '../vendor/rocket/game/pod.js';
import { createPilot, pilotInput } from '../vendor/rocket/game/pilots.js';

test('Rocket owns its prefix, redirects only the bare path and leaves other host routes intact', async (t) => {
  const app = express()
  const handle = createRocketHttp({ root: path.resolve('vendor/rocket'), getService: () => null })
  app.get(/^\/rocket$/, (_request, response) => response.redirect(302, '/rocket/'))
  app.use('/rocket', (request, response) => { void handle(request, response) })
  app.get('/api/health', (_request, response) => response.json({ ok: true }))
  app.get('/bob/', (_request, response) => response.send('Existing BOB mount'))
  app.get('*', (_request, response) => response.send('Existing host SPA'))
  const server = http.createServer(app)
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  t.after(() => { server.closeAllConnections(); server.close() })
  const url = `http://127.0.0.1:${server.address().port}`
  const redirect = await fetch(url + '/rocket', { redirect: 'manual' })
  assert.equal(redirect.status, 302)
  assert.equal(redirect.headers.get('location'), '/rocket/')
  const game = await fetch(url + '/rocket/')
  assert.equal(game.status, 200)
  assert.match(await game.text(), /<base href="\.\/game\/">/)
  assert.equal((await fetch(url + '/rocket/game/online.js')).status, 200)
  assert.equal((await fetch(url + '/rocket/vendor/three/examples/jsm/utils/SkeletonUtils.js')).status, 200)
  assert.equal((await fetch(url + '/rocket/api/health')).status, 503)
  assert.equal((await fetch(url + '/rocket/missing.js')).status, 404)
  assert.equal((await fetch(url + '/rocket/server/ship-hulls.json')).status, 404)
  assert.match(await (await fetch(url + '/rocket/hangar/')).text(), /<base href="\.\.\/">/)
  assert.match(await (await fetch(url + '/bob/')).text(), /Existing BOB mount/)
  assert.deepEqual(await (await fetch(url + '/api/health')).json(), { ok: true })
  assert.match(await (await fetch(url + '/')).text(), /Existing host SPA/)
  assert.match(await (await fetch(url + '/rockets')).text(), /Existing host SPA/)
})


const amber=PLAYABLE_LEVELS.find(level=>level.id==='amber');
function tuning(engine,frame){const profile=newProfile();Object.assign(profile.upgrades,{engine,frame});return flightTuning(profile);}
function airborne(level,loadout){return Object.assign(createFlight(level,DEFAULT_HULL,loadout),{status:'flying',x:0,y:100,vx:4,vy:0});}
function step(state,level,seconds,input={}){for(let i=0;i<Math.round(seconds/FIXED_STEP);i++)stepFlight(state,input,level,DEFAULT_HULL,FIXED_STEP,[]);}

test('baseline matches native gravity and thrust with bounded upgrade authority',()=>{
  assert.equal(amber.gravity,9.8);assert.equal(tuning(0,0).thrust,1000/60);
  assert.ok(Math.abs(BASE_THRUST/BASE_GRAVITY-1.7)<.001);
  assert.ok(tuning(3,3).thrust/BASE_GRAVITY<2.35);
});

test('vertical flight follows a ballistic arc with continuous velocity at the apex',()=>{
  const vacuum={...amber,verticalDrag:0,floor:[],roof:[],pads:[],spawn:{x:0,y:100}};
  const state=airborne(vacuum,tuning(0,0));state.vy=9.8;
  step(state,vacuum,1);
  assert.ok(Math.abs(state.vy)<1e-10,'One second of gravity cancels 9.8 m/s upward velocity.');
  assert.ok(Math.abs(state.y-104.9)<.05);
  step(state,vacuum,1);
  assert.ok(Math.abs(state.vy+9.8)<1e-10);
  assert.ok(Math.abs(state.y-100)<.1,'The arc returns to launch height without artificial vertical braking.');
});

test('all engine/frame tiers have identical engine-off vertical trajectories and stronger lateral braking',()=>{
  const reference=airborne(amber,tuning(0,0));step(reference,amber,2);
  for(let engine=0;engine<=3;engine++)for(let frame=0;frame<=3;frame++){
    const state=airborne(amber,tuning(engine,frame));step(state,amber,2);
    assert.equal(state.vy,reference.vy);assert.equal(state.y,reference.y);
    if(engine||frame)assert.ok(state.vx<reference.vx);
  }
  const terminal=airborne(amber,tuning(3,3));step(terminal,amber,10);
  assert.ok(-terminal.vy>LANDING_LIMITS.vertical*2,'Unpowered descent must still require landing control.');
});

test('soft contact lands; excessive contact speed breaks the legs before hull destruction',()=>{
  const pad=amber.pads[1];
  for(const [key,limit]of [['vy',LANDING_LIMITS.vertical],['vx',LANDING_LIMITS.horizontal]]){
    for(const safe of [true,false]){
      const state=createFlight(amber),value=limit*(safe?.98:1.02);
      // Target contact speed, allowing for gravity during the final physics tick.
      Object.assign(state,{status:'flying',x:pad.x,angle:key==='angle'?value:0,vx:key==='vx'?value:0,vy:key==='vy'?-value+BASE_GRAVITY*FIXED_STEP:-1});
      const bottom=Math.min(...DEFAULT_HULL.map(([x,y])=>x*Math.sin(state.angle)+y*Math.cos(state.angle)));
      state.y=pad.y-bottom+.0001;
      stepFlight(state,{},amber,DEFAULT_HULL,FIXED_STEP,[]);
      if(safe)assert.equal(state.status,'landed',`${key} ${value}`);
      else{assert.equal(state.status,'flying');assert.ok(state.damage.legLeft===0||state.damage.legRight===0);step(state,amber,.5);assert.equal(state.status,'crashed');}
    }
  }
});

test('every playable landing mission remains completable across all engine/frame tier pairs',()=>{
  for(const level of PLAYABLE_LEVELS.filter(level=>level.objective==='land')){
    for(let engine=0;engine<=3;engine++)for(let frame=0;frame<=3;frame++){
      const state=createFlight(level,DEFAULT_HULL,tuning(engine,frame)),pilot=createPilot();state.hull=DEFAULT_HULL;
      for(let i=0;i<130/FIXED_STEP&&['ready','flying'].includes(state.status);i++){
        stepFlight(state,pilotInput(pilot,state,level,i*FIXED_STEP),level,DEFAULT_HULL);
      }
      assert.equal(state.status,'landed',`${level.id}, engine ${engine}, frame ${frame}: ${state.reason}`);
      assert.ok(state.fuel>0);
    }
  }
});

test('Driftfield preserves zero gravity, momentum and fixed pod power at every upgrade tier',()=>{
  const level=PLAYABLE_LEVELS.find(level=>level.id==='drift');
  for(let engine=0;engine<=3;engine++)for(let frame=0;frame<=3;frame++){
    const state=airborne(level,tuning(engine,frame));state.vx=.2;state.vy=.1;
    assert.equal(environmentAt(state,level).gravity,0);assert.deepEqual(state.tuning,POD_TUNING);
    step(state,level,2);assert.equal(state.vy,.1);assert.equal(state.vx,.2);
    const burn=airborne(level,tuning(engine,frame));burn.vx=0;step(burn,level,1,{translateX:1});
    assert.ok(Math.abs(burn.vx-.32)<1e-12);
  }
});

test('rebalance retains purchased upgrade tiers and profile balances',()=>{
  const profile=newProfile();profile.coins=123;Object.assign(profile.upgrades,{engine:3,frame:3});
  assert.deepEqual(sanitizeProfile(profile),profile);
});

const mission={...amber,floor:[],roof:[],pads:[],spawn:{x:0,y:0}};
test('ballistic ascent and descent retain continuous acceleration through jittered snapshots',()=>{
  const level={...mission,verticalDrag:0,spawn:{x:0,y:1000}};
  for(const fps of [60,90,144]){
    const server={...createFlight(level),status:'flying',vy:9.8};
    const prediction=createFlightPrediction(),packets=[];let tick=0,previous=server.y,previousSpeed=null,maxAcceleration=0;
    prediction.receive(server,0,0,level,DEFAULT_HULL,0);
    for(let frame=1;frame<=fps*4;frame++){
      const now=frame/fps;
      while((tick+1)*FIXED_STEP<=now+1e-10){
        stepFlight(server,{},level,DEFAULT_HULL,FIXED_STEP,[]);tick++;
        if(tick%12===0)packets.push({at:tick*FIXED_STEP+.05+.02*Math.sin(tick),time:tick*FIXED_STEP,state:structuredClone(server)});
      }
      while(packets[0]?.at<=now){const packet=packets.shift();prediction.receive(packet.state,0,now,level,DEFAULT_HULL,packet.time);}
      const pose=prediction.update({},now,1/fps),speed=(pose.y-previous)*fps;
      if(previousSpeed!==null&&now>.5)maxAcceleration=Math.max(maxAcceleration,Math.abs(speed-previousSpeed)*fps);
      previous=pose.y;previousSpeed=speed;
    }
    assert.ok(maxAcceleration<12,`${fps} Hz: snapshot timing introduced ${maxAcceleration.toFixed(2)} m/s² acceleration`);
  }
});

function terrain(slope=0,pads=[]){return {id:'contact-test',objective:'land',theme:'sandstone',gravity:9.8,floor:[[-10,-10*slope],[10,10*slope]],roof:[],pads,spawn:{x:0,y:1.05}};}
function dropped(level,overrides={}){return Object.assign(createFlight(level),{status:'flying',vy:-.5,...overrides});}
function run(state,level,seconds=4,solids){for(let i=0;i<seconds/FIXED_STEP&&state.status==='flying';i++)stepFlight(state,{},level,DEFAULT_HULL,FIXED_STEP,solids);return state;}

test('gentle contact settles on ordinary terrain without awarding a race finish',()=>{
  const level=terrain(),state=run(dropped(level),level);
  assert.equal(state.status,'flying');assert.equal(state.ground.resting,true);
  assert.equal(state.vy,0);assert.equal(state.omega,0);assert.equal(state.damage.hull,100);
  stepFlight(state,{thrust:true},level);assert.equal(state.ground,null);assert.ok(state.vy>0);
});

test('both feet settle onto a gentle slope; gravity topples a steep-slope landing',()=>{
  const gentle=terrain(.18),stable=run(dropped(gentle),gentle);
  assert.equal(stable.damage.hull,100);assert.equal(stable.ground.resting,true);
  assert.ok(Math.abs(stable.angle-Math.atan(.18))<.02);
  const steep=terrain(.8),unstable=dropped(steep,{y:1.5});
  let tilted=false;
  for(let i=0;i<120*5&&unstable.status==='flying';i++){stepFlight(unstable,{},steep);tilted ||= Math.abs(unstable.angle)>.35;}
  assert.ok(tilted);assert.equal(unstable.status,'crashed');
});

test('a small tilted touchdown falls onto both feet; a centre of mass outside the feet tips over',()=>{
  const level=terrain();
  const recovered=run(dropped(level,{angle:.2,y:1.15}),level);
  assert.equal(recovered.damage.hull,100);assert.equal(recovered.ground.resting,true);assert.ok(Math.abs(recovered.angle)<.02);
  const tipped=run(dropped(level,{angle:.65,y:1.5}),level);
  assert.equal(tipped.status,'crashed');
});

test('a hard landing breaks the legs first, then the falling pressure hull is destroyed',()=>{
  const level=terrain(),state=dropped(level,{y:1.001,vy:-6});
  stepFlight(state,{},level);assert.equal(state.status,'flying');assert.equal(state.damage.hull,100);
  assert.equal(state.damage.legLeft,0);assert.equal(state.damage.legRight,0);
  run(state,level,.5);assert.equal(state.status,'crashed');assert.match(state.reason,/hull|terrain/i);
});

test('a glancing obstacle hit detaches one leg without instant hull destruction and prevents a stable landing',()=>{
  const level=terrain(),state=dropped(level,{y:1.05,vx:-1});
  const solids=[[[-100,0],[100,0],[100,-20],[-100,-20]],[[-.42,-.02],[-.3,-.02],[-.3,.08],[-.42,.08]]];
  checkTerrainCollision(state,level,DEFAULT_HULL,solids);
  assert.equal(state.damage.legLeft,0);assert.equal(state.damage.legRight,100);assert.equal(state.damage.hull,100);
  run(state,level,5,solids);assert.equal(state.status,'crashed');
  const fresh=createFlight(level);assert.equal(fresh.damage.legLeft,100);assert.equal(fresh.damage.legRight,100);
});

test('missing legs cannot be repaired by a pad; only an intact settled goal landing finishes the race',()=>{
  const level=terrain(0,[{x:0,y:0,width:5,type:'goal'}]);
  const safe=run(dropped(level),level);assert.equal(safe.status,'landed');
  const broken=dropped(level);breakLandingLeg(broken,0,[-.38,-1]);
  run(broken,level);assert.equal(broken.status,'crashed');assert.equal(broken.damage.legLeft,0);
});

test('clipping the side of a raised pad shears off the leg without teleporting onto its top',()=>{
  const level=terrain(0,[{x:.6,y:.2,width:1,type:'goal'}]),state=dropped(level,{x:-.29,y:1.1,vx:1.5,vy:0});
  stepFlight(state,{},level);assert.equal(state.damage.legRight,0);assert.equal(state.damage.legLeft,100);
  assert.equal(state.damage.hull,100);assert.equal(state.status,'flying');assert.ok(state.y<1.11);
  const displaced=dropped(level,{x:-.27,y:1.1});checkTerrainCollision(displaced,level);
  assert.equal(displaced.damage.legRight,0);assert.equal(displaced.damage.hull,100);
});

const level=amber,source={x:-19,y:-7.1,z:.4,angle:0,vx:0,vy:0};
const pool=()=>createPlumePool({random:()=>.5});
test('firing engines push both pilots cooled smoke; greater engine power moves it farther',()=>{
  const air={...level,floor:[[-100,-20],[100,-20]],roof:[],pads:[]};
  const cases=[0,10,25].map(power=>{
    const value=pool();for(const id of ['you','opponent'])value.emit(id,{...source,x:id==='you'?0:.05,y:10},.1,air);
    value.update(.7,air);const parcel=value.particles.find(p=>p.active);
    const emitter={x:parcel.x+1,y:parcel.y,z:parcel.z,angle:-Math.PI/2,firing:power>0,power};
    value.update(.2,air,[emitter]);return value.particles.filter(p=>p.active);
  });
  assert.equal(cases[0].length,cases[1].length);
  cases[0].forEach((quiet,index)=>{
    assert.ok(cases[1][index].x<quiet.x-.03,'Either pilot exhaust must respond to the shared engine field.');
    assert.ok(cases[2][index].x<cases[1][index].x-.03);
  });
});

test('a descending rocket passes through its own lingering exhaust without taking damage',()=>{
  const air={...level,floor:[[-100,-20],[100,-20]],roof:[],pads:[],spawn:{x:0,y:4}};
  const state={...createFlight(air),status:'flying',vy:6},smoke=pool();let crossed=false;
  for(let i=0;i<720&&!crossed&&state.status==='flying';i++){
    stepFlight(state,{thrust:i<60},air);
    if(i<60)smoke.emit('you',{x:state.x,y:state.y-1,z:.4,angle:0,vx:state.vx,vy:state.vy},FIXED_STEP,air);
    smoke.update(FIXED_STEP,air);
    crossed=state.vy<0&&smoke.particles.some(p=>p.active&&p.age>.8&&Math.abs(state.y-p.y)<.25);
  }
  assert.ok(crossed,'The old smoke trail must remain in the descent path after engine cutoff.');
  assert.equal(state.damage.hull,100);assert.equal(state.status,'flying');
});

test('remaining fuel scales the burst and burn duration; empty tanks and underwater wrecks do not sustain fire',()=>{
  const low=pool(),full=pool(),empty=pool(),water=pool(),wreck={x:0,y:1,fuel:20};
  low.ignite('low',wreck,level);full.ignite('full',{...wreck,fuel:100},level);empty.ignite('empty',{...wreck,fuel:0},level);
  water.ignite('wet',wreck,{...level,theme:'water'});
  assert.ok(full.count>low.count*3);assert.equal(empty.fires,0);assert.equal(water.count,0);
  empty.update(.1,level);assert.ok(empty.particles.filter(p=>p.active).every(p=>p.heat<=.03));
  low.update(1,level);full.update(1,level);assert.equal(low.fires,0);assert.equal(full.fires,1);
  for(let i=0;i<25;i++)full.update(1,level);
  assert.equal(full.fires,0);assert.equal(full.count,0);
  full.ignite('again',{...wreck,fuel:100},level);full.reset();assert.equal(full.fires,0);assert.equal(full.count,0);
});

test('a crash remains visible for two seconds and triggers only one automatic restart',()=>{
  const replay=createCrashReplay();replay.start();
  for(let i=0;i<119;i++){replay.update(1/60);assert.equal(replay.consume(),false);}
  replay.update(1/60+1e-10);assert.equal(replay.consume(),true);assert.equal(replay.consume(),false);assert.equal(replay.active,false);
});

test('hidden or paused playback does not consume crash time; navigation and manual restart cancel pending work',()=>{
  const replay=createCrashReplay();replay.start();replay.update(1);
  assert.equal(replay.update(0),1);assert.equal(replay.consume(),false);
  replay.cancel();assert.equal(replay.update(10),null);assert.equal(replay.consume(),false);
  replay.start();assert.equal(replay.update(0),2);replay.update(2);assert.equal(replay.consume(),true);
});

const hulls=JSON.parse(await readFile(new URL('../vendor/rocket/server/ship-hulls.json',import.meta.url)));
async function fixture(t){
  let time=100000;const store=await createLocalStore(),service=createRocketService({store,hulls,now:()=>time,autoTick:false});
  const server=http.createServer((req,res)=>service.handle(req,res,new URL(req.url,'http://localhost').pathname));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  t.after(()=>{service.close();server.closeAllConnections();server.close();});
  async function call(route,data,token,headers={}){
    time+=40;const response=await fetch(base+route,{method:data===undefined?'GET':'POST',headers:{...(token?{Authorization:`Bearer ${token}`} :{}),...headers},body:data===undefined?undefined:JSON.stringify(data)});
    return {status:response.status,value:await response.json()};
  }
  const a=await store.create('Alpha'),b=await store.create('Beta');return {store,service,base,call,a,b,advance:seconds=>{time+=seconds*1000;service.tick(seconds);}};
}


test('a solo retry resets the bots, timer and result order while retaining the room and pilot progress',async t=>{
  const f=await fixture(t),joined=await f.call('/join',{mission:'amber',ship:'aster'},f.a.token),id=joined.value.room.id;
  const room=f.service.rooms.get(id),previous=room.players.get(f.a.id);
  room.race.started=true;room.race.elapsed=30;room.finishTimes.set('ash',25);
  room.race.racers.find(r=>r.id==='ash').finishTime=25;
  f.advance(.3);
  const retry=await f.call('/join',{room:id,ship:'aster',restart:true},f.a.token);
  assert.equal(retry.status,200);assert.equal(retry.value.room.id,id);assert.equal(f.service.rooms.size,1);
  assert.equal(room.race.elapsed,0);assert.equal(room.race.started,false);assert.equal(room.round,1);assert.equal(room.finishTimes.size,0);
  assert.equal(room.race.racers.filter(r=>r.pilot).length,2);
  assert.ok(room.race.racers.every(r=>r.finishTime===null&&r.state.status==='ready'));
  assert.notEqual(room.players.get(f.a.id).attemptId,previous.attemptId);
  assert.equal((await f.call('/me',undefined,f.a.token)).value.player.profile.coins,0);
});

import {crewTransfer,BOARDING_DURATION,ARRIVAL_DURATION,CREW_COUNT} from '../vendor/rocket/game/crew-transfer.js';
import {crewReactions} from '../vendor/rocket/game/ride.js';
import {createMenuCamera} from '../vendor/rocket/game/menu-camera.js';
import {createMenuTelemetry} from '../vendor/rocket/game/menu-telemetry.js';
test('boarding waits for the walkers, then lifts, crosses the bridge and closes the hatch',()=>{
  const walking=crewTransfer(2,{boarding:true});assert.equal(walking.elevator,0);assert.equal(walking.door,0);
  const lift=crewTransfer(5,{boarding:true});assert.ok(lift.elevator>0&&lift.elevator<1);assert.ok(lift.people.every(person=>person.progress===0));
  const crossing=crewTransfer(6.5,{boarding:true});assert.equal(crossing.elevator,1);assert.equal(crossing.door,1);assert.ok(crossing.people.every(person=>person.path==='bridge'));
  assert.ok(crewTransfer(5.8,{boarding:true}).people[0].progress<crewTransfer(7.5,{boarding:true}).people[0].progress,'Board from the tower toward the ship, never in reverse.');
  const boarded=crewTransfer(BOARDING_DURATION,{boarding:true});assert.equal(boarded.complete,true);assert.equal(boarded.door,0);assert.ok(boarded.people.every(person=>!person.visible));
});


test('arrival raises the tower before bridge connection; everyone reaches the lift before it descends',()=>{
  const rising=crewTransfer(.5,{rising:true});assert.ok(rising.rise>0&&rising.rise<1);assert.equal(rising.bridge,0);assert.ok(rising.people.every(person=>!person.visible));
  const crossing=crewTransfer(3,{rising:true});assert.equal(crossing.rise,1);assert.equal(crossing.bridge,1);assert.equal(crossing.elevator,1);
  const riding=crewTransfer(5.5,{rising:true});assert.ok(riding.elevator>0&&riding.elevator<1);assert.ok(riding.people.every(person=>person.path==='ground'&&person.progress===0));
  const complete=crewTransfer(ARRIVAL_DURATION,{rising:true});assert.equal(complete.complete,true);assert.equal(complete.elevator,0);assert.ok(complete.people.every(person=>!person.visible));
});


test('ride reactions distinguish gentle flight, sustained high G and severe landing shocks',()=>{
  assert.ok(crewReactions({peakG:1.7,roughSeconds:0,impacts:0}).includes('☺'));
  assert.ok(crewReactions({peakG:2.3,roughSeconds:2,impacts:0}).includes('Damn!'));
  assert.ok(crewReactions({peakG:5}).includes('🤢'));
});


test('continuous throttle produces proportional acceleration and fuel burn',()=>{
  const level={objective:'land',gravity:0,verticalDrag:0,floor:[],roof:[],pads:[],spawn:{x:0,y:100}};
  const flights=[.25,.75,1].map(throttle=>{
    const state={...createFlight(level),status:'flying'};
    for(let i=0;i<120;i++)stepFlight(state,{thrust:true,throttle},level,undefined,FIXED_STEP,[]);
    assert.ok(Math.abs(state.vy-BASE_THRUST*throttle)<1e-10);assert.ok(Math.abs(state.fuel-(100-2.15*throttle))<1e-9);return state;
  });
  assert.ok(flights[1].y>flights[0].y);assert.ok(flights[2].y>flights[1].y);
});


test('menu instruments reject frame-rate flicker while showing intermediate engine percentages',()=>{
  const display=createMenuTelemetry(),readings=[];
  for(let i=0;i<240;i++){
    const value=display.update({clock:i/60,throttle:.6+.05*Math.sin(i*3),horizontalSpeed:3+.4*Math.sin(i*3),verticalSpeed:0});
    if(i>60)readings.push(value);
  }
  assert.ok(Math.max(...readings.map(v=>v.throttle))-Math.min(...readings.map(v=>v.throttle))<.02);
  assert.ok(readings.every(v=>v.throttle>.55&&v.throttle<.65));
  assert.ok(Math.max(...readings.map(v=>v.airspeed))-Math.min(...readings.map(v=>v.airspeed))<.1);
});


test('menu arrival camera includes the rocket and destination tower, then tightens as they converge',()=>{
  const camera=createMenuCamera(),tower={x:21.12,y:0};let view;
  for(let i=0;i<180;i++)view=camera.update({x:-10,y:120,altitude:119,verticalSpeed:-20,horizontalSpeed:0,flightBlend:0,stage:6,tripProgress:.84,pilot:'autopilot'},{width:1440,height:900,tower,dt:1/60});
  assert.ok(view.span<30,'Pad framing must wait until the final 15 percent of the trip.');
  for(let i=0;i<180;i++)view=camera.update({x:-10,y:120,altitude:119,verticalSpeed:-20,horizontalSpeed:0,flightBlend:0,stage:6,tripProgress:.85,pilot:'autopilot'},{width:1440,height:900,tower,dt:1/60});
  assert.ok(Math.abs((tower.y-view.y)/(view.span/2))<.95);assert.ok(Math.abs((120-view.y)/(view.span/2))<.95);
  const wide=view.span;
  for(let i=0;i<600;i++)view=camera.update({x:20,y:1.15,altitude:0,verticalSpeed:0,horizontalSpeed:0,flightBlend:0,stage:10,tripProgress:1,pilot:'autopilot'},{width:1440,height:900,tower,dt:1/60});
  assert.ok(view.span<6&&view.span<wide/10);assert.ok(Math.abs((tower.x-view.x)/(view.width/2))<.95);
});

test('a later human landing extends the shared deadline for that crew to disembark',async t=>{
  const f=await fixture(t),joined=await f.call('/join',{mission:'moon',ship:'aster'},f.a.token),id=joined.value.room.id;
  await f.call('/join',{room:id,ship:'aster'},f.b.token);
  const room=f.service.rooms.get(id),first=room.players.get(f.a.id),second=room.players.get(f.b.id);
  room.race.started=true;room.race.elapsed=10;first.startedAt=0;first.state.status='landed';first.finishTime=10;
  f.advance(FIXED_STEP);const original=room.nextLevelAt;
  for(let i=0;i<30;i++)f.advance(.1);
  second.startedAt=0;second.state.status='landed';second.finishTime=room.race.elapsed;
  f.advance(FIXED_STEP);assert.ok(room.nextLevelAt>original+2.9);
  assert.ok(room.nextLevelAt-room.race.elapsed>ARRIVAL_DURATION+.9);
  while(room.race.elapsed<original+.2)f.advance(.1);
  assert.equal(room.round,0,'The second crew must not be interrupted by the first deadline.');
});
