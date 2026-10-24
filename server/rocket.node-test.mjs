import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import {createFlightPrediction} from '../vendor/rocket/game/flight-prediction.js'
import path from 'node:path'
import express from 'express'
import { createRocketHttp } from '../vendor/rocket/server/rocket-http.mjs'
import { BASE_GRAVITY, BASE_THRUST, LANDING_LIMITS } from '../vendor/rocket/game/flight-balance.js';
import { PLAYABLE_LEVELS } from '../vendor/rocket/game/levels.js';
import { createFlight, stepFlight, FIXED_STEP, DEFAULT_HULL, environmentAt } from '../vendor/rocket/game/physics.js';
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

test('landing accepts just below each threshold and rejects just above it',()=>{
  const pad=amber.pads[1];
  for(const [key,limit]of [['vy',LANDING_LIMITS.vertical],['vx',LANDING_LIMITS.horizontal],['angle',LANDING_LIMITS.angle]]){
    for(const safe of [true,false]){
      const state=createFlight(amber),value=limit*(safe?.98:1.02);
      // Target contact speed, allowing for gravity during the final physics tick.
      Object.assign(state,{status:'flying',x:pad.x,angle:key==='angle'?value:0,vx:key==='vx'?value:0,vy:key==='vy'?-value+BASE_GRAVITY*FIXED_STEP:-1});
      const bottom=Math.min(...DEFAULT_HULL.map(([x,y])=>x*Math.sin(state.angle)+y*Math.cos(state.angle)));
      state.y=pad.y-bottom+.0001;
      stepFlight(state,{},amber,DEFAULT_HULL,FIXED_STEP,[]);
      assert.equal(state.status,safe?'landed':'crashed',`${key} ${value}`);
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
