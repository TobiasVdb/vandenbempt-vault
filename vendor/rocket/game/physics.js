import { terrainSolids, meteorPolygon, meteorMotion } from './levels.js';
import { createDamageState, applyImpact, applyDamage, destroyShip, breakLandingLeg } from './damage.js';

import { landingGeometry, landingFeet, stepGroundContact, resolveLandingContact, bodyTouchesGround } from './landing.js';
import { flightHull, missionTuning } from './pod.js';
import {BASE_GRAVITY,BASE_THRUST,LINEAR_DAMPING,LANDING_LIMITS} from './flight-balance.js';
export {LANDING_LIMITS} from './flight-balance.js';

export const FIXED_STEP = 1/120;
export const DEFAULT_HULL = [[-.38,-1],[.38,-1],[.49,-.75],[.27,.55],[0,1],[-.27,.55],[-.49,-.75]];
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));

export function convexHull(points) {
  const sorted = [...new Map(points.map(p=>[`${p[0].toFixed(5)},${p[1].toFixed(5)}`,p])).values()].sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
  if (sorted.length<3) throw new Error('A collision hull needs at least three points.');
  const cross = (o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);
  const lower=[],upper=[];
  for (const p of sorted) {while(lower.length>=2 && cross(lower.at(-2),lower.at(-1),p)<=0)lower.pop();lower.push(p);}
  for (const p of sorted.toReversed()) {while(upper.length>=2 && cross(upper.at(-2),upper.at(-1),p)<=0)upper.pop();upper.push(p);}
  return lower.slice(0,-1).concat(upper.slice(0,-1));
}

export function worldHull(state, hull=DEFAULT_HULL) {
  const c=Math.cos(state.angle),s=Math.sin(state.angle);
  return hull.map(([x,y])=>[state.x+x*c-y*s,state.y+x*s+y*c]);
}

export function polygonsOverlap(a,b) {
  for (const poly of [a,b]) for (let i=0;i<poly.length;i++) {
    const p=poly[i],q=poly[(i+1)%poly.length],nx=p[1]-q[1],ny=q[0]-p[0];
    const aa=a.map(v=>v[0]*nx+v[1]*ny),bb=b.map(v=>v[0]*nx+v[1]*ny);
    if (Math.max(...aa)<Math.min(...bb) || Math.max(...bb)<Math.min(...aa))return false;
  }
  return true;
}

/** Equal-mass hull contact. Upgrades alter thrust, not collision mass. */
export function resolveShipCollision(a,b,hullA=DEFAULT_HULL,hullB=DEFAULT_HULL){
  if(!['ready','flying'].includes(a.status)||!['ready','flying'].includes(b.status))return false;
  const radius=hull=>Math.max(...hull.map(p=>Math.hypot(...p)));
  if(Math.hypot(b.x-a.x,b.y-a.y)>radius(hullA)+radius(hullB))return false;
  const bodyA=worldHull(a,hullA),bodyB=worldHull(b,hullB);
  let depth=Infinity,nx=0,ny=0;
  for(const body of [bodyA,bodyB])for(let i=0;i<body.length;i++){
    const p=body[i],q=body[(i+1)%body.length],length=Math.hypot(q[0]-p[0],q[1]-p[1]);
    const x=(p[1]-q[1])/length,y=(q[0]-p[0])/length;
    const aa=bodyA.map(v=>v[0]*x+v[1]*y),bb=bodyB.map(v=>v[0]*x+v[1]*y);
    const forward=Math.max(...aa)-Math.min(...bb),backward=Math.max(...bb)-Math.min(...aa);
    if(forward<=0||backward<=0)return false;
    if(Math.min(forward,backward)<depth){depth=Math.min(forward,backward);const sign=forward<backward?1:-1;nx=x*sign;ny=y*sign;}
  }
  // Contact comes from the overlapping support features, so nose/fin hits impart spin.
  const supportA=Math.max(...bodyA.map(p=>p[0]*nx+p[1]*ny)),supportB=Math.min(...bodyB.map(p=>p[0]*nx+p[1]*ny));
  const ta=bodyA.filter(p=>supportA-p[0]*nx-p[1]*ny<.001).map(p=>-p[0]*ny+p[1]*nx);
  const tb=bodyB.filter(p=>p[0]*nx+p[1]*ny-supportB<.001).map(p=>-p[0]*ny+p[1]*nx);
  const tangent=(Math.max(Math.min(...ta),Math.min(...tb))+Math.min(Math.max(...ta),Math.max(...tb)))/2;
  const normal=(supportA+supportB)/2,cx=nx*normal-ny*tangent,cy=ny*normal+nx*tangent;
  const ax=cx-a.x,ay=cy-a.y,bx=cx-b.x,by=cy-b.y;
  const closing=(b.vx-b.omega*by-a.vx+a.omega*ay)*nx+(b.vy+b.omega*bx-a.vy-a.omega*ax)*ny;
  a.x-=nx*(depth+.00001)/2;a.y-=ny*(depth+.00001)/2;
  b.x+=nx*(depth+.00001)/2;b.y+=ny*(depth+.00001)/2;
  if(a.ground)a.ground=null;if(b.ground)b.ground=null;
  if(closing>=0)return true;
  applyImpact(a,-closing,{x:cx,y:cy},'Hull destroyed in a collision with another spacecraft.');
  applyImpact(b,-closing,{x:cx,y:cy},'Hull destroyed in a collision with another spacecraft.');
  const inertia=hull=>{
    let area=0,moment=0;
    for(let i=0;i<hull.length;i++){
      const p=hull[i],q=hull[(i+1)%hull.length],cross=p[0]*q[1]-q[0]*p[1];
      area+=cross;moment+=cross*(p[0]**2+p[0]*q[0]+q[0]**2+p[1]**2+p[1]*q[1]+q[1]**2);
    }
    return Math.max(.01,moment/(6*area));
  };
  const ia=inertia(hullA),ib=inertia(hullB),armA=ax*ny-ay*nx,armB=bx*ny-by*nx;
  const impulse=-1.2*closing/(2+armA**2/ia+armB**2/ib);
  a.vx-=impulse*nx;a.vy-=impulse*ny;a.omega-=impulse*armA/ia;
  b.vx+=impulse*nx;b.vy+=impulse*ny;b.omega+=impulse*armB/ib;
  if(a.status!=='crashed')a.status='flying';if(b.status!=='crashed')b.status='flying';
  return true;
}

/** Recheck solid contact after another ship has displaced a racer. */
export function checkTerrainCollision(state,level,hull=DEFAULT_HULL,solids=terrainSolids(level)){
  if(!['ready','flying'].includes(state.status))return;
  if(level.controls==='translation'){resolveMeteorContacts(state,level,flightHull(level,hull));return;}
  const pads=level.pads.map(p=>[[p.x-p.width/2,p.y-.38],[p.x+p.width/2,p.y-.38],[p.x+p.width/2,p.y],[p.x-p.width/2,p.y]]);
  if(level.objective==='land'){
    for(const [side,foot]of landingFeet(state,hull).entries()){
      if((state.damage[side===0?'legLeft':'legRight']??100)===0)continue;
      const radius=.025,point=[[foot.x-radius,foot.y-radius],[foot.x+radius,foot.y-radius],[foot.x+radius,foot.y+radius],[foot.x-radius,foot.y+radius]];
      const surface=level.floor;
      // Foot contact with the supporting floor is handled by the landing solver.
      const walls=solids.slice(Math.max(0,surface.length-1));
      if(walls.some(p=>polygonsOverlap(point,p))||pads.some((shape,index)=>foot.y<level.pads[index].y-.03&&polygonsOverlap(point,shape)))breakLandingLeg(state,side,landingGeometry(hull).feet[side]);
    }
  }
  const body=worldHull(state,level.objective==='land'?landingGeometry(hull).body:hull);
  if([...solids,...pads].some(p=>polygonsOverlap(body,p)))crash(state,level.theme==='space'?'Collision with a meteor.':'Contact with the terrain.');
}

export function createFlight(level, hull=DEFAULT_HULL, tuning={}) {
  hull=flightHull(level,hull);tuning=missionTuning(level,tuning);
  const pad=level.pads[0];
  return {x:level.spawn?.x??pad.x,y:level.spawn?.y??pad.y-Math.min(...hull.map(p=>p[1]))+.015,vx:0,vy:0,angle:0,omega:0,
    fuel:tuning.capacity??100,time:0,status:'ready',thrust:0,reason:'',pad:0,gate:0,dockHold:0,orbitHold:0,rcsTurn:0,damage:createDamageState(),
    tuning:{thrust:BASE_THRUST,turnPower:level.objective==='land'?(100/60)/.396:2.9,capacity:100,rcs:0,...tuning}};
}

export function environmentAt(state,level){
  const altitude=Math.max(0,state.y+8),orbital=level.objective==='orbit';
  const density=level.theme==='space'?0:orbital?Math.exp(-altitude/(level.scaleHeight||13)):1;
  const gravity=orbital?level.gravity/(1+altitude/level.planetRadius)**2:(level.gravity??BASE_GRAVITY);
  let drag=level.drag??.055,verticalDrag=level.verticalDrag??.035,cloud=0;
  for(const volume of level.clouds||[])if(((state.x-volume.x)/volume.rx)**2+((state.y-volume.y)/volume.ry)**2<=1)cloud+=volume.drag;
  drag+=cloud;verticalDrag+=cloud;
  if(orbital){drag=.07*density;verticalDrag=.05*density;}
  const engineScale=(level.engineScale??1)*(orbital ? .52+.48*(1-density) : 1);
  const centrifugal=orbital?state.vx**2/(level.planetRadius+altitude):0;
  const wind=(level.wind||0)*Math.min(1,Math.max(.08,altitude/4));
  return {gravity,drag,verticalDrag,cloud,density,engineScale,wind,downward:gravity-(level.buoyancy||0)-centrifugal,altitude};
}
export function orbitalTarget(state,level){
  const altitude=Math.max(0,state.y+8);
  return Math.sqrt(level.gravity*level.planetRadius**2/(level.planetRadius+altitude));
}
export const completed = state => ['landed','finished','orbiting'].includes(state.status);

export function flightDamping(level,tuning){
  // Vertical motion uses gravity and the environment's actual drag, without an
  // extra velocity brake that flattens the ascent and descent into terminal speed.
  return level.objective==='land'?{horizontal:LINEAR_DAMPING*tuning.thrust/BASE_THRUST,vertical:0}:{horizontal:0,vertical:0};
}

function checkObjective(state,previous,level,hull,dt){
  if(level.objective==='dock'){
    const dock=level.dock;
    const inside=worldHull(state,hull).every(([x,y])=>Math.hypot(x-dock.x,y-dock.y)<=dock.radius);
    state.dockHold=inside&&Math.hypot(state.vx,state.vy)<=dock.maxSpeed?state.dockHold+dt:0;
    if(state.dockHold+1e-9>=dock.hold){state.status='finished';state.translation={x:0,y:0};}
  }
  if(level.objective==='rings'){
    const ring=level.rings[state.gate];if(!ring)return;
    if(previous.x<ring.x&&state.x>=ring.x&&state.vx>0){
      const t=(ring.x-previous.x)/(state.x-previous.x),atCrossing={...state,x:ring.x,y:previous.y+(state.y-previous.y)*t};
      const body=worldHull(atCrossing,hull),fits=body.every(p=>Math.abs(p[1]-ring.y)<ring.radius-.1);
      const horizontal=!ring.horizontal||(Math.abs(state.angle+Math.PI/2)<25*Math.PI/180&&state.vx>1.3&&Math.abs(state.vy)<state.vx*.4);
      if(fits&&horizontal){state.gate++;state.notice='';if(state.gate===level.rings.length){state.status='finished';state.thrust=0;}}
      else state.notice=ring.horizontal?'Cross nose-first, almost level, inside the ring.':'Keep the whole ship inside the next ring.';
    }
  }
  if(level.objective==='orbit'){
    const target=orbitalTarget(state,level),altitude=state.y+8;
    const stable=altitude>=55&&altitude<=100&&state.vx>=target*.95&&state.vx<=target*1.15&&Math.abs(state.vy)<1.8;
    state.orbitHold=stable?state.orbitHold+dt:0;
    if(state.orbitHold>=3){state.status='orbiting';state.thrust=0;}
    if(altitude>180)crash(state,'You escaped the orbital corridor. Aim for 55–100 m.');
  }
}

/** Fixed-step, deterministic planar flight. Collision uses the GLB's projected convex hull. */
export function stepFlight(state,input,level,hull=DEFAULT_HULL,dt=FIXED_STEP,solids=terrainSolids(level)) {
  if (!['ready','flying'].includes(state.status))return;
  hull=flightHull(level,hull);
  const tuning=state.tuning||{thrust:BASE_THRUST,turnPower:(100/60)/.396,capacity:100,rcs:0};
  const env=environmentAt(state,level),previousPosition={x:state.x,y:state.y,angle:state.angle},previousVy=state.vy;
  const turn=clamp(input.turn||0,-1,1),engine=state.damage.engine/100,steering=state.damage[turn>0?'right':'left']/100;
  const translation=level.controls==='translation';
  const thrust=!translation&&Boolean(input.thrust)&&state.fuel>0&&engine>0;
  state.thrust=thrust?engine:0;
  let tx=translation?clamp(input.translateX||0,-1,1):0,ty=translation?clamp(input.translateY||0,-1,1):0;
  const magnitude=Math.max(1,Math.hypot(tx,ty));tx/=magnitude;ty/=magnitude;
  if(state.fuel<=0||engine<=0){tx=0;ty=0;}
  if (state.status==='ready' && !thrust&&!(translation&&(tx||ty||turn||state.worldTime>0))) {if(!translation)state.fuel=Math.min(tuning.capacity,state.fuel+dt*12);return;}
  state.status='flying';state.time+=dt;
  if(level.objective==='land'&&state.ground){
    if(thrust)state.ground=null;
    else if(stepGroundContact(state,level,hull,env.downward,dt)){
      state.rcsTurn=0;
      bodyTouchesGround(state,level,hull);checkTerrainCollision(state,level,hull,solids);return;
    }
  }
  state.rcsTurn=(translation||tuning.rcs>0)&&state.fuel>0&&steering>0?turn:0;
  const jetsAvailable=tuning.rcs>0&&state.fuel>0&&steering>0;
  const turnPower=(tuning.rcs>0&&!jetsAvailable?(100/60)/.396:tuning.turnPower)*(.35+.65*steering);
  // Godot applies torque, then damping. Upper jets improve response and braking
  // together instead of multiplying the sustained turning speed.
  if(level.objective==='land'){
    state.omega+=turn*turnPower*dt;
    state.omega*=Math.max(0,1-3.1*(jetsAvailable?1+tuning.rcs*.6:1)*dt);
  }else state.omega+=(translation?state.rcsTurn*turnPower:turn*turnPower-state.omega*4.4)*dt;
  state.angle=(state.angle+state.omega*dt+Math.PI*3)%(Math.PI*2)-Math.PI;
  const force=thrust?tuning.thrust*env.engineScale*engine:0;
  state.vx+=(-Math.sin(state.angle)*force-(state.vx-env.wind)*env.drag)*dt;
  state.vy+=(Math.cos(state.angle)*force-env.downward-state.vy*env.verticalDrag)*dt;
  if(level.objective==='land'){
    // Upgrades improve sideways braking without slowing gravity-driven descent.
    const damping=flightDamping(level,tuning);
    state.vx*=Math.max(0,1-damping.horizontal*dt);state.vy*=Math.max(0,1-damping.vertical*dt);
  }
  if(translation){
    const acceleration=level.translationForce*engine;
    state.vx+=tx*acceleration*dt;state.vy+=ty*acceleration*dt;state.translation={x:tx,y:ty};
  }
  state.fuel=Math.max(0,state.fuel-dt*((thrust?2.15:0)+Math.hypot(tx,ty)*(translation?.12:.8)+Math.abs(state.rcsTurn)*.12));
  const previous=worldHull(state,hull),oldBottom=Math.min(...previous.map(p=>p[1]));
  state.x+=state.vx*dt;state.y+=(previousVy+state.vy)*dt/2;
  const body=worldHull(state,hull),bottom=Math.min(...body.map(p=>p[1])),left=Math.min(...body.map(p=>p[0])),right=Math.max(...body.map(p=>p[0]));
  if(level.objective==='land'){
    if(bodyTouchesGround(state,level,hull))return;
    resolveLandingContact(state,level,hull,previousPosition);
    if(state.ground)stepGroundContact(state,level,hull,env.downward,0);
    bodyTouchesGround(state,level,hull);
  }else{
    for(const [index,pad] of level.pads.entries()) {
      const crossing=oldBottom>=pad.y-.025 && bottom<=pad.y && state.vy<=0;
      const nearPad=right>=pad.x-pad.width/2 && left<=pad.x+pad.width/2;
      if(!crossing || !nearPad)continue;
      const inside=left>=pad.x-pad.width/2 && right<=pad.x+pad.width/2;
      const safe=inside&&Math.abs(state.angle)<=LANDING_LIMITS.angle&&Math.abs(state.vx)<=LANDING_LIMITS.horizontal&&-state.vy<=LANDING_LIMITS.vertical;
      if(safe){
        state.y+=pad.y-bottom+.015;state.vx=0;state.vy=0;state.omega=0;state.angle=0;
        state.y=pad.y-Math.min(...hull.map(p=>p[1]))+.015;
        state.status=pad.type==='goal'?'landed':'ready';state.pad=index;state.thrust=0;
      }else crash(state,inside?'Landing too hard or too tilted.':'Keep the whole ship over the pad.');
      return;
    }
  }
  // Pads have solid sides as well as a landing surface.
  checkTerrainCollision(state,level,hull,solids);
  if(state.status==='flying')checkObjective(state,previousPosition,level,hull,dt);
}

/** Resolve convex contacts against the moving meteor in its own frame. */
export function resolveMeteorContacts(state,level,hull){
  for(const meteor of level.meteors||[]){
    const motion=meteorMotion(meteor,state.worldTime??state.time);
    if(Math.hypot(state.x-meteor.x-motion.x,state.y-meteor.y-motion.y)>Math.max(meteor.rx,meteor.ry)+.5)continue;
    const rock=meteorPolygon(meteor).map(([x,y])=>[x+motion.x,y+motion.y]),body=worldHull(state,hull);
    let depth=Infinity,nx=0,ny=0,separated=false;
    for(const polygon of [body,rock])for(let i=0;i<polygon.length;i++){
      const p=polygon[i],q=polygon[(i+1)%polygon.length],length=Math.hypot(q[0]-p[0],q[1]-p[1]);
      const x=(p[1]-q[1])/length,y=(q[0]-p[0])/length;
      const a=body.map(p=>p[0]*x+p[1]*y),b=rock.map(p=>p[0]*x+p[1]*y);
      const forward=Math.max(...a)-Math.min(...b),backward=Math.max(...b)-Math.min(...a);
      if(forward<=0||backward<=0){separated=true;break;}
      if(Math.min(forward,backward)<depth){depth=Math.min(forward,backward);const sign=forward<backward?-1:1;nx=x*sign;ny=y*sign;}
    }
    if(separated)continue;
    state.x+=nx*(depth+.0001);state.y+=ny*(depth+.0001);
    const closing=(state.vx-motion.vx)*nx+(state.vy-motion.vy)*ny;
    if(closing>=0)continue;
    state.vx-=1.15*closing*nx;state.vy-=1.15*closing*ny;
    const c=Math.cos(state.angle),s=Math.sin(state.angle);
    applyDamage(state,Math.max(0,-closing-.8)**2*25,{x:(-nx*c-ny*s)*.34,y:(nx*s-ny*c)*.34},'High-speed impact with a meteor.');
    state.notice=-closing<=.8?'Gentle bump. Use opposite thrust to slow down.':'Meteor impact. Slow down before the next gap.';
  }
}

function crash(state,reason){destroyShip(state,reason);}
