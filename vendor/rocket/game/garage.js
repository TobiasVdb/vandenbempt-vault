import { UPGRADES, SKINS, SHIPS, buyUpgrade, buySkin, buyShip, equipShip, flightTuning } from './progression.js';

export function createGarage({profile,onOpen,onChange,onClose,onPreview,purchase,equip}){
  const $=id=>document.getElementById(id),root=$('garage-dialog'),items=$('upgrade-list'),skins=$('skin-list'),status=$('shop-status');
  let opened=false,busy=false,previewShip=profile.ship,previewSkin=profile.skin;
  async function act(action,message){
    if(busy)return;busy=true;render();status.textContent='Saving to your pilot…';
    try{const result=await action();if(!result.ok)throw new Error(result.reason);onChange();status.textContent=message;}
    catch(error){status.textContent=error.message;}finally{busy=false;render();}
  }
  function render(){
    const owned=profile.ownedShips.includes(previewShip),loadout=profile.loadouts[previewShip],ship=SHIPS[previewShip],tuning=flightTuning(profile,previewShip);
    $('garage-coins').textContent=profile.coins.toLocaleString();
    $('garage-model').value=previewShip;$('garage-model').disabled=busy;
    $('garage-model-name').textContent=ship.name;
    $('garage-model-state').textContent=owned?'Your spacecraft · engines off':'Showroom model · engines off';
    $('loadout-stats').textContent=`Thrust ${tuning.thrust.toFixed(1)} m/s² · Fuel ${tuning.capacity} · Rotation jets ${loadout.upgrades.rcs}/3`;
    const modelButton=$('garage-model-action');modelButton.textContent=!owned?`Buy ${ship.name} · ${ship.cost} coins`:profile.ship===previewShip?'Equipped for flight':`Equip ${ship.name}`;
    modelButton.disabled=busy||owned&&profile.ship===previewShip||!owned&&profile.coins<ship.cost;
    $('garage-ownership').textContent=owned?'Upgrades and paint belong to this model.':`Earn ${Math.max(0,ship.cost-profile.coins)} more coins to own this model. Preview its paint below.`;
    items.replaceChildren();skins.replaceChildren();
    for(const [key,definition] of Object.entries(UPGRADES)){
      const tier=loadout.upgrades[key],cost=definition.costs[tier],row=document.createElement('div');row.className='shop-row';
      const text=document.createElement('div'),title=document.createElement('strong'),description=document.createElement('p'),button=document.createElement('button');
      title.textContent=`${definition.name} · ${tier}/3`;description.textContent=definition.description;text.append(title,description);
      button.textContent=cost===undefined?'Max tier':`${cost} coins`;button.disabled=busy||!owned||cost===undefined||profile.coins<cost;
      button.setAttribute('aria-label',`Upgrade ${ship.name} ${definition.name}${cost===undefined?' — maximum tier':` for ${cost} coins`}`);
      button.addEventListener('click',()=>act(()=>purchase?purchase('upgrade',key,previewShip):buyUpgrade(profile,key,previewShip),`${ship.name}: ${definition.name} fitted.`));row.append(text,button);items.append(row);
    }
    for(const [key,definition] of Object.entries(SKINS)){
      const button=document.createElement('button');button.className='skin-option';button.disabled=busy;button.setAttribute('aria-pressed',String(previewSkin===key));
      const swatch=document.createElement('span'),name=document.createElement('strong'),price=document.createElement('small');swatch.className='skin-swatch';swatch.style.background=definition.color||'linear-gradient(90deg,#c84333 50%,#ddd8ca 50%)';
      name.textContent=definition.name;price.textContent=loadout.skin===key?'Equipped':loadout.skins.includes(key)?'Owned':`${definition.cost} coins`;
      button.append(swatch,name,price);button.addEventListener('click',()=>{previewSkin=key;render();});skins.append(button);
    }
    const finish=SKINS[previewSkin],paintOwned=loadout.skins.includes(previewSkin),paintButton=$('garage-paint-action');
    paintButton.textContent=loadout.skin===previewSkin?'Paint equipped':paintOwned?'Equip paint':`Buy paint · ${finish.cost} coins`;
    paintButton.disabled=busy||!owned||loadout.skin===previewSkin||!paintOwned&&profile.coins<finish.cost;
    if(opened)onPreview(previewShip,finish.color,tuning);
  }
  for(const [id,ship] of Object.entries(SHIPS)){const option=document.createElement('option');option.value=id;option.textContent=ship.name;$('garage-model').append(option);}
  $('garage-model').addEventListener('change',()=>{previewShip=$('garage-model').value;previewSkin=profile.loadouts[previewShip].skin;status.textContent='Previewing this model. Paint and performance save separately for each spacecraft.';render();});
  $('garage-model-action').addEventListener('click',()=>act(()=>profile.ownedShips.includes(previewShip)?equip?equip(previewShip):equipShip(profile,previewShip):purchase?purchase('ship',previewShip):buyShip(profile,previewShip),`${SHIPS[previewShip].name} equipped for your next flight.`));
  $('garage-paint-action').addEventListener('click',()=>act(()=>purchase?purchase('skin',previewSkin,previewShip):buySkin(profile,previewSkin,previewShip),`${SKINS[previewSkin].name} applied to ${SHIPS[previewShip].name}.`));
  async function open(){
    if(opened)return;opened=true;previewShip=profile.ship;previewSkin=profile.skin;root.hidden=false;busy=true;render();
    try{await onOpen();status.textContent='Choose a spacecraft. Try a paint finish on the model before buying.';}
    catch(error){status.textContent=error.message;}finally{busy=false;render();$('garage-close').focus();}
  }
  function close(){if(busy)return;opened=false;root.hidden=true;onClose();}
  for(const id of ['garage','menu-garage'])$(id).addEventListener('click',open);
  $('garage-close').addEventListener('click',close);
  return {render,isOpen:()=>opened,close};
}
