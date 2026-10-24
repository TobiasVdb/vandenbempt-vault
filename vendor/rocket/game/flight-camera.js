const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const smooth=value=>value*value*(3-2*value);

export function flightViewHeight(speed,{pod=false,overview=false,aspect=16/9}={}){
  if(overview)return aspect<1?30:Math.min(36,Math.max(28,54/aspect));
  const blend=smooth(clamp((speed-(pod ? .3 : 2))/(pod ? 2 : 7),0,1));
  return (pod?12:22)+blend*(pod?6:8);
}

/** Presentation only: velocity widens the view, never changes flight physics. */
export function createFlightCamera(){
  let view=null;
  return {
    reset(){view=null;},
    update(pose,{aspect=16/9,pod=false,overview=false,openSpace=false,cinematic=false,dt=0}={}){
      const targetHeight=cinematic?Math.max(5.4,4.2/aspect):flightViewHeight(Math.hypot(pose.vx,pose.vy),{pod,overview,aspect});
      if(!view)view={height:targetHeight,x:pose.x,y:pose.y};
      const zoomRate=cinematic?1.2:targetHeight>view.height?1.2:.6;
      view.height+=(targetHeight-view.height)*(1-Math.exp(-Math.max(0,dt)*zoomRate));
      const half=view.height*aspect/2;
      const targetX=cinematic?pose.x+.5:pose.x+clamp(pose.vx*.35,-half*.15,half*.15);
      const x=openSpace?targetX:half>=25?0:clamp(targetX,-25+half,25-half);
      const y=cinematic?pose.y+.35:overview&&!openSpace?0:pose.y+view.height*.1+clamp(pose.vy*.2,-view.height*.1,view.height*.1);
      const follow=1-Math.exp(-Math.max(0,dt)*5);
      view.x+=(x-view.x)*follow;view.y+=(y-view.y)*follow;
      if(dt===0){view.x=x;view.y=y;}
      return {...view,width:view.height*aspect};
    },
  };
}
