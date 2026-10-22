import fs from 'node:fs/promises';
import path from 'node:path';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { newProfile, buyUpgrade, buySkin, settleRace } from '../game/progression.js';

const digest=token=>createHash('sha256').update(token).digest('hex');
export function newPlayer(name){
  const token=randomBytes(32).toString('base64url');
  return {token,row:{id:randomUUID(),name,tokenHash:digest(token),profile:newProfile()}};
}
export const publicPlayer=row=>({id:row.id,name:row.name,profile:structuredClone(row.profile)});
function purchase(row,kind,key){
  const result=kind==='upgrade'?buyUpgrade(row.profile,key):kind==='skin'?buySkin(row.profile,key):{ok:false,reason:'Unknown purchase.'};
  if(!result.ok)throw Object.assign(new Error(result.reason),{status:409});return publicPlayer(row);
}

/** Local development uses an atomic file. Production uses the host's PostgreSQL adapter. */
export async function createLocalStore(file=null){
  let data={players:[],results:[]};
  if(file){try{data=JSON.parse(await fs.readFile(file,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}}
  let pending=Promise.resolve();
  function mutate(action){
    const next=pending.then(async()=>{
      const backup=structuredClone(data);
      try{const result=action();if(file){await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file+'.tmp',JSON.stringify(data));await fs.rename(file+'.tmp',file);}return result;}
      catch(error){data=backup;throw error;}
    });pending=next.catch(()=>{});return next;
  }
  return {
    async create(name){return mutate(()=>{const player=newPlayer(name);data.players.push(player.row);return {...publicPlayer(player.row),token:player.token};});},
    async authenticate(token){await pending;const row=data.players.find(row=>row.tokenHash===digest(token));return row?publicPlayer(row):null;},
    async buy(id,kind,key){return mutate(()=>purchase(data.players.find(row=>row.id===id),kind,key));},
    async equip(id,ship){return mutate(()=>{const row=data.players.find(row=>row.id===id);row.profile.ship=ship;return publicPlayer(row);});},
    async reset(id){return mutate(()=>{const row=data.players.find(row=>row.id===id);row.profile=newProfile();data.results=data.results.filter(result=>result.playerId!==id);return publicPlayer(row);});},
    async record(id,result){return mutate(()=>{
      const row=data.players.find(row=>row.id===id);
      if(!data.results.some(entry=>entry.attemptId===result.attemptId)){
        data.results.push({...result,playerId:id});settleRace(row.profile,result);
      }return publicPlayer(row);
    });},
    async scores(mission){await pending;const best=new Map();
      for(const result of data.results)if(result.missionId===mission&&result.success&&(!best.has(result.playerId)||best.get(result.playerId)>result.time))best.set(result.playerId,result.time);
      return [...best].sort((a,b)=>a[1]-b[1]).slice(0,5).map(([id,time])=>({name:data.players.find(row=>row.id===id).name,time}));
    },
  };
}

export async function createPostgresStore(pool){
  await pool.query(`CREATE TABLE IF NOT EXISTS rocket_players (id UUID PRIMARY KEY, name TEXT NOT NULL, token_hash TEXT UNIQUE NOT NULL, profile JSONB NOT NULL);
    CREATE TABLE IF NOT EXISTS rocket_results (attempt_id UUID PRIMARY KEY, player_id UUID NOT NULL REFERENCES rocket_players(id) ON DELETE CASCADE, mission TEXT NOT NULL, seconds DOUBLE PRECISION NOT NULL, success BOOLEAN NOT NULL);
    CREATE INDEX IF NOT EXISTS rocket_results_mission_time ON rocket_results(mission,seconds) WHERE success=true;`);
  const fromDb=row=>row?{id:row.id,name:row.name,profile:row.profile}:null;
  async function transaction(id,action){
    const client=await pool.connect();
    try{await client.query('BEGIN');const {rows}=await client.query('SELECT * FROM rocket_players WHERE id=$1 FOR UPDATE',[id]);
      if(!rows[0])throw Object.assign(new Error('Player no longer exists.'),{status:401});
      const row=fromDb(rows[0]);await action(row,client);
      await client.query('UPDATE rocket_players SET profile=$2 WHERE id=$1',[id,JSON.stringify(row.profile)]);await client.query('COMMIT');return publicPlayer(row);
    }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
  }
  return {
    async create(name){const {row,token}=newPlayer(name);await pool.query('INSERT INTO rocket_players(id,name,token_hash,profile) VALUES($1,$2,$3,$4)',[row.id,row.name,row.tokenHash,JSON.stringify(row.profile)]);return {...publicPlayer(row),token};},
    async authenticate(token){return fromDb((await pool.query('SELECT id,name,profile FROM rocket_players WHERE token_hash=$1',[digest(token)])).rows[0]);},
    buy:(id,kind,key)=>transaction(id,row=>purchase(row,kind,key)),
    equip:(id,ship)=>transaction(id,row=>{row.profile.ship=ship;}),
    reset:id=>transaction(id,async(row,client)=>{row.profile=newProfile();await client.query('DELETE FROM rocket_results WHERE player_id=$1',[id]);}),
    record:(id,result)=>transaction(id,async(row,client)=>{
      const insert=await client.query('INSERT INTO rocket_results(attempt_id,player_id,mission,seconds,success) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING RETURNING attempt_id',[result.attemptId,id,result.missionId,result.time,result.success]);
      if(insert.rowCount)settleRace(row.profile,result);
    }),
    async scores(mission){return (await pool.query('SELECT p.name,MIN(r.seconds) AS time FROM rocket_results r JOIN rocket_players p ON p.id=r.player_id WHERE r.mission=$1 AND r.success=true GROUP BY p.id,p.name ORDER BY time,p.id LIMIT 5',[mission])).rows.map(row=>({name:row.name,time:Number(row.time)}));},
  };
}
