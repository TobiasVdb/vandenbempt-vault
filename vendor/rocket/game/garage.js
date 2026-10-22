import { UPGRADES, SKINS, buyUpgrade, buySkin, flightTuning } from './progression.js';

export function createGarage({profile,getGravity,onOpen,onChange,onClose,purchase}){
  const dialog=document.getElementById('garage-dialog'),items=document.getElementById('upgrade-list'),skins=document.getElementById('skin-list'),status=document.getElementById('shop-status');
  function render(){
    document.getElementById('garage-coins').textContent=profile.coins.toLocaleString();
    const tuning=flightTuning(profile);
    document.getElementById('loadout-stats').textContent=`${getGravity()>0?`Vacuum thrust/weight ${(tuning.thrust/getGravity()).toFixed(2)}`:'Zero gravity · manoeuvring jets included'} · Acceleration ${tuning.thrust.toFixed(1)} m/s² · Fuel ${tuning.capacity} · Rotation jets ${profile.upgrades.rcs}/3`;
    items.replaceChildren();skins.replaceChildren();
    for(const [key,definition] of Object.entries(UPGRADES)){
      const tier=profile.upgrades[key],cost=definition.costs[tier],row=document.createElement('div');row.className='shop-row';
      const text=document.createElement('div'),title=document.createElement('strong'),description=document.createElement('p');
      title.textContent=`${definition.name} · ${tier}/3`;description.textContent=definition.description;text.append(title,description);
      const button=document.createElement('button');button.textContent=cost===undefined?'Max tier':`${cost} coins`;button.disabled=cost===undefined||profile.coins<cost;
      button.setAttribute('aria-label',`Upgrade ${definition.name}${cost===undefined?' — maximum tier':` for ${cost} coins`}`);
      button.addEventListener('click',async()=>{button.disabled=true;try{const result=await (purchase?purchase('upgrade',key):buyUpgrade(profile,key));if(result.ok){onChange();status.textContent=`${definition.name} upgraded. Applies on your next launch.`;}}catch(error){status.textContent=error.message;}finally{render();}});
      row.append(text,button);items.append(row);
    }
    for(const [key,definition] of Object.entries(SKINS)){
      const owned=profile.skins.includes(key),button=document.createElement('button');button.className='skin-option';button.setAttribute('aria-pressed',String(profile.skin===key));
      const swatch=document.createElement('span');swatch.className='skin-swatch';swatch.style.background=definition.color||'linear-gradient(90deg,#c84333 50%,#ddd8ca 50%)';
      const name=document.createElement('strong');name.textContent=definition.name;const price=document.createElement('small');price.textContent=profile.skin===key?'Equipped':owned?'Equip':`${definition.cost} coins`;
      button.append(swatch,name,price);button.disabled=!owned&&profile.coins<definition.cost;
      button.addEventListener('click',async()=>{button.disabled=true;try{const result=await (purchase?purchase('skin',key):buySkin(profile,key));if(result.ok){onChange();status.textContent=`${definition.name} equipped for your next launch.`;}}catch(error){status.textContent=error.message;}finally{render();}});skins.append(button);
    }
  }
  document.getElementById('garage').addEventListener('click',()=>{onOpen();status.textContent='Win races to earn coins. Upgrades and paint apply to all five ships.';render();dialog.showModal();});
  document.getElementById('garage-close').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',onClose);
  return {render,isOpen:()=>dialog.open};
}
