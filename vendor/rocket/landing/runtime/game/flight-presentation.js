/** Smooth sparse authoritative snapshots without changing simulation or collision state. */
export function createFlightPresentation(){
  const actors=new Map();
  return {
    reset(){actors.clear();},
    receive(racers,now){
      const active=new Set(racers.map(r=>r.id));for(const id of actors.keys())if(!active.has(id))actors.delete(id);
      for(const racer of racers){
        const next=racer.state,actor=actors.get(racer.id);
        if(!actor||actor.state.status!==next.status||Math.hypot(actor.pose.x-next.x,actor.pose.y-next.y)>3){
          actors.set(racer.id,{state:next,received:now,pose:{x:next.x,y:next.y,angle:next.angle}});
        }else{actor.state=next;actor.received=now;}
      }
    },
    sample(id,now,dt){
      const actor=actors.get(id);if(!actor)return null;
      const {state,pose}=actor,age=state.status==='flying'?Math.min(.12,Math.max(0,now-actor.received)):0;
      const blend=1-Math.exp(-Math.max(0,dt)/.045),angle=state.angle+state.omega*age;
      pose.x+=(state.x+state.vx*age-pose.x)*blend;pose.y+=(state.y+state.vy*age-pose.y)*blend;
      pose.angle+=Math.atan2(Math.sin(angle-pose.angle),Math.cos(angle-pose.angle))*blend;
      return pose;
    },
  };
}
