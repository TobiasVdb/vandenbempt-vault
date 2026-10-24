import {FIXED_STEP,stepFlight} from './physics.js';
import {terrainSolids} from './levels.js';

const angleDifference=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
const terminal=state=>['crashed','landed','finished','orbiting'].includes(state.status);

/** Local visual preview only. Authoritative state, damage and results remain untouched. */
export function createFlightPrediction(){
  let predicted=null,output=null,level=null,hull=null,received=0,accumulator=0,ack=-1,latest=-1;
  let commands=[],solids=[],offset={x:0,y:0,angle:0},offsetVelocity={x:0,y:0};
  function sample(){
    const fraction=terminal(predicted)?0:accumulator;
    return {...predicted,x:predicted.x+predicted.vx*fraction+offset.x,y:predicted.y+predicted.vy*fraction+offset.y,angle:predicted.angle+predicted.omega*fraction+offset.angle,
      vx:predicted.vx+offsetVelocity.x,vy:predicted.vy+offsetVelocity.y};
  }
  function advance(input,seconds){
    while(seconds>1e-8){const dt=Math.min(seconds,FIXED_STEP);predicted.worldTime=(predicted.worldTime||0)+dt;stepFlight(predicted,input,level,hull,dt,solids);seconds-=dt;}
  }
  return {
    reset(){predicted=output=null;commands=[];offset={x:0,y:0,angle:0};offsetVelocity={x:0,y:0};accumulator=0;ack=latest=-1;},
    command(sequence,input,now){
      if(sequence<=latest)return;latest=sequence;commands.push({sequence,input:{...input},at:now});
      commands=commands.slice(-32);
    },
    receive(state,sequence,now,mission,collisionHull){
      // Older servers remain usable without enabling an unacknowledged preview.
      if(!Number.isSafeInteger(sequence)){predicted=output=null;return;}
      if(sequence<ack)return;ack=sequence;if(level!==mission)solids=terrainSolids(mission);level=mission;hull=collisionHull;received=now;accumulator=0;
      commands=commands.filter(command=>command.sequence>ack);
      predicted=structuredClone(state);
      if(!terminal(state))for(let i=0;i<commands.length;i++){
        const start=Math.max(now-.25,commands[i].at),end=commands[i+1]?.at??now;
        if(end>start)advance(commands[i].input,end-start);
      }
      const snap=!output||terminal(state)||Math.hypot(output.x-predicted.x,output.y-predicted.y)>3;
      offset=snap?{x:0,y:0,angle:0}:{x:output.x-predicted.x,y:output.y-predicted.y,angle:angleDifference(output.angle,predicted.angle)};
      offsetVelocity=snap?{x:0,y:0}:{x:output.vx-predicted.vx,y:output.vy-predicted.vy};
      output=sample();
    },
    update(input,now,dt){
      if(!predicted)return null;
      // Never invent continued flight through a lost stream or a suspended tab.
      if(now-received<=.25&&!terminal(predicted)){
        accumulator+=Math.min(Math.max(0,dt),.08);
        while(accumulator>=FIXED_STEP){advance(input,FIXED_STEP);accumulator-=FIXED_STEP;}
      }else if(now-received>.25){predicted.thrust=0;predicted.rcsTurn=0;predicted.translation={x:0,y:0};}
      // Preserve translation velocity across snapshots, then settle the correction with
      // a critically damped spring. An exponential position reset changes speed abruptly.
      const seconds=Math.max(0,dt),frequency=18,decay=Math.exp(-frequency*seconds);
      for(const axis of ['x','y']){
        const motion=offsetVelocity[axis]+frequency*offset[axis];
        offset[axis]=(offset[axis]+motion*seconds)*decay;
        offsetVelocity[axis]=(offsetVelocity[axis]-frequency*motion*seconds)*decay;
      }
      offset.angle*=Math.exp(-seconds/.06);
      output=sample();
      return output;
    },
    get state(){return output;},
  };
}
