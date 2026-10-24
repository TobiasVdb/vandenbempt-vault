/** Publish calm instrument readings while retaining actual continuous engine power. */
export function createMenuTelemetry(){
  let clock=null,throttle=0,speed=0,next=0,shown=null;
  return {
    update(sample){
      const airspeed=Math.hypot(sample.horizontalSpeed,sample.verticalSpeed),dt=clock===null?0:sample.clock-clock;
      if(clock===null||dt<0){throttle=sample.throttle;speed=airspeed;next=sample.clock;shown=null;}
      else{throttle+=(sample.throttle-throttle)*(1-Math.exp(-dt/.18));speed+=(airspeed-speed)*(1-Math.exp(-dt/.25));}
      clock=sample.clock;
      if(!shown||clock>=next){shown={throttle,airspeed:speed};next=clock+.15;}
      return shown;
    },
  };
}
