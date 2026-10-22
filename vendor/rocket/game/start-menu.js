import { nextMissionIndex } from './launch-sequence.js';
import { deleteProfile } from './progression.js';

export function createStartMenu({profile,storage,levels,onPlay,onMission,onDelete,onReset,reducedMotion,onMotion}){
  const root=document.getElementById('start-menu'),missions=document.getElementById('missions-dialog'),confirmation=document.getElementById('delete-profile-dialog');
  const play=document.getElementById('menu-play'),choose=document.getElementById('menu-missions'),status=document.getElementById('menu-status');
  let ready=false;
  const motion=document.getElementById('menu-motion');let paused=reducedMotion;
  function updateMotion(){motion.textContent=paused?'Play display':'Pause display';motion.setAttribute('aria-pressed',String(paused));}
  updateMotion();motion.addEventListener('click',()=>{paused=!paused;onMotion(paused);updateMotion();});
  function refresh(){
    const wins=Object.values(profile.wins).reduce((total,value)=>total+value,0),next=levels[nextMissionIndex(profile,levels)];
    document.getElementById('menu-profile').textContent=`${profile.coins.toLocaleString()} coins · ${wins} race ${wins===1?'win':'wins'}`;
    document.getElementById('menu-next').textContent=`Next flight / ${next.name}`;
    const list=document.getElementById('mission-list');list.replaceChildren();
    for(const [index,level] of levels.entries()){
      const button=document.createElement('button');button.className='mission-row';
      const number=document.createElement('span');number.className='mission-number';number.textContent=String(index+1).padStart(2,'0');
      const body=document.createElement('span'),title=document.createElement('strong'),detail=document.createElement('small');
      title.textContent=level.name;detail.id=`mission-detail-${index}`;detail.textContent=`${level.planet} · ${(level.gravity/4).toFixed(2)}× gravity · ${level.objective==='land'?'Landing race':level.objective==='orbit'?'Orbital insertion':'Ring race'}`;body.append(title,detail);
      const reward=document.createElement('span');reward.className='mission-reward';reward.textContent=`${level.reward} coins`;
      const result=document.createElement('small');result.textContent=profile.wins[level.id]?'Won':'Ready';reward.append(result);
      button.append(number,body,reward);button.setAttribute('aria-label',`Mission ${index+1}: ${level.name}`);button.setAttribute('aria-describedby',detail.id);
      button.addEventListener('click',()=>{missions.close();onMission(index);});list.append(button);
    }
  }
  play.addEventListener('click',()=>onPlay(nextMissionIndex(profile,levels)));
  choose.addEventListener('click',()=>{refresh();missions.showModal();});
  document.getElementById('missions-close').addEventListener('click',()=>missions.close());
  document.getElementById('menu-delete').addEventListener('click',()=>{document.getElementById('delete-error').textContent='';confirmation.showModal();document.getElementById('delete-cancel').focus();});
  document.getElementById('delete-cancel').addEventListener('click',()=>confirmation.close());
  document.getElementById('delete-confirm').addEventListener('click',async()=>{
    const button=document.getElementById('delete-confirm');button.disabled=true;
    try{
      if(!(onReset?await onReset():deleteProfile(storage,profile))){document.getElementById('delete-error').textContent='The profile could not be reset. Nothing has been cleared.';return;}
      confirmation.close();onDelete();refresh();status.textContent='Profile reset. Your next flight starts fresh.';
    }catch(error){document.getElementById('delete-error').textContent=error.message;}finally{button.disabled=false;}
  });
  refresh();
  return {
    refresh,
    show(){root.hidden=false;document.body.classList.add('at-menu');refresh();},
    hide(){root.hidden=true;document.body.classList.remove('at-menu');},
    setReady(value){ready=value;play.disabled=!ready;choose.disabled=!ready;for(const button of document.querySelectorAll('[data-menu-control]'))button.disabled=!ready;status.textContent=ready?'Ready for launch.':'Preparing the fleet…';},
    update(sample){
      const labels={'menu-phase':sample.phase,'menu-altitude':`${sample.altitude.toFixed(1)} m`,'menu-engine':`${Math.round(sample.throttle*100)}%`,
        'menu-step':`${String(sample.step).padStart(2,'0')} / ${sample.totalSteps}`,'menu-route':`Station ${String(sample.station+1).padStart(2,'0')} → Station ${String(sample.destination+1).padStart(2,'0')}`,
        'menu-speed':`${Math.hypot(sample.horizontalSpeed,sample.verticalSpeed).toFixed(1)} m/s`};
      labels['menu-pilot']=sample.pilot==='crashed'?`Scene resets in ${Math.ceil(sample.resetIn)}s`:sample.pilot==='manual'?`Manual control · autopilot in ${Math.ceil(sample.takeoverIn)}s`:sample.pilot==='recovering'?'Autopilot is recovering the flight':'Autopilot · steer to take control';
      for(const [id,value] of Object.entries(labels)){const el=document.getElementById(id);if(el.textContent!==value)el.textContent=value;}
      root.dataset.phase=sample.phase;root.dataset.altitude=sample.altitude.toFixed(3);root.dataset.throttle=sample.throttle.toFixed(3);
      root.dataset.x=sample.x.toFixed(3);root.dataset.angle=sample.angle.toFixed(3);root.dataset.horizontalSpeed=sample.horizontalSpeed.toFixed(3);root.dataset.destination=String(sample.destination+1);
      root.dataset.verticalSpeed=sample.verticalSpeed.toFixed(3);root.dataset.fuel=sample.fuel.toFixed(3);root.dataset.legs=String(sample.legs);
      root.dataset.plumeAir=String(sample.plume.air);root.dataset.plumeGround=String(sample.plume.ground);root.dataset.plumeGroundHeight=sample.plume.maxGroundHeight.toFixed(3);
      root.dataset.plumeObstacleHits=String(sample.plume.obstacleHits);
      root.dataset.pilot=sample.pilot;root.dataset.resetIn=sample.resetIn.toFixed(3);root.dataset.sceneResets=String(sample.resets);
      root.dataset.menuDebris=String(sample.debris);root.dataset.towersDestroyed=String(sample.towersDestroyed);
    },
  };
}
