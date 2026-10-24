// Mission equipment is independent of the pilot's purchased rocket and upgrades.
export const POD_HULL = [[-.24,-.34],[.24,-.34],[.34,-.24],[.34,.24],[.24,.34],[-.24,.34],[-.34,.24],[-.34,-.24]];
export const POD_TUNING = Object.freeze({thrust:10,turnPower:.18,capacity:100,rcs:0,pod:true});
export const flightHull = (level,hull) => level.controls==='translation'?POD_HULL:hull;
export const missionTuning = (level,tuning) => level.controls==='translation'?{...POD_TUNING}:tuning;
