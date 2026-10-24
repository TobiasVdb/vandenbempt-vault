// Shared by simulation, upgrades, pilots and HUD: gameplay units are metres and seconds.
export const BASE_GRAVITY=9.8;
export const BASE_THRUST=1000/60;
export const LINEAR_DAMPING=1.1;
export const ENGINE_THRUST_PER_TIER=.08;
export const FRAME_MASS_PER_TIER=.03;
export const LANDING_LIMITS=Object.freeze({vertical:4,horizontal:2.2,angle:15*Math.PI/180});
