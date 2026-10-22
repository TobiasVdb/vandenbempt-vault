export const SAVE_KEY='hollow-campaign-v1';
export const UPGRADES={
  engine:{name:'High-flow engine',description:'+18% thrust per tier.',costs:[80,150,240]},
  frame:{name:'Lightweight frame',description:'−8% mass per tier. More acceleration from the same engine.',costs:[70,140,220]},
  rcs:{name:'Upper rotation jets',description:'Top-mounted thrusters. +60% turning torque per tier.',costs:[60,120,200]},
  tank:{name:'Extended fuel tank',description:'+25 fuel capacity per tier.',costs:[60,110,180]},
};
export const SKINS={
  original:{name:'Original livery',cost:0,color:null},
  solar:{name:'Solar orange',cost:70,color:'#e89841'},
  glacier:{name:'Glacier blue',cost:70,color:'#74baca'},
  orchid:{name:'Midnight orchid',cost:100,color:'#9b82ca'},
  pearl:{name:'Pearl white',cost:100,color:'#e5e0d4'},
};
export function newProfile(){return {version:1,coins:0,upgrades:{engine:0,frame:0,rcs:0,tank:0},skins:['original'],skin:'original',wins:{},settled:[]};}
export function sanitizeProfile(value){
  const p=newProfile();if(!value||value.version!==1)return p;
  if(Number.isSafeInteger(value.coins)&&value.coins>=0)p.coins=Math.min(value.coins,1e7);
  for(const [key,definition] of Object.entries(UPGRADES)){
    const tier=value.upgrades?.[key];if(Number.isInteger(tier)&&tier>=0)p.upgrades[key]=Math.min(tier,definition.costs.length);
  }
  p.skins=[...new Set(['original',...(Array.isArray(value.skins)?value.skins.filter(s=>Object.hasOwn(SKINS,s)):[])])];
  if(p.skins.includes(value.skin))p.skin=value.skin;
  if(value.wins&&typeof value.wins==='object')for(const [id,count] of Object.entries(value.wins))if(/^[a-z]+$/.test(id)&&Number.isSafeInteger(count)&&count>0)p.wins[id]=count;
  if(Array.isArray(value.settled))p.settled=value.settled.filter(id=>typeof id==='string'&&id.length<100).slice(-200);
  return p;
}
export function flightTuning(profile=newProfile()){
  const u=profile.upgrades,mass=1-u.frame*.08;
  return {thrust:10*(1+u.engine*.18)/mass,turnPower:2.9*(1+u.rcs*.6),capacity:100+u.tank*25,rcs:u.rcs,mass};
}
export function buyUpgrade(profile,key){
  if(!Object.hasOwn(UPGRADES,key))return {ok:false,reason:'Unknown upgrade.'};
  const tier=profile.upgrades[key],cost=UPGRADES[key].costs[tier];
  if(cost===undefined)return {ok:false,reason:'Already at maximum tier.'};
  if(profile.coins<cost)return {ok:false,reason:`Earn ${cost-profile.coins} more coins.`};
  profile.coins-=cost;profile.upgrades[key]++;return {ok:true,cost};
}
export function buySkin(profile,key){
  if(!Object.hasOwn(SKINS,key))return {ok:false,reason:'Unknown paint finish.'};
  if(profile.skins.includes(key)){profile.skin=key;return {ok:true,cost:0};}
  const cost=SKINS[key].cost;if(profile.coins<cost)return {ok:false,reason:`Earn ${cost-profile.coins} more coins.`};
  profile.coins-=cost;profile.skins.push(key);profile.skin=key;return {ok:true,cost};
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
