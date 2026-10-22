// Flight-space coordinates are metres; the rendered cavern uses these same surfaces.
export const LEVELS = [
  {
    name: 'Amber Hollow', subtitle: 'A first flight through the sandstone.', difficulty: '01 / INTRODUCTION',
    floor: [[-26,-8],[-11,-8],[-7,-4.4],[-3,-5.2],[1,-8],[8,-8],[11,-5.7],[15,-8],[26,-8]],
    roof: [[-26,7],[-21,9],[-12,8.5],[-5,5.2],[1,6.6],[9,9.8],[17,8.2],[26,6.5]],
    pads: [{x:-19,y:-7.65,width:5,type:'launch'},{x:20,y:-7.65,width:5,type:'goal'}],
  },
  {
    name: 'The Narrows', subtitle: 'Hold your line beneath the hanging rock.', difficulty: '02 / PRECISION',
    floor: [[-26,-8],[-13,-8],[-9,-5],[-4,-4.6],[1,-7.8],[6,-7.8],[10,-5],[14,-8],[26,-8]],
    roof: [[-26,8],[-17,9],[-10,6],[-5,2],[0,1.4],[4,6.8],[11,8],[18,6.5],[26,8]],
    pads: [{x:-19,y:-7.65,width:5,type:'launch'},{x:20,y:-7.65,width:4,type:'goal'}],
  },
  {
    name: 'Cinder Passage', subtitle: 'One careful crossing. One small landing pad.', difficulty: '03 / ENDURANCE',
    floor: [[-26,-8],[-14,-8],[-10,-3],[-7,-1.4],[-3,-6],[3,-7.8],[7,-4.5],[11,-4.5],[15,-8],[26,-8]],
    roof: [[-26,9],[-18,10],[-11,8],[-5,6.6],[0,1.6],[4,1.1],[9,6.6],[16,8.5],[26,6]],
    pads: [{x:-20,y:-7.65,width:5,type:'launch'},{x:20,y:-7.65,width:3.5,type:'goal'}],
  },
];

const caveRoutes = [
  [[-19,-1],[-11,.7],[-5,.7],[6,.7],[14,.7],[20,0]],
  [[-19,-1],[-12,0],[-6,-1],[0,-1],[6,-1],[13,0],[20,0]],
  [[-20,0],[-13,2],[-7,2.3],[-3,1],[2,-2],[6,-1],[11,-1],[17,0],[20,0]],
];
LEVELS.forEach((level,i)=>Object.assign(level,{id:['amber','narrows','cinder'][i],planet:'Aurelia',gravity:4,reward:80+i*20,objective:'land',route:caveRoutes[i],theme:'sandstone'}));
const flatFloor=[[-26,-8],[-12,-8],[-5,-7.7],[5,-7.7],[12,-8],[26,-8]];
const openRoof=[[-26,12],[26,12]];
const pads=()=>[{x:-19,y:-7.65,width:5,type:'launch'},{x:20,y:-7.65,width:5,type:'goal'}];
const landRoute=[[-19,-1],[-9,0],[1,0],[11,0],[20,0]];
LEVELS.push(
  {id:'rings',name:'Knife-edge Sprint',planet:'Nix',difficulty:'04 / HORIZONTAL GATE',subtitle:'Turn nose-first through the final ring. No landing.',theme:'ice',gravity:.65,reward:120,objective:'rings',floor:flatFloor,roof:openRoof,pads:[pads()[0]],rings:[{x:18,y:1.5,radius:2.6,horizontal:true}],route:[[-19,6],[-8,8],[6,8]],brief:'Microgravity sprint. Climb before pitching over. Cross the ring from left to right, nose horizontal (within 25°), with the whole hull inside it. No landing required.'},
  {id:'moon',name:'Silver Sea',planet:'Selene',difficulty:'05 / LOW GRAVITY',subtitle:'Long coasts over a quiet moon.',theme:'moon',gravity:1.6,reward:110,objective:'land',floor:flatFloor,roof:openRoof,pads:pads(),route:landRoute,brief:'Gravity is 0.40× Aurelia. Thrust gently, then coast. Beat both rivals to a controlled landing.'},
  {id:'heavy',name:'Ironfall',planet:'Ferrum',difficulty:'06 / HEAVY GRAVITY',subtitle:'A heavy world. Every burn matters.',theme:'volcanic',gravity:7,reward:140,objective:'land',floor:flatFloor,roof:openRoof,pads:pads(),route:landRoute,brief:'Gravity is 1.75× Aurelia. You need longer burns to stay up. Engine and lightweight-frame upgrades improve thrust to weight.'},
  {id:'water',name:'Pelagic Run',planet:'Neridia',difficulty:'07 / SUBMERGED',subtitle:'Buoyancy, water resistance, and a bubble trail.',theme:'water',gravity:4,buoyancy:2.7,drag:.65,verticalDrag:.65,engineScale:.78,reward:140,objective:'land',floor:flatFloor,roof:openRoof,pads:pads(),route:landRoute,brief:'Fully submerged. Buoyancy offsets gravity, but water drag resists every manoeuvre. Your exhaust becomes a bubble trail. Land on the seabed platform.'},
  {id:'clouds',name:'Milkglass Banks',planet:'Cirra',difficulty:'08 / CLOUD DRAG',subtitle:'Dense cloud banks steal your speed.',theme:'clouds',gravity:4,reward:130,objective:'rings',floor:flatFloor,roof:openRoof,pads:[pads()[0]],clouds:[{x:-3,y:1,rx:4,ry:3,drag:1.6},{x:9,y:1.8,rx:3.2,ry:3.5,drag:1.2}],rings:[{x:-3,y:1,radius:2.8},{x:9,y:1.8,radius:2.8},{x:20,y:0,radius:2.8}],route:[[-19,0],[-8,1],[-3,1],[4,1.8],[9,1.8],[15,0]],brief:'Fly through all three gates in order. White cloud volumes add real drag: carry momentum in, and burn to get out. These gates accept any ship orientation.'},
  {id:'wind',name:'Against the Gale',planet:'Aeolis',difficulty:'09 / SEVERE HEADWIND',subtitle:'A relentless 9 m/s wind from the finish.',theme:'storm',gravity:4,wind:-9,drag:.28,verticalDrag:.09,reward:150,objective:'land',floor:flatFloor,roof:openRoof,pads:pads(),route:landRoute,brief:'A 9 m/s headwind blows left. Tilt into it to make progress and compensate during landing. Dust streaks show the wind direction.'},
  {id:'dark',name:'The Unlit',planet:'Umbra',difficulty:'10 / BLACKOUT',subtitle:'Fog, engine glow, and distant navigation beacons.',theme:'dark',gravity:3.2,reward:160,objective:'land',floor:flatFloor,roof:[[-26,10],[-10,9],[0,7],[10,9],[26,10]],pads:pads(),route:landRoute,brief:'No ambient light. Navigate by your lamps, the rivals’ lights, and engine flames. Short burns reveal the nearby rock through the fog. The green navigation beacons mark your landing pad.'},
  {id:'orbit',name:'Above the Air',planet:'Kepler',difficulty:'11 / ORBITAL INSERTION',subtitle:'Climb out of the thick air. Then build sideways speed.',theme:'orbit',gravity:2.6,planetRadius:120,scaleHeight:13,reward:200,objective:'orbit',floor:[[-100000,-8],[100000,-8]],roof:[],pads:[pads()[0]],route:[],brief:'Climb to 55–100 m above the surface. Dense low air reduces engine output and adds drag. In thin air, turn sideways and reach circular orbital speed. Hold altitude, vertical speed under 1.8 m/s, and 95–115% target orbital speed for 3 seconds. Game distances and speeds are scaled.'},
);
for(const level of LEVELS)if(['ice','moon','volcanic','water','clouds','storm','orbit'].includes(level.theme)){level.openSky=true;level.roof=[];}

export function missionBrief(level){
  return level.brief||'Race Ash and Vesper across the cave. Land upright on green, below 2.2 m/s downward and 1.7 m/s sideways. First to finish earns coins.';
}

export function terrainSolids(level) {
  const solids = [];
  for (const [points, edge] of [[level.floor,-20],[level.roof,20]]) {
    for (let i=1;i<points.length;i++) {
      const a=points[i-1], b=points[i];
      solids.push([a,b,[b[0],edge],[a[0],edge]]);
    }
  }
  if(level.objective!=='orbit')solids.push([[-28,-20],[-25,-20],[-25,20],[-28,20]],[[25,-20],[28,-20],[28,20],[25,20]]);
  return solids;
}

export function surfaceAt(points, x) {
  for (let i=1;i<points.length;i++) {
    const a=points[i-1], b=points[i];
    if (x>=a[0] && x<=b[0]) return a[1]+(b[1]-a[1])*(x-a[0])/(b[0]-a[0]);
  }
  return points[0][1];
}
