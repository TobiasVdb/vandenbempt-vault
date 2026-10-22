import { environmentAt, orbitalTarget } from './physics.js';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function createPilot({speed=2.4,delay=0}={}){return {waypoint:0,pwm:0,speed,delay};}

/** Feedback control, not a prerecorded path: every command goes through normal flight physics. */
export function pilotInput(pilot,state,level,elapsed){
  if(elapsed<pilot.delay||!['ready','flying'].includes(state.status))return {};
  const env=environmentAt(state,level);
  let ax,ay,desiredAngle;
  if(level.objective==='orbit'){
    if(env.altitude>63&&Math.abs(state.vy)<.8)pilot.orbitBurn=true;
    const trim=clamp((env.altitude-76)*.002+state.vy*.015,0,.16);
    const desiredVx=pilot.orbitBurn?orbitalTarget(state,level)*(.995-trim):0;
    ax=clamp((desiredVx-state.vx)*.85,-1.5,1.5);
    const error=74-env.altitude;
    const desiredVy=clamp(error*.7,-2,Math.min(4,Math.sqrt(Math.max(0,2*env.gravity*error))*.65));
    ay=clamp((desiredVy-state.vy)*1.8,-env.gravity*.85,5);
  }else{
    const pad=level.pads[1];
    const end=level.objective==='land'?[pad.x,pad.y-Math.min(...state.hull.map(p=>p[1]))-.05]:[level.rings.at(-1).x+1,level.rings.at(-1).y];
    const route=[...level.route,end];
    let target=route[Math.min(pilot.waypoint,route.length-1)];
    const preparingLanding=level.objective==='land'&&pilot.waypoint===route.length-2;
    const settled=!preparingLanding||(Math.abs(state.vx)<.35&&Math.abs(state.vy)<.4);
    if(Math.hypot(target[0]-state.x,target[1]-state.y)<.65&&settled&&pilot.waypoint<route.length-1)target=route[++pilot.waypoint];
    ax=clamp((target[0]-state.x)*.8-state.vx*1.6,-2,2);
    ay=clamp((target[1]-state.y)*1.2-state.vy*1.8,-Math.min(3,env.downward*.75),4);
    if(level.wind&&pilot.waypoint===route.length-1)ay=(clamp((target[1]-state.y)*.7,-.85,.85)-state.vy)*1.8;
    if(env.gravity<2){
      const speed=pilot.speed*Math.sqrt(env.gravity/4);
      const vx=clamp((target[0]-state.x)*.6,-speed,speed);
      ax=clamp((vx-state.vx)*.9,-env.gravity*.6,env.gravity*.6);
      const error=target[1]-state.y;
      const desiredVy=clamp(error*.6,-1.3,Math.min(2,Math.sqrt(Math.max(0,2*env.gravity*error))*.6));
      ay=clamp((desiredVy-state.vy)*1.5,-env.gravity*.85,3);
    }
    if(level.id==='rings'&&pilot.waypoint>=2&&state.x>4){
      desiredAngle=-Math.PI/2;
      const turn=clamp((desiredAngle-state.angle)*8-state.omega*1.7,-1,1);
      return {turn,thrust:state.angle<-1.4&&state.vx<6.5};
    }
  }
  const compensate=level.drag!==undefined||env.cloud>0||level.objective==='orbit';
  const forceX=ax+(compensate?(state.vx-env.wind)*env.drag:0);
  const forceY=Math.max(.12,ay+env.downward+(compensate?state.vy*env.verticalDrag:0));
  desiredAngle=Math.atan2(-forceX,forceY);
  const angleError=Math.atan2(Math.sin(desiredAngle-state.angle),Math.cos(desiredAngle-state.angle));
  const available=state.tuning.thrust*env.engineScale*(state.damage.engine/100);
  const duty=available>0?clamp(Math.hypot(forceX,forceY)/available,0,1):0;
  pilot.pwm+=duty;const thrust=pilot.pwm>=1;if(thrust)pilot.pwm--;
  return {thrust,turn:clamp(angleError*8-state.omega*1.7,-1,1)};
}
