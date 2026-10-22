const API=new URL('../api/',import.meta.url);
export const PLAYER_KEY='hollow-player-v1';

export function createOnline({storage,onProfile,onRace,onStatus,onJoin,getShip,isReady}){
  const $=id=>document.getElementById(id),identityDialog=$('pilot-dialog'),status=$('lobby-status');
  let identity=null,player=null,room=null,connected=false,stream=null,stopped=false,retryTimer=null,joinBusy=false,inputBusy=false,pendingInput=null,inputTimer=null,lastInputAt=-Infinity;
  let resolveReady;const ready=new Promise(resolve=>resolveReady=resolve);
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
  function applyPlayer(value){player=value;onProfile(value.profile);$('pilot-name').textContent=value.name;}
  function message(name,text,invite=null){
    const row=document.createElement('li'),label=document.createElement('strong');label.textContent=name;row.append(label,document.createTextNode(` ${text}`));
    if(invite){const button=document.createElement('button');button.textContent='Join game';button.addEventListener('click',()=>join({room:invite}).then(onJoin).catch(error=>status.textContent=error.message));row.append(button);}
    const list=$('chat-log');list.append(row);while(list.children.length>40)list.firstChild.remove();list.scrollTop=list.scrollHeight;
  }
  function event(value){
    if(value.type==='connected'){connected=true;applyPlayer(value.player);status.textContent='Connected · all games are free to join';onStatus(true);resolveReady();}
    if(value.type==='profile')applyPlayer(value.player);
    if(value.type==='lobby'){
      $('online-count').textContent=`${value.players.length} online`;
      const list=$('room-list');list.replaceChildren();
      if(!value.rooms.length){const item=document.createElement('p');item.textContent='No games yet. Play a mission or invite someone.';list.append(item);}
      for(const game of value.rooms){
        const row=document.createElement('div'),text=document.createElement('span'),button=document.createElement('button');
        text.textContent=`${game.name} · ${game.players}/${game.capacity}`;button.textContent=game.id===room?.id?'In game':'Join game';button.disabled=game.players>=game.capacity||!isReady();
        button.addEventListener('click',()=>join({room:game.id}).then(onJoin).catch(error=>status.textContent=error.message));row.append(text,button);list.append(row);
      }
      const pilots=$('pilot-list');pilots.replaceChildren();
      for(const pilot of value.players){const item=document.createElement('span');item.textContent=pilot.name;pilots.append(item);}
    }
    if(value.type==='race'){room=value.room;onRace(room,player.id);}
    if(value.type==='left')room=null;
    if(value.type==='notice')status.textContent=value.message;
    if(value.type==='chat')message(value.name,value.text);
    if(value.type==='invite')message(value.name,`invites you to ${value.mission}.`,value.room);
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
      if(stopped)return;connected=false;onStatus(false);status.textContent='Disconnected · reconnecting. Flight inputs have been released.';
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
  $('chat-form').addEventListener('submit',async e=>{
    e.preventDefault();const input=$('chat-input'),button=$('chat-send');button.disabled=true;
    try{await request('chat',{text:input.value});input.value='';}catch(error){status.textContent=error.message;}finally{button.disabled=false;}
  });
  $('lobby-invite').addEventListener('click',async()=>{
    const button=$('lobby-invite');button.disabled=true;
    try{await join({mission:$('lobby-mission').value,create:true});await request('invite',{});
      const url=new URL(location.href);url.search='';url.searchParams.set('room',room.id);const link=$('invite-link');link.value=url.href;link.hidden=false;link.select();status.textContent='Invitation sent. Copy the link, or use Join game to launch.';
    }catch(error){status.textContent=error.message;}finally{button.disabled=false;}
  });
  $('lobby-join').addEventListener('click',()=>join(room?{room:room.id}:{mission:$('lobby-mission').value}).then(onJoin).catch(error=>status.textContent=error.message));
  for(const mission of document.querySelectorAll('#course option')){const option=mission.cloneNode(true);$('lobby-mission').append(option);}
  // Mission values are supplied by the caller after the game's course list is populated.
  queueMicrotask(restore);
  return {
    ready,join,
    get player(){return player;},get connected(){return connected;},get room(){return room;},
    async leave(){room=null;if(identity)await request('leave',{});},
    async buy(kind,key){const value=await request('buy',{kind,key});applyPlayer(value.player);return {ok:true};},
    async reset(){const value=await request('reset',{});applyPlayer(value.player);return true;},
    async scores(mission){return (await request(`scores/${mission}`)).scores;},
    sendInput(input){pendingInput=input;flushInput();},
    close(){stopped=true;clearTimeout(retryTimer);clearTimeout(inputTimer);stream?.abort();},
  };
}
