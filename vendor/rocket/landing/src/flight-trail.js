/** Advance exhaust along the same sampled flight as the hull, even during fast scrolling. */
export function createFlightTrail({duration,emitterAt,effect}){
  let previous=null;
  return {
    advance(progress,dt,level,camera,renderer){
      const time=progress*duration;
      let start=previous??Math.max(0,time-1.1);
      if(time<start-.002||time-start>1.2){
        effect.reset();start=Math.max(0,time-1.1);
      }
      const seconds=Math.max(dt,time-start),steps=Math.max(1,Math.ceil(seconds/.05));
      let before=emitterAt(start/duration);
      for(let i=0;i<steps;i++){
        const end=start+(time-start)*(i+1)/steps,h=seconds/steps,current=emitterAt(end/duration);
        const source={...current,vx:current.inheritVelocity===false?(current.vx??0):h>0?(current.x-before.x)/h:0,vy:current.inheritVelocity===false?(current.vy??0):h>0?(current.y-before.y)/h:0};
        if(source.active)effect.emit('descent',source,h,level);
        effect.update(h,level,camera,renderer,source.firing?[source]:[]);
        before=current;
      }
      previous=time;
    },
  };
}
