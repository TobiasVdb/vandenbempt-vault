import { createFlight, stepFlight, completed, orbitalTarget, FIXED_STEP, DEFAULT_HULL, resolveShipCollision, checkTerrainCollision } from './physics.js';
import { terrainSolids } from './levels.js';
import { createPilot, pilotInput } from './pilots.js';
import { flightHull } from './pod.js';
import { hasFlightInput } from './controls.js';

export function createRace(level,{hull=DEFAULT_HULL,tuning={},bots=[]}={}){
  hull=flightHull(level,hull);
  const player=createFlight(level,hull,tuning);player.hull=hull;
  const spacing=Math.max(...[hull,...bots.map(bot=>bot.hull||DEFAULT_HULL)].map(body=>Math.max(...body.map(p=>p[0]))-Math.min(...body.map(p=>p[0]))))+.18;
  return {level,solids:terrainSolids(level),elapsed:0,started:false,finished:false,contacts:0,
    racers:[{id:'you',name:'You',state:player,hull,finishTime:null},...bots.map((bot,i)=>{
      const body=flightHull(level,bot.hull||DEFAULT_HULL),state=createFlight(level,body,bot.tuning||{});state.hull=body;state.x+=(i%2?1:-1)*(Math.floor(i/2)+1)*spacing;
      return {id:bot.id,name:bot.name,state,hull:body,finishTime:null,pilot:createPilot({speed:bot.speed??2.3+i*.2,delay:bot.delay??1.5+i*.7})};
    })]};
}
export function stepRace(race,input,dt=FIXED_STEP,playerInputs=null){
  if(race.finished)return;
  if(!race.started&&!(race.level.controls==='translation'?hasFlightInput(input):input.thrust))return;
  race.started=true;race.elapsed+=dt;
  const commands=race.racers.map(racer=>racer.waiting?{}:racer.pilot?pilotInput(racer.pilot,racer.state,race.level,race.elapsed):playerInputs?.get(racer.id)??input);
  // Limit surface travel, including rotating tips, to avoid tunnelling at orbital speeds.
  const speed=Math.max(...race.racers.map(({state,hull})=>Math.hypot(state.vx,state.vy)+Math.abs(state.omega)*Math.max(...hull.map(p=>Math.hypot(...p)))+state.tuning.thrust*dt));
  const steps=Math.max(1,Math.ceil(speed*dt/.04)),step=dt/steps;
  for(let frame=0;frame<steps;frame++){
    for(const [index,racer] of race.racers.entries())if(!racer.waiting){racer.state.worldTime=race.elapsed-dt+(frame+1)*step;stepFlight(racer.state,commands[index],race.level,racer.hull,step,race.solids);}
    const displaced=new Set();
    for(let pass=0;pass<3;pass++)for(let i=0;i<race.racers.length;i++)for(let j=i+1;j<race.racers.length;j++){
      const a=race.racers[i],b=race.racers[j];
      if(a.waiting||b.waiting)continue;
      if(resolveShipCollision(a.state,b.state,a.hull,b.hull)){race.contacts++;displaced.add(a);displaced.add(b);}
    }
    for(const racer of displaced)checkTerrainCollision(racer.state,race.level,racer.hull,race.solids);
    for(const racer of race.racers)if(completed(racer.state)&&racer.finishTime===null)racer.finishTime=race.elapsed-dt+(frame+1)*step;
    if(!race.multiplayer&&(completed(race.racers[0].state)||race.racers[0].state.status==='crashed'))break;
  }
  const player=race.racers[0];
  race.finished=!race.multiplayer&&(completed(player.state)||player.state.status==='crashed');
}
function progress(racer,level){
  const s=racer.state;if(s.status==='crashed')return -1;
  if(level.objective==='orbit')return Math.min(1,(s.y+8)/74)*.45+Math.min(1,Math.max(0,s.vx)/orbitalTarget(s,level))*.45+s.orbitHold/30;
  if(level.objective==='rings')return s.gate+(s.x+26)/52;
  return (s.x+26)/52;
}
export function standings(race){
  if(!race.started)return [...race.racers];
  return [...race.racers].sort((a,b)=>{
    if(a.finishTime!==null||b.finishTime!==null)return (a.finishTime??Infinity)-(b.finishTime??Infinity);
    return progress(b,race.level)-progress(a,race.level);
  });
}
export function raceResult(race){
  const player=race.racers[0],success=completed(player.state);
  const rank=success?1+race.racers.slice(1).filter(r=>r.finishTime!==null&&r.finishTime<=player.finishTime).length:race.racers.length;
  return {success,rank,time:race.elapsed};
}
