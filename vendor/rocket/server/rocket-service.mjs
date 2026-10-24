import { randomUUID } from 'node:crypto';
import { flightHull } from '../game/pod.js';
import { LEVELS as ALL_LEVELS, PLAYABLE_LEVELS as LEVELS } from '../game/levels.js';
import { createRace, stepRace } from '../game/race.js';
import { createFlight, completed, FIXED_STEP, worldHull, polygonsOverlap } from '../game/physics.js';
import { flightTuning, SKINS } from '../game/progression.js';
import { hasFlightInput } from '../game/controls.js';
import { ARRIVAL_DURATION } from '../game/crew-transfer.js';

const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
const json=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));};
async function body(req){
  if(req.body){if(Buffer.byteLength(JSON.stringify(req.body))>4096)fail(413,'Request too large.');return req.body;}
  let text='';for await(const chunk of req){text+=chunk;if(Buffer.byteLength(text)>4096)fail(413,'Request too large.');}
  try{return JSON.parse(text||'{}');}catch{fail(400,'Invalid JSON.');}
}
const cleanName=value=>typeof value==='string'?value.trim().replace(/\s+/g,' '):'';
const ROOM_CAPACITY=8;

/** Authoritative rooms reuse gameplay physics; only inputs cross the client boundary. */
export function createRocketService({store,hulls,now=Date.now,autoTick=true}){
  const rooms=new Map(),members=new Map(),streams=new Map(),sessions=new Map(),limits=new Map(),pendingResults=new Map();
  let accumulator=0,lastTick=now(),broadcastClock=0,lastLobby=0,onlineJoins=0;
  function limited(key,interval){const time=now();if((limits.get(key)??-Infinity)+interval>time)fail(429,'Please slow down.');limits.set(key,time);}
  function send(res,type,data){if(res.destroyed)return;if(res.writableLength>262144){res.end();return;}res.write(`data: ${JSON.stringify({type,...data})}\n\n`);}
  function to(id,type,data){for(const res of streams.get(id)||[])send(res,type,data);}
  function everyone(type,data){for(const responses of streams.values())for(const res of responses)send(res,type,data);}
  function roomList(){return [...rooms.values()].map(room=>({id:room.id,mission:room.level.id,name:room.level.name,players:room.players.size,capacity:ROOM_CAPACITY}));}
  function lobby(){lastLobby=now();everyone('lobby',{rooms:roomList(),players:[...sessions.values()].filter(player=>streams.has(player.id)).map(player=>({id:player.id,name:player.name,room:members.get(player.id)||null}))});}
  function snapshot(room){return {id:room.id,mission:room.level.id,round:room.round,nextLevelIn:room.nextLevelAt===null?null:Math.max(0,room.nextLevelAt-room.race.elapsed),elapsed:room.race.elapsed,started:room.race.started,contacts:room.race.contacts,
    racers:room.race.racers.map(racer=>({id:racer.id,attemptId:racer.attemptId,inputSequence:racer.inputSequence??null,name:racer.name,ship:racer.ship||'futurama',color:racer.color??null,state:racer.state,hull:racer.hull,finishTime:racer.finishTime,waiting:Boolean(racer.waiting),result:racer.result||null}))};}
  function leave(id){const room=rooms.get(members.get(id));if(!room)return;
    room.players.delete(id);room.race.racers=room.race.racers.filter(racer=>racer.id!==id);members.delete(id);room.touched=now();to(id,'left',{});lobby();
  }
  function spawn(room,racer){
    const pad=room.level.pads[0]||{...room.level.spawn,width:5},half=Math.max(...racer.hull.map(p=>Math.abs(p[0])));
    for(const offset of [0,-.85,.85,-1.7,1.7]){
      if(Math.abs(offset)+half>pad.width/2-.04)continue;racer.state.x=pad.x+offset;
      if(!room.race.racers.some(other=>other!==racer&&!other.waiting&&['ready','flying'].includes(other.state.status)&&polygonsOverlap(worldHull(racer.state,racer.hull),worldHull(other.state,other.hull)))){racer.waiting=false;return;}
    }racer.waiting=true;
  }
  function botRace(level){
    const race=createRace(level,{hull:hulls.aster,bots:[{id:'ash',name:'Ash',hull:hulls.futurama,delay:2.2},{id:'vesper',name:'Vesper',hull:hulls.wraith,delay:3.5}]});
    race.racers.shift();race.multiplayer=true;
    race.racers[0].ship='futurama';race.racers[0].color='#79b4d4';race.racers[1].ship='wraith';race.racers[1].color='#bc8fba';
    return race;
  }
  function createRoom(mission){
    if(rooms.size>=40)fail(503,'All flight lanes are busy. Try again shortly.');
    const level=LEVELS.find(level=>level.id===mission);if(!level)fail(400,'Unknown mission.');
    const race=botRace(level);
    const room={id:randomUUID(),level,race,players:new Map(),finishTimes:new Map(),round:0,nextLevelAt:null,touched:now()};rooms.set(room.id,room);return room;
  }
  function humanRacer(room,player,ship){
    const state=createFlight(room.level,flightHull(room.level,hulls[ship]),flightTuning(player.profile));state.hull=flightHull(room.level,hulls[ship]);
    return {id:player.id,name:player.name,ship,color:SKINS[player.profile.skin].color,state,hull:state.hull,finishTime:null,
      attemptId:randomUUID(),startedAt:null,input:{},inputAt:now(),waiting:false,settling:false};
  }
  function nextRound(room){
    const pilots=[...room.players.values()];
    // Capture unfinished attempts before replacing racer objects; delayed database writes
    // must keep referring to the old round, never the fresh attempt.
    for(const racer of pilots)if(!racer.settling&&!racer.waiting)settle(room,racer);
    room.level=LEVELS[(LEVELS.indexOf(room.level)+1)%LEVELS.length];
    room.race=createRace(room.level);room.race.racers=[];room.race.multiplayer=true;
    room.finishTimes.clear();room.nextLevelAt=null;room.round++;
    room.players.clear();
    for(const previous of pilots){
      const state=createFlight(room.level,hulls[previous.ship],flightTuning(sessions.get(previous.id).profile));state.hull=flightHull(room.level,hulls[previous.ship]);
      const racer={...previous,state,hull:state.hull,finishTime:null,result:null,attemptId:randomUUID(),startedAt:null,input:{},inputAt:now(),waiting:false,settling:false};
      room.race.racers.push(racer);spawn(room,racer);room.players.set(racer.id,racer);
    }
    room.touched=now();lobby();
  }
  async function join(player,data){
    if(!Object.hasOwn(hulls,data.ship))fail(400,'Unknown spacecraft.');
    let room=data.room?rooms.get(data.room):null;
    if(data.room&&!room)fail(404,'That game has ended. Choose another open game.');
    if(!room&&!data.create)room=[...rooms.values()].find(room=>room.level.id===data.mission&&room.players.size<ROOM_CAPACITY&&!room.finishTimes.size&&!room.players.has(player.id));
    if(room?.players.size>=ROOM_CAPACITY&&!room.players.has(player.id))fail(409,'Flight lane full. Other open games are available.');
    const existing=rooms.get(members.get(player.id));
    if(data.restart){
      if(!existing||data.room&&existing!==room)fail(409,'Your game has ended. Join a game to fly again.');
      const previous=existing.players.get(player.id);
      if(completed(previous.state)&&existing.nextLevelAt!==null)return {room:snapshot(existing)};
      if(!previous.settling&&previous.startedAt!==null)settle(existing,previous);
      if(existing.players.size===1){
        existing.race=botRace(existing.level);existing.finishTimes.clear();existing.nextLevelAt=null;existing.round++;
        const racer=humanRacer(existing,player,previous.ship);
        existing.race.racers.unshift(racer);existing.players.set(player.id,racer);spawn(existing,racer);
        return {room:snapshot(existing)};
      }
      const racer=humanRacer(existing,player,previous.ship);
      existing.race.racers=existing.race.racers.map(item=>item===previous?racer:item);
      existing.finishTimes.delete(player.id);existing.players.set(player.id,racer);spawn(existing,racer);
      return {room:snapshot(existing)};
    }
    if(existing===room&&room?.players.has(player.id)&&!data.restart)return {room:snapshot(room)};
    player=await store.equip(player.id,data.ship);to(player.id,'profile',{player});
    // Another join may have taken the last seat while this profile transaction awaited.
    if(room?.players.size>=ROOM_CAPACITY&&!room.players.has(player.id))fail(409,'Flight lane full. Other open games are available.');
    leave(player.id);room ||= createRoom(data.mission);
    if(room.players.size){
      for(const bot of room.race.racers.filter(racer=>racer.pilot))room.finishTimes.delete(bot.id);
      room.race.racers=room.race.racers.filter(racer=>!racer.pilot);
    }
    while(room.race.racers.length>=ROOM_CAPACITY){
      const bot=room.race.racers.find(racer=>racer.pilot);
      if(!bot)fail(409,'Flight lane full. Other open games are available.');
      room.race.racers=room.race.racers.filter(racer=>racer!==bot);room.finishTimes.delete(bot.id);
    }
    const racer=humanRacer(room,player,data.ship);
    room.race.racers.push(racer);spawn(room,racer);room.players.set(player.id,racer);members.set(player.id,room.id);room.touched=now();
    lobby();return {room:snapshot(room)};
  }
  function settle(room,racer){
    racer.settling=true;
    const success=completed(racer.state),rank=success?1+[...room.finishTimes].filter(([id,time])=>id!==racer.id&&time<=racer.finishTime).length:room.race.racers.length;
    const result={attemptId:racer.attemptId,missionId:room.level.id,success,rank,time:Math.max(FIXED_STEP,room.race.elapsed-(racer.startedAt??room.race.elapsed)),reward:room.level.reward};
    // Keep failed writes pending even if the pilot leaves the room during a database outage.
    const pending={racer,result,at:now(),busy:false};pendingResults.set(result.attemptId,pending);writeResult(pending);
  }
  function writeResult(pending){
    const {racer,result}=pending;pending.busy=true;
    Promise.resolve().then(()=>store.record(racer.id,result)).then(player=>{
      pendingResults.delete(result.attemptId);racer.result={...result,coins:result.success&&result.rank===1?result.reward:0};
      sessions.set(player.id,{...player,seen:now()});to(player.id,'profile',{player});to(player.id,'result',{result:racer.result});
    }).catch(()=>{pending.busy=false;pending.at=now()+3000;to(racer.id,'notice',{message:'Result sync delayed. Retrying automatically.'});});
  }
  function tick(seconds){
    accumulator+=Math.min(seconds,.25);
    while(accumulator+1e-10>=FIXED_STEP){
      for(const room of rooms.values()){
        if(!room.players.size)continue;
        const inputs=new Map();let anyThrust=false;
        for(const racer of room.players.values()){
          if(racer.waiting)spawn(room,racer);
          const input=!racer.waiting&&now()-racer.inputAt<700?racer.input:{};
          const active=room.level.controls==='translation'?hasFlightInput(input):Boolean(input.thrust);
          inputs.set(racer.id,input);anyThrust ||= active;
          if(active&&racer.startedAt===null)racer.startedAt=room.race.elapsed;
        }
        stepRace(room.race,{thrust:anyThrust},FIXED_STEP,inputs);
        for(const racer of room.race.racers)if(racer.finishTime!==null)room.finishTimes.set(racer.id,racer.finishTime);
        for(const racer of room.players.values())if(!racer.settling&&!racer.waiting&&(completed(racer.state)||racer.state.status==='crashed'))settle(room,racer);
        if(room.players.size>=2){
          const finishes=[...room.players.values()].filter(racer=>completed(racer.state)).map(racer=>racer.finishTime??room.race.elapsed);
          if(finishes.length)room.nextLevelAt=Math.max(room.nextLevelAt??0,Math.max(...finishes)+ARRIVAL_DURATION+1);
        }
        if(room.nextLevelAt!==null&&room.race.elapsed+1e-9>=room.nextLevelAt)nextRound(room);
      }accumulator=Math.max(0,accumulator-FIXED_STEP);broadcastClock+=FIXED_STEP;
    }
    if(broadcastClock>=.1){broadcastClock=0;for(const room of rooms.values())for(const id of room.players.keys())to(id,'race',{room:snapshot(room)});}
    for(const pending of pendingResults.values())if(!pending.busy&&pending.at<=now())writeResult(pending);
    for(const [id,player] of sessions)if(!streams.has(id)&&now()-player.seen>15000){leave(id);sessions.delete(id);}
    for(const [id,room] of rooms)if(!room.players.size&&now()-room.touched>60000)rooms.delete(id);
    for(const [key,time] of limits)if(now()-time>60000)limits.delete(key);
    if(now()-lastLobby>10000)lobby();
  }
  const timer=autoTick?setInterval(()=>{const current=now();tick((current-lastTick)/1000);lastTick=current;},1000/60):null;timer?.unref();
  async function handle(req,res,route){
    try{
      const origin=req.headers.origin;if(origin&&new URL(origin).host!==req.headers.host)fail(403,'Use this site to connect.');
      if(route==='/health'&&req.method==='GET')return json(res,200,{ok:true,service:'rocket',rooms:rooms.size,storage:'ready'});
      if(!store)fail(503,'Player database is starting. Please try again.');
      if(route==='/players'&&req.method==='POST'){
        limited(`new:${req.socket.remoteAddress}`,1000);const data=await body(req),name=cleanName(data.name);
        if(name.length<2||name.length>24||/[<>\x00-\x1f\x7f]/.test(name))fail(400,'Use a name of 2–24 characters, without markup.');
        return json(res,201,await store.create(name));
      }
      if(route.startsWith('/scores/')&&req.method==='GET'){
        const mission=route.slice(8);if(!ALL_LEVELS.some(level=>level.id===mission))fail(404,'Unknown mission.');
        return json(res,200,{scores:await store.scores(mission)});
      }
      const token=req.headers.authorization?.match(/^Bearer ([\w-]{43})$/)?.[1];if(!token)fail(401,'Reconnect your pilot profile.');
      const player=await store.authenticate(token);if(!player)fail(401,'Pilot profile not found on this server.');
      sessions.set(player.id,{...player,seen:now()});
      if(route==='/me'&&req.method==='GET')return json(res,200,{player});
      if(route==='/events'&&req.method==='GET'){
        const responses=streams.get(player.id)||new Set();if(responses.size>=3)fail(429,'Too many connections for this pilot.');
        res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache, no-transform',Connection:'keep-alive','X-Accel-Buffering':'no'});res.flushHeaders?.();
        if(!responses.size)onlineJoins++;
        responses.add(res);streams.set(player.id,responses);send(res,'connected',{player});lobby();
        const room=rooms.get(members.get(player.id));if(room)send(res,'race',{room:snapshot(room)});
        const heartbeat=setInterval(()=>res.write(': heartbeat\n\n'),15000);heartbeat.unref();
        res.on('close',()=>{clearInterval(heartbeat);responses.delete(res);if(!responses.size){streams.delete(player.id);const current=sessions.get(player.id);if(current)current.seen=now();}lobby();});return;
      }
      if(req.method!=='POST')fail(404,'Unknown rocket API route.');
      const data=await body(req);
      if(route==='/join'){limited(`join:${player.id}`,200);return json(res,200,await join(player,data));}
      if(route==='/leave'){leave(player.id);return json(res,200,{ok:true});}
      if(route==='/input'){
        const racer=rooms.get(members.get(player.id))?.players.get(player.id);if(!racer)fail(409,'Join a game first.');
        if(typeof data.thrust!=='boolean'||!Number.isFinite(data.turn)||Math.abs(data.turn)>1)fail(400,'Invalid flight input.');
        const translation={};
        for(const axis of ['translateX','translateY'])if(data[axis]!==undefined){if(!Number.isFinite(data[axis])||Math.abs(data[axis])>1)fail(400,'Invalid translation input.');translation[axis]=data[axis];}
        if(data.inputSequence!==undefined&&(!Number.isSafeInteger(data.inputSequence)||data.inputSequence<0))fail(400,'Invalid input sequence.');
        limited(`input:${player.id}`,25);
        if(data.inputSequence===undefined||racer.inputSequence===undefined||data.inputSequence>racer.inputSequence){racer.input={thrust:data.thrust,turn:data.turn,...translation};racer.inputSequence=data.inputSequence;racer.inputAt=now();}
        else if(data.inputSequence===racer.inputSequence)racer.inputAt=now();
        return json(res,200,{ok:true});
      }
      if(route==='/chat'){
        limited(`chat:${player.id}`,750);const text=typeof data.text==='string'?data.text.trim():'';
        if(!text||text.length>280||/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(text))fail(400,'Write a message of 1–280 characters.');
        everyone('chat',{name:player.name,text});return json(res,200,{ok:true});
      }
      if(route==='/invite'){
        limited(`invite:${player.id}`,3000);const room=rooms.get(members.get(player.id));if(!room)fail(409,'Create or join a game first.');
        const invitation={name:player.name,room:room.id,mission:room.level.name};
        if(data.target!==undefined){
          if(data.target===player.id)fail(400,'Choose another pilot.');
          if(typeof data.target!=='string'||!streams.has(data.target))fail(409,'That pilot is no longer online.');
          if(members.has(data.target))fail(409,'That pilot is already in a game. Join them instead.');
          to(data.target,'invite',invitation);
        }else everyone('invite',invitation);
        return json(res,200,{room:room.id});
      }
      if(route==='/buy'||route==='/equip'){
        if(members.has(player.id))fail(409,'Return to the menu before changing your loadout.');
        const updated=route==='/equip'?await store.equip(player.id,data.ship):await store.buy(player.id,data.kind,data.key,data.ship);to(player.id,'profile',{player:updated});return json(res,200,{player:updated});
      }
      if(route==='/reset'){leave(player.id);const updated=await store.reset(player.id);to(player.id,'profile',{player:updated});return json(res,200,{player:updated});}
      fail(404,'Unknown rocket API route.');
    }catch(error){if(!res.headersSent)json(res,error.status||500,{error:error.status?error.message:'Rocket service unavailable. Please retry.'});else res.end();}
  }
  return {handle,tick,rooms,presence:()=>({online:streams.size,joins:onlineJoins}),close(){clearInterval(timer);for(const responses of streams.values())for(const res of responses)res.end();}};
}
