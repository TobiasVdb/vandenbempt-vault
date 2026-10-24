const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

/** Anticipate the destination during the flip, then tighten as both actors converge. */
export function createMenuCamera(){
  let view=null,arrival=0,previous=null;
  return {
    reset(){view=null;arrival=0;previous=null;},
    update(sample,{width,height,tower,dt=0,instant=false,parked=false}){
      const aspect=width/height,portrait=width<680;
      const arriving=sample.pilot==='autopilot'&&sample.stage>=5&&sample.tripProgress>=.85;
      const blend=1-Math.exp(-Math.max(0,dt)/.35);
      arrival=instant?Number(arriving):arrival+(Number(arriving)-arrival)*blend;
      const base=portrait?8.4:5.4,freeSpan=base+sample.flightBlend*(portrait?.8:1.2)+Math.min(18,Math.abs(sample.verticalSpeed)*1.1);
      const freeX=sample.x-freeSpan*aspect*(portrait?.12+.08*sample.flightBlend:.22)+(portrait?0:clamp(sample.horizontalSpeed*.4,-.45,.45));
      const freeY=parked&&portrait?sample.y+.5-freeSpan*.24:1.8+sample.altitude;
      const left=Math.min(sample.x-1.1,tower.x-.6),right=Math.max(sample.x+1.1,tower.x+.6);
      const low=Math.min(sample.y-1.2,tower.y),high=Math.max(sample.y+1.2,tower.y+3.1);
      const fit=Math.max(base,(high-low)*1.18+1.4,(right-left+1.4)/aspect/.65);
      const span=freeSpan+(fit-freeSpan)*arrival;
      const target={span,x:freeX+((left+right)/2-span*aspect*.15-freeX)*arrival,y:freeY+((low+high)/2-freeY)*arrival};
      if(!view||instant)view=target;
      else{
        if(dt>0&&previous){view.x+=(sample.x-previous.x)*(1-arrival*.5);view.y+=(sample.y-previous.y)*(1-arrival*.5);}
        const zoom=1-Math.exp(-Math.max(0,dt)*(target.span>view.span?3:1.4));
        view.span+=(target.span-view.span)*zoom;view.x+=(target.x-view.x)*blend;view.y+=(target.y-view.y)*blend;
      }
      if(dt>0||instant)previous={x:sample.x,y:sample.y};
      return {...view,width:view.span*aspect};
    },
  };
}
