import { convexHull, worldHull } from './physics.js';
import { applyImpact } from './damage.js';

/** Menu structures use the same XY projection as the spacecraft's gameplay hull. */
export function projectStructure(box){
  const points=[];
  for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1]){
    const signs=[x,y,z];let px=box.x,py=box.y;
    for(let axis=0;axis<3;axis++){px+=signs[axis]*box.half[axis]*box.axes[axis*3];py+=signs[axis]*box.half[axis]*box.axes[axis*3+1];}
    points.push([px,py]);
  }
  return convexHull(points);
}

/** Resolve a static tower contact before its damaged structure becomes debris. */
export function collideMenuTower(state,hull,structure){
  if(!['ready','flying'].includes(state.status))return null;
  const body=worldHull(state,hull);let depth=Infinity,nx=0,ny=0;
  for(const polygon of [body,structure])for(let i=0;i<polygon.length;i++){
    const p=polygon[i],q=polygon[(i+1)%polygon.length],length=Math.hypot(q[0]-p[0],q[1]-p[1]);
    if(length<1e-8)continue;
    const x=(p[1]-q[1])/length,y=(q[0]-p[0])/length;
    const a=body.map(v=>v[0]*x+v[1]*y),b=structure.map(v=>v[0]*x+v[1]*y);
    const forward=Math.max(...a)-Math.min(...b),backward=Math.max(...b)-Math.min(...a);
    if(forward<=0||backward<=0)return null;
    if(Math.min(forward,backward)<depth){depth=Math.min(forward,backward);const sign=forward<backward?-1:1;nx=x*sign;ny=y*sign;}
  }
  if(!Number.isFinite(depth))return null;
  const support=Math.min(...body.map(p=>p[0]*nx+p[1]*ny)),points=body.filter(p=>p[0]*nx+p[1]*ny-support<.02);
  const point={x:points.reduce((sum,p)=>sum+p[0],0)/points.length,y:points.reduce((sum,p)=>sum+p[1],0)/points.length};
  const rx=point.x-state.x,ry=point.y-state.y,closing=(state.vx-state.omega*ry)*nx+(state.vy+state.omega*rx)*ny;
  const speed=Math.max(0,-closing);
  applyImpact(state,speed,point,'Spacecraft destroyed against a service tower.');
  state.x+=nx*(depth+.0001);state.y+=ny*(depth+.0001);
  if(closing<0){state.vx-=closing*1.2*nx;state.vy-=closing*1.2*ny;state.omega*=.65;}
  return {speed,point};
}
