const API=new URL('../api/',import.meta.url);
export const PLAYER_KEY='hollow-player-v1';

export function createOnline({storage,onProfile,onRace,onStatus,onJoin,getShip,getMission,isReady}){
  const $=id=>document.getElementById(id),identityDialog=$('pilot-dialog'),status=$('lobby-status');
  let identity=null,player=null,room=null,connected=false,stream=null,stopped=false,retryTimer=null,joinBusy=false,inputBusy=false,pendingInput=null,inputTimer=null,lastInputAt=-Infinity;
  let resolveReady;const ready=new Promise(resolve=>resolveReady=resolve);
  let lobby=null,busy=false,invitation=null;
  try{identity=JSON.parse(storage?.getItem(PLAYER_KEY)||'null');}catch{/* A malformed identity requires a new pilot. */}
  async function request(route,data){
    const response=await fetch(new URL(route,API),{method:data===undefined?'GET':'POST',headers:{...(identity?.token?{Authorization:`Bearer ${identity.token}`} :{}),...(data!==undefined?{'Content-Type':'application/json'}:{})},body:data===undefined?undefined:JSON.stringify(data),signal:AbortSignal.timeout(12000)});
    const value=await response.json();if(!response.ok)throw Object.assign(new Error(value.error||'Connection failed.'),{status:response.status});return value;
  }
  function flushInput(){
    if(inputBusy||!connected||!room||!pendingInput)return;
    const delay=40-(performance.now()-lastInputAt);
    if(delay>0){clearTimeout(inputTimer);inputTimer=setTimeout(flushInput,delay);return;}
    const input=pendingInput;pendingInput=null;inputBusy=true;lastInputAt=performance.now();
    request('input',input).catch(error=>{if(error.status!==429)status.textContent=error.message;}).finally(()=>{inputBusy=false;flushInput();});
  }
  function applyPlayer(value){player=value;onProfile(value.profile);}
  function renderLobby(){
    const list=$('pilot-list'),focused=document.activeElement?.dataset.lobbyAction;list.replaceChildren();list.setAttribute('aria-busy',String(busy));
    $('online-count').textContent=connected&&lobby?`${lobby.players.length} online`:connected?'Connecting':'Reconnecting';
    if(!connected||!lobby){const item=document.createElement('li');item.className='lobby-empty';item.textContent=connected?'Finding online pilots…':'Reconnecting to pilots…';list.append(item);return;}
    const games=new Map(lobby.rooms.map(game=>[game.id,game]));
    const pilots=[...lobby.players].sort((a,b)=>(b.id===player.id)-(a.id===player.id)||a.name.localeCompare(b.name));
    for(const pilot of pilots){
      const self=pilot.id===player.id,game=games.get(pilot.room),row=document.createElement('li'),text=document.createElement('div'),name=document.createElement('strong'),detail=document.createElement('span');
      name.textContent=pilot.name;detail.textContent=`${self?'You · ':''}${pilot.room?`In game${game?` · ${game.name}`:''}`:'In menu'}`;text.append(name,detail);row.append(text);
      if(!self){
        const button=document.createElement('button'),full=game&&game.players>=game.capacity;
        button.textContent=pilot.room?full?'Full':'Join':'Invite';button.disabled=busy||!isReady()||Boolean(pilot.room&&(!game||full));button.dataset.lobbyAction=pilot.id;
        button.setAttribute('aria-label',pilot.room?`Join ${pilot.name}${game?` in ${game.name}`:''}`:`Invite ${pilot.name}`);
        button.title=pilot.room?`Join ${pilot.name}'s game`:`Invite ${pilot.name} to ${getMission().name}`;
        button.addEventListener('click',()=>pilot.room?joinPilot(pilot.room):invitePilot(pilot));row.append(button);
      }
      list.append(row);
    }
    if(pilots.every(pilot=>pilot.id===player.id)){const item=document.createElement('li');item.className='lobby-empty';item.textContent='No other pilots online.';list.append(item);}
    if(focused)list.querySelector(`[data-lobby-action="${focused}"]`)?.focus();
  }
  function renderInvitation(){
    const panel=$('lobby-invitation');panel.replaceChildren();panel.hidden=!invitation;
    if(!invitation)return;
    const text=document.createElement('p'),accept=document.createElement('button'),dismiss=document.createElement('button');
    text.textContent=`${invitation.name} invited you to ${invitation.mission}.`;accept.textContent='Join';accept.disabled=busy||!connected||!isReady();accept.setAttribute('aria-label',`Accept invitation from ${invitation.name}`);
    accept.addEventListener('click',()=>joinPilot(invitation.room));dismiss.textContent='Dismiss';dismiss.disabled=busy;dismiss.addEventListener('click',()=>{invitation=null;renderInvitation();});panel.append(text,accept,dismiss);
  }
  async function act(action){
    if(busy)return;const focused=document.activeElement?.dataset.lobbyAction;busy=true;renderLobby();renderInvitation();
    try{await action();}catch(error){status.textContent=error.message;}finally{busy=false;renderLobby();renderInvitation();if(focused){const button=$('pilot-list').querySelector(`[data-lobby-action="${focused}"]`);if(button?.offsetParent)button.focus();}}
  }
  function joinPilot(id){return act(async()=>{const game=await join({room:id});invitation=null;await onJoin(game);});}
  function invitePilot(pilot){return act(async()=>{
    const game=await join({mission:getMission().id,create:true});
    try{await request('invite',{target:pilot.id});}
    catch(error){
      try{await request('leave',{});room=null;}catch(cleanupError){throw new Error(`${error.message} ${cleanupError.message}`);}
      throw error;
    }
    status.textContent=`Invited ${pilot.name}.`;await onJoin(game);
  });
  }
  function event(value){
    if(value.type==='connected'){connected=true;applyPlayer(value.player);status.textContent='Connected';onStatus(true);resolveReady();renderLobby();renderInvitation();}
    if(value.type==='profile')applyPlayer(value.player);
    if(value.type==='lobby'){
      lobby=value;renderLobby();
    }
    if(value.type==='race'){room=value.room;onRace(room,player.id);}
    if(value.type==='left')room=null;
    if(value.type==='notice')status.textContent=value.message;
    if(value.type==='invite'){invitation=value;renderInvitation();}
  }
  async function connect(){
    if(stopped)return;stream?.abort();stream=new AbortController();
    try{
      const response=await fetch(new URL('events',API),{headers:{Authorization:`Bearer ${identity.token}`},signal:stream.signal});
      if(!response.ok)throw Object.assign(new Error('Could not connect to the lobby.'),{status:response.status});
      const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='';
      while(!stopped){const {done,value}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});let end;
        while((end=buffer.indexOf('\n\n'))!==-1){const block=buffer.slice(0,end);buffer=buffer.slice(end+2);if(block.startsWith('data: '))event(JSON.parse(block.slice(6)));}
      }
      throw new Error('Connection interrupted.');
    }catch(error){
      if(stopped)return;connected=false;onStatus(false);renderLobby();renderInvitation();status.textContent='Disconnected · reconnecting. Flight inputs have been released.';
      if(error.status===401){identityDialog.showModal();$('pilot-error').textContent='This browser identity was not found. Create a new pilot to reconnect.';return;}
      retryTimer=setTimeout(connect,2000);
    }
  }
  async function restore(){
    if(!identity?.id||!identity?.token){identityDialog.showModal();return;}
    try{const result=await request('me');applyPlayer(result.player);connect();}
    catch(error){if(error.status===401){identity=null;identityDialog.showModal();}else{status.textContent=error.message;retryTimer=setTimeout(restore,3000);}}
  }
  $('pilot-form').addEventListener('submit',async e=>{
    e.preventDefault();const button=$('pilot-submit');button.disabled=true;$('pilot-error').textContent='';
    try{
      const value=await request('players',{name:$('pilot-input').value});identity={id:value.id,name:value.name,token:value.token};
      try{storage?.setItem(PLAYER_KEY,JSON.stringify(identity));}catch{$('pilot-error').textContent='Browser storage is blocked. This identity lasts for this session.';}
      applyPlayer(value);identityDialog.close();connect();
    }catch(error){$('pilot-error').textContent=error.message;}finally{button.disabled=false;}
  });
  identityDialog.addEventListener('cancel',e=>e.preventDefault());
  async function join(data){
    if(joinBusy)throw new Error('Joining a game…');if(!isReady())throw new Error('The fleet is still loading.');
    await ready;if(!connected)throw new Error('Reconnect to the lobby before joining.');joinBusy=true;
    try{const result=await request('join',{ship:getShip(),...data});room=result.room;return room;}finally{joinBusy=false;}
  }
  queueMicrotask(restore);
  return {
    ready,join,refreshLobby(){renderLobby();renderInvitation();},
    get player(){return player;},get connected(){return connected;},get room(){return room;},
    async leave(){room=null;if(identity)await request('leave',{});},
    async buy(kind,key,ship){const value=await request('buy',{kind,key,ship});applyPlayer(value.player);return {ok:true};},
    async equip(ship){const value=await request('equip',{ship});applyPlayer(value.player);return {ok:true};},
    async reset(){const value=await request('reset',{});applyPlayer(value.player);return true;},
    async scores(mission){return (await request(`scores/${mission}`)).scores;},
    sendInput(input){pendingInput=input;flushInput();},
    close(){stopped=true;clearTimeout(retryTimer);clearTimeout(inputTimer);stream?.abort();},
  };
}
