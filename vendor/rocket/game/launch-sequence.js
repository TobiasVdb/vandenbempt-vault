import { createFlight, stepFlight, FIXED_STEP, LANDING_LIMITS } from './physics.js';
import { terrainSolids } from './levels.js';

export const STATION_POSITIONS=[-19,20];
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const smooth=t=>t*t*t*(t*(t*6-15)+10);
const phases=['Standby','Starting engines','Takeoff','Pitch-over','Horizontal flight','Flip to brake','Retrograde braking','Landing alignment','Landing approach','Engine shutdown','Cooldown'];

function legLevel(departure){
  return {id:'showcase',theme:'sandstone',objective:'land',gravity:4,floor:[[-26,0],[26,0]],roof:[],
    pads:[departure,1-departure].map((station,index)=>({x:STATION_POSITIONS[station],y:.16,width:2.1,type:index?'goal':'launch'}))};
}

/** The cinematic pilot issues inputs; gameplay physics alone moves, turns and lands the ship. */
export function createLaunchSequence(hull,tuning={}){
  let leg=0,level=legLevel(0),state=createFlight(level,hull,tuning),solids=terrainSolids(level);
  // Slower stock steering needs a higher arc to complete the unpowered flip safely.
  const rest=state.y,apogee=Math.max(45,160*(2.9/state.tuning.turnPower)**2);let stage=0,phaseTime=0,clock=0,accumulator=0,pwm=0,heat=0,throttle=0,dockTime=0,lastInput={};
  let approachHeight=rest+8;
  function phase(next){stage=next;phaseTime=0;pwm=0;}
  function rotate(target){return clamp((target-state.angle)*8-state.omega*1.7,-1,1);}
  function hold(x,y,landing=false){
    const desiredVy=clamp((y-state.y)*.7,landing?-3.2:-4,6);
    const desiredVx=clamp((x-state.x)*.6,-3,3);
    const ax=clamp((desiredVx-state.vx)*1.2,-2,2),ay=clamp((desiredVy-state.vy)*1.8,-3,4);
    const fx=ax+state.vx*.055,fy=Math.max(.2,ay+4+state.vy*.035),angle=Math.atan2(-fx,fy);
    const duty=Math.cos(state.angle)>.35&&Math.abs(angle-state.angle)<1.1?clamp(Math.hypot(fx,fy)/state.tuning.thrust,0,1):0;
    return {turn:rotate(angle),duty};
  }
  function command(){
    const direction=leg%2===0?1:-1,goal=level.pads[1].x;
    if(stage<2||stage>=9)return {turn:0,duty:0};
    if(stage===2)return {turn:rotate(0),duty:1};
    if(stage===3){
      const cosine=Math.cos(state.angle),duty=cosine>.35&&state.vx*direction<3.2?clamp((4-state.vy*1.5)/(state.tuning.thrust*cosine),0,1):0;
      return {turn:rotate(-direction*Math.PI/2),duty};
    }
    if(stage===4)return {turn:rotate(-direction*Math.PI/2),duty:state.vx*direction<3.6?.45:0};
    if(stage===5)return {turn:rotate(direction*Math.PI/2),duty:0};
    if(stage===6)return {turn:rotate(direction*Math.PI/2),duty:state.vx*direction>.3?1:0};
    return hold(goal,stage===7?approachHeight:rest-.05,stage===8);
  }
  function tick(){
    // Gameplay accepts an on/off main engine, so holding altitude uses real thrust pulses.
    const desired=command();pwm+=desired.duty;const thrust=pwm>=1;if(thrust)pwm--;
    lastInput={turn:desired.turn,thrust};stepFlight(state,lastInput,level,hull,FIXED_STEP,solids);
    clock+=FIXED_STEP;phaseTime+=FIXED_STEP;
    heat+=(state.thrust>0?1-heat:-heat)*FIXED_STEP/(state.thrust>0?.5:1.8);
    if(state.status==='crashed')return state.thrust;
    if(stage>=9)dockTime+=FIXED_STEP;
    if(stage===0&&phaseTime>=1.5)phase(1);
    else if(stage===1&&phaseTime>=2.5)phase(2);
    else if(stage===2&&state.y-rest+Math.max(0,state.vy)**2/8>=apogee&&state.vy>0)phase(3);
    else if(stage===3&&Math.abs(state.angle+(leg%2===0?1:-1)*Math.PI/2)<.06&&Math.abs(state.omega)<.2)phase(4);
    else if(stage===4&&phaseTime>=.7&&(state.vx*(leg%2===0?1:-1)>=3.2||phaseTime>=1.2))phase(5);
    else if(stage===5&&Math.abs(state.angle-(leg%2===0?1:-1)*Math.PI/2)<.06&&Math.abs(state.omega)<.2)phase(6);
    else if(stage===6&&state.vx*(leg%2===0?1:-1)<=.3){approachHeight=rest+12;phase(7);}
    else if(stage===7&&Math.abs(state.x-level.pads[1].x)<.3&&Math.abs(state.vx)<.35&&Math.abs(state.y-approachHeight)<.5&&Math.abs(state.vy)<.4&&Math.abs(state.angle)<LANDING_LIMITS.angle)phase(8);
    // A completed destination becomes a service pad; the integrator handles refueling.
    if(state.status==='landed'&&stage<9){dockTime=0;phase(9);state.status='ready';level.pads[1].type='launch';}
    else if(stage===9&&phaseTime>=1.5)phase(10);
    else if(stage===10&&phaseTime>=4.5&&heat<.05){
      leg++;level=legLevel(leg%2);solids=terrainSolids(level);state.status='ready';state.pad=0;dockTime=0;phase(0);
    }
    return state.thrust;
  }
  function sample(){
    const departure=stage===0?0:stage===1?smooth(clamp(phaseTime/1.5,0,1)):1;
    const arrival=stage>=9?1-smooth(clamp((dockTime-.5)/2,0,1)):1;
    return {phase:state.status==='crashed'?'Flight interrupted':phases[stage],step:leg%2*11+stage+1,totalSteps:22,station:leg%2,destination:1-leg%2,legs:leg,
      x:state.x,y:state.y,altitude:Math.max(0,state.y-rest),horizontalSpeed:state.vx,verticalSpeed:state.vy,angle:state.angle,angularSpeed:state.omega,
      flightBlend:Math.sin(state.angle)**2,throttle:stage<9?throttle:0,heat,arms:leg%2===0?[departure,arrival]:[arrival,departure],
      firing:stage<9&&throttle>.012,engineArmed:stage>=1&&stage<9,fuel:state.fuel,status:state.status,clock};
  }
  return {
    update(seconds){
      if(seconds>0){accumulator+=seconds;let burns=0,steps=0;
        while(accumulator+1e-10>=FIXED_STEP){burns+=tick();steps++;accumulator=Math.max(0,accumulator-FIXED_STEP);}
        if(steps)throttle=burns/steps;
      }
      return sample();
    },
    sample,
    get state(){return state;},get level(){return level;},get lastInput(){return lastInput;},
  };
}

export function nextMissionIndex(profile,levels){
  const next=levels.findIndex(level=>!(profile.wins[level.id]>0));return next<0?0:next;
}
