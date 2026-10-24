export const SAVE_KEY='hollow-campaign-v1';
export const UPGRADES={
  engine:{name:'High-flow engine',description:'+18% thrust per tier.',costs:[80,150,240]},
  frame:{name:'Lightweight frame',description:'−8% mass per tier. More acceleration from the same engine.',costs:[70,140,220]},
  rcs:{name:'Upper rotation jets',description:'Top-mounted thrusters. Faster steering response and stronger spin braking per tier.',costs:[60,120,200]},
  tank:{name:'Extended fuel tank',description:'+25 fuel capacity per tier.',costs:[60,110,180]},
};
export const SKINS={
  original:{name:'Original livery',cost:0,color:null},
  solar:{name:'Solar orange',cost:70,color:'#e89841'},
  glacier:{name:'Glacier blue',cost:70,color:'#74baca'},
  orchid:{name:'Midnight orchid',cost:100,color:'#9b82ca'},
  pearl:{name:'Pearl white',cost:100,color:'#e5e0d4'},
};
export const SHIP_IDS=['tintin','futurama','comet','wraith','aster'];
export const SHIPS={tintin:{name:'Tintin',cost:160},futurama:{name:'Planet Express',cost:180},comet:{name:'Comet',cost:220},wraith:{name:'Wraith',cost:300},aster:{name:'Aster',cost:0}};
const newLoadout=()=>({upgrades:{engine:0,frame:0,rcs:0,tank:0},skins:['original'],skin:'original'});
function activeLoadout(profile){const loadout=profile.loadouts[profile.ship];profile.upgrades=loadout.upgrades;profile.skins=loadout.skins;profile.skin=loadout.skin;return profile;}
export function newProfile(){return activeLoadout({version:2,coins:0,ship:'aster',ownedShips:['aster'],loadouts:Object.fromEntries(SHIP_IDS.map(id=>[id,newLoadout()])),wins:{},settled:[]});}
export function sanitizeProfile(value){
  const p=newProfile();if(!value||![1,2].includes(value.version))return p;
  if(Number.isSafeInteger(value.coins)&&value.coins>=0)p.coins=Math.min(value.coins,1e7);
  p.ownedShips=[...new Set(['aster',...(value.version===1&&SHIP_IDS.includes(value.ship)?[value.ship]:[]),...(Array.isArray(value.ownedShips)?value.ownedShips.filter(id=>SHIP_IDS.includes(id)):[])])];
  if(p.ownedShips.includes(value.ship))p.ship=value.ship;
  for(const id of SHIP_IDS){
    // Legacy shared purchases remain available on every model; future purchases are independent.
    const source=value.version===1?value:value.loadouts?.[id],loadout=p.loadouts[id];
    for(const [key,definition] of Object.entries(UPGRADES)){
      const tier=source?.upgrades?.[key];if(Number.isInteger(tier)&&tier>=0)loadout.upgrades[key]=Math.min(tier,definition.costs.length);
    }
    loadout.skins=[...new Set(['original',...(Array.isArray(source?.skins)?source.skins.filter(s=>Object.hasOwn(SKINS,s)):[])])];
    if(loadout.skins.includes(source?.skin))loadout.skin=source.skin;
  }
  if(value.wins&&typeof value.wins==='object')for(const [id,count] of Object.entries(value.wins))if(/^[a-z]+$/.test(id)&&Number.isSafeInteger(count)&&count>0)p.wins[id]=count;
  if(Array.isArray(value.settled))p.settled=value.settled.filter(id=>typeof id==='string'&&id.length<100).slice(-200);
  return activeLoadout(p);
}
export function flightTuning(profile=newProfile(),ship=profile.ship){
  const u=profile.loadouts?.[ship]?.upgrades||profile.upgrades,mass=1-u.frame*.08;
  return {thrust:10*(1+u.engine*.18)/mass,turnPower:((100/60)/.396)*(1+u.rcs*.6),capacity:100+u.tank*25,rcs:u.rcs,mass,engineTier:u.engine,frameTier:u.frame,tankTier:u.tank};
}
export function equipShip(profile,ship){
  if(!profile.ownedShips.includes(ship))return {ok:false,reason:'Buy this spacecraft in the garage first.'};
  profile.ship=ship;activeLoadout(profile);return {ok:true,cost:0};
}
export function buyShip(profile,ship){
  if(!Object.hasOwn(SHIPS,ship))return {ok:false,reason:'Unknown spacecraft.'};
  if(profile.ownedShips.includes(ship))return equipShip(profile,ship);
  const cost=SHIPS[ship].cost;if(profile.coins<cost)return {ok:false,reason:`Earn ${cost-profile.coins} more coins.`};
  profile.coins-=cost;profile.ownedShips.push(ship);equipShip(profile,ship);return {ok:true,cost};
}
export function buyUpgrade(profile,key,ship=profile.ship){
  if(!profile.ownedShips.includes(ship))return {ok:false,reason:'Buy this spacecraft first.'};
  if(!Object.hasOwn(UPGRADES,key))return {ok:false,reason:'Unknown upgrade.'};
  const upgrades=profile.loadouts[ship].upgrades,tier=upgrades[key],cost=UPGRADES[key].costs[tier];
  if(cost===undefined)return {ok:false,reason:'Already at maximum tier.'};
  if(profile.coins<cost)return {ok:false,reason:`Earn ${cost-profile.coins} more coins.`};
  profile.coins-=cost;upgrades[key]++;activeLoadout(profile);return {ok:true,cost};
}
export function buySkin(profile,key,ship=profile.ship){
  if(!profile.ownedShips.includes(ship))return {ok:false,reason:'Buy this spacecraft first.'};
  if(!Object.hasOwn(SKINS,key))return {ok:false,reason:'Unknown paint finish.'};
  const loadout=profile.loadouts[ship];
  if(loadout.skins.includes(key)){loadout.skin=key;activeLoadout(profile);return {ok:true,cost:0};}
  const cost=SKINS[key].cost;if(profile.coins<cost)return {ok:false,reason:`Earn ${cost-profile.coins} more coins.`};
  profile.coins-=cost;loadout.skins.push(key);loadout.skin=key;activeLoadout(profile);return {ok:true,cost};
}
/** A settled attempt cannot pay twice; only first place with a completed objective pays. */
export function settleRace(profile,{attemptId,missionId,rank,success,reward}){
  if(!attemptId||profile.settled.includes(attemptId))return 0;
  profile.settled.push(attemptId);profile.settled=profile.settled.slice(-200);
  if(!success||rank!==1||!Number.isInteger(reward)||reward<=0)return 0;
  profile.coins+=reward;profile.wins[missionId]=(profile.wins[missionId]||0)+1;return reward;
}
export function loadProfile(storage){
  try{return {profile:sanitizeProfile(JSON.parse(storage.getItem(SAVE_KEY))),persistent:true};}
  catch{return {profile:newProfile(),persistent:false};}
}
export function saveProfile(storage,profile){try{storage.setItem(SAVE_KEY,JSON.stringify(profile));return true;}catch{return false;}}

/** The caller owns confirmation. Clear this game's save only, preserving the profile object used by UI controllers. */
export function deleteProfile(storage,profile){
  try{if(storage)storage.removeItem(SAVE_KEY);}catch{return false;}
  for(const key of Object.keys(profile))delete profile[key];
  Object.assign(profile,newProfile());return true;
}
