import {FIXED_STEP,stepFlight} from './physics.js';
import {terrainSolids} from './levels.js';

const angleDifference=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
const terminal=state=>['crashed','landed','finished','orbiting'].includes(state.status);

/** Local visual preview only. Authoritative state, damage and results remain untouched. */
export function createFlightPrediction(){
  let predicted=null,output=null,level=null,hull=null,received=0,accumulator=0,ack=-1,latest=-1;
  let commands=[],solids=[],offset={x:0,y:0,angle:0},offsetVelocity={x:0,y:0};
  let clockOffset=null,renderedAt=null,verticalAcceleration=0,acknowledgedInput={thrust:false,turn:0};
  function sample(){
    const fraction=terminal(predicted)?0:accumulator;
    return {...predicted,x:predicted.x+predicted.vx*fraction+offset.x,y:predicted.y+predicted.vy*fraction+verticalAcceleration*fraction*fraction/2+offset.y,angle:predicted.angle+predicted.omega*fraction+offset.angle,
      vx:predicted.vx+offsetVelocity.x,vy:predicted.vy+verticalAcceleration*fraction+offsetVelocity.y};
  }
  function advance(input,seconds){
    while(seconds>1e-8){const dt=Math.min(seconds,FIXED_STEP),vy=predicted.vy;predicted.worldTime=(predicted.worldTime||0)+dt;stepFlight(predicted,input,level,hull,dt,solids);verticalAcceleration=(predicted.vy-vy)/dt;seconds-=dt;}
  }
  return {
    reset(){predicted=output=null;commands=[];offset={x:0,y:0,angle:0};offsetVelocity={x:0,y:0};accumulator=0;ack=latest=-1;clockOffset=renderedAt=null;verticalAcceleration=0;acknowledgedInput={thrust:false,turn:0};},
    command(sequence,input,now){
      if(sequence<=latest)return;latest=sequence;commands.push({sequence,input:{...input},at:now});
      commands=commands.slice(-32);
    },
    receive(state,sequence,now,mission,collisionHull,simulationTime){
      // Older servers remain usable without enabling an unacknowledged preview.
      if(!Number.isSafeInteger(sequence)){predicted=output=null;return;}
      if(sequence<ack)return;ack=sequence;if(level!==mission)solids=terrainSolids(mission);level=mission;hull=collisionHull;received=now;accumulator=0;
      for(const command of commands)if(command.sequence<=ack)acknowledgedInput=command.input;
      commands=commands.filter(command=>command.sequence>ack);
      predicted=structuredClone(state);
      if(!terminal(state)){
        const target=renderedAt??now;
        let age=0;
        if(state.status==='flying'&&Number.isFinite(simulationTime)){
          // Arrival time is not simulation time. Variable packet delay must not
          // repeatedly rewind an accelerating rocket to an older point in its arc.
          const observedOffset=now-simulationTime;
          clockOffset=Math.min(clockOffset??observedOffset,observedOffset);
          age=Math.min(.15,Math.max(0,target-simulationTime-clockOffset));
        }else clockOffset=null;
        let cursor=Math.min(target-age,Math.max(target-.25,commands[0]?.at??target));
        let held=acknowledgedInput;
        for(const command of commands){
          const start=Math.max(cursor,Math.min(target,command.at));
          if(start>cursor)advance(held,start-cursor);
          cursor=start;held=command.input;
        }
        if(target>cursor)advance(held,target-cursor);
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
      renderedAt=now;
      return output;
    },
    get state(){return output;},
  };
}
