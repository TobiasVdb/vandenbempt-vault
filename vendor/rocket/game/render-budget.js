/** Keep pixel fill bounded, then adjust resolution only after sustained frame pressure. */
export function createRenderBudget(){
  let ceiling=1,scale=1,average=1000/60,slow=0,fast=0;
  return {
    resize(width,height,dpr){ceiling=Math.min(dpr,1.5,Math.sqrt(2073600/(width*height)));scale=1;slow=fast=0;average=1000/60;return ceiling;},
    sample(milliseconds){
      // Ignore suspended/occluded tabs and one-off loading stalls, not continuous gameplay.
      if(milliseconds>100||milliseconds<4){slow=fast=0;return null;}
      average+=(milliseconds-average)*.08;
      slow=average>18.5?slow+1:0;fast=average<17.2?fast+1:0;
      let next=scale;
      if(slow>=45){next=Math.max(.5,scale*.85);slow=fast=0;}
      else if(fast>=300){next=Math.min(1,scale+.05);slow=fast=0;}
      if(next===scale)return null;scale=next;return ceiling*scale;
    },
  };
}
