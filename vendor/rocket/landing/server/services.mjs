import {randomUUID,randomBytes,createHash} from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

export const EVENTS=new Set(['page_view','chapter_0','chapter_1','chapter_2','chapter_3','chapter_4','demo_takeover','demo_reset','demo_crash','demo_landing','demo_roundtrip','steam_click','newsletter_signup']);

export function validateEvent(body){
  if(!body||typeof body.session!=='string'||! /^[a-f0-9-]{36}$/i.test(body.session)||!Number.isSafeInteger(body.sequence)||body.sequence<1||!body.events||Array.isArray(body.events))return null;
  const events={};for(const [key,value]of Object.entries(body.events)){
    if(!EVENTS.has(key)||!Number.isSafeInteger(value)||value<0||value>100)return null;events[key]=value;
  }
  if(!Number.isSafeInteger(body.activeMs)||body.activeMs<0||body.activeMs>120000)return null;
  return {session:body.session,sequence:body.sequence,events,activeMs:body.activeMs};
}

/** Session tokens exist only in a bounded deduplication cache, never in persisted reports. */
export async function createMetrics({file,now=Date.now}={}){
  let data={days:{}},dirty=false,pending=null;const seen=new Map();
  if(file){try{data=JSON.parse(await fs.readFile(file,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}}
  return {
    accept(body){const event=validateEvent(body);if(!event)return false;
      const previous=seen.get(event.session);if(previous&&previous.sequence>=event.sequence)return true;
      for(const [id,value]of seen)if(now()-value.at>3600000)seen.delete(id);
      if(seen.size>=10000&&!seen.has(event.session))seen.delete(seen.keys().next().value);
      seen.set(event.session,{sequence:event.sequence,at:now()});
      const day=new Date(now()).toISOString().slice(0,10),row=data.days[day]??(data.days[day]={activeMs:0,events:{}});row.activeMs+=event.activeMs;
      for(const [key,value]of Object.entries(event.events))row.events[key]=(row.events[key]||0)+value;
      const keys=Object.keys(data.days).sort();for(const key of keys.slice(0,-90))delete data.days[key];dirty=true;return true;
    },
    snapshot(){return structuredClone(data);},
    async flush(){if(!file||!dirty)return;if(pending)return pending;
      dirty=false;const value=JSON.stringify(data);pending=(async()=>{await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file+'.tmp',value);await fs.rename(file+'.tmp',file);})();
      try{await pending;}catch(error){dirty=true;throw error;}finally{pending=null;}
    },
  };
}

export function createDirectorateReporter({url,key,metrics,newsletter,request=fetch,now=Date.now}){
  let pending=null,busy=false;
  return {enabled:Boolean(url&&key),async send(){
    if(!url||!key||busy)return false;busy=true;
    try{
      if(!pending){const day=new Date(now()).toISOString().slice(0,10),row=metrics.snapshot().days[day];
        pending={report_id:randomUUID(),timestamp:new Date(now()).toISOString(),status:'healthy',metrics:{page_views_today:row?.events.page_view??0,active_minutes_today:(row?.activeMs??0)/60000,demo_landings_today:row?.events.demo_landing??0,demo_crashes_today:row?.events.demo_crash??0,steam_clicks_today:row?.events.steam_click??0,...(newsletter?newsletter.totals():{})},metadata:{project:'thrustlings-landing',measurement:'anonymous server aggregates'}};
      }
      const response=await request(url,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},body:JSON.stringify(pending),signal:AbortSignal.timeout(10000),redirect:'error'});
      await response.body?.cancel();if(!response.ok)return false;pending=null;return true;
    }catch{return false;}finally{busy=false;}
  }};
}

export function publicConfig(env){
  let steamUrl=null;
  if(env.STEAM_URL){const parsed=new URL(env.STEAM_URL);if(parsed.protocol!=='https:'||parsed.hostname!=='store.steampowered.com'||!/^\/app\/\d+\//.test(parsed.pathname))throw new Error('STEAM_URL must point to a Steam app page.');steamUrl=parsed.href;}
  return {steamUrl,newsletterReady:true};
}

/** A private, purpose-specific list. Only an opaque unsubscribe receipt leaves the server. */
export async function createNewsletterStore({file,now=Date.now}){
  let data={signups:[]},queue=Promise.resolve();
  try{data=JSON.parse(await fs.readFile(file,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
  const hash=value=>createHash('sha256').update(value).digest('hex');
  function transact(change){
    const result=queue.then(async()=>{const next=structuredClone(data),value=change(next);await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file+'.tmp',JSON.stringify(next),{mode:0o600});await fs.rename(file+'.tmp',file);data=next;return value;});
    queue=result.catch(()=>{});return result;
  }
  return {
    async subscribe(body){
      if(body?.consent!==true||typeof body.email!=='string'||body.email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim()))return {status:400,error:'A valid email and consent are required.'};
      const email=body.email.trim().toLowerCase();
      return transact(next=>{
        if(next.signups.some(signup=>signup.email===email))return {status:200,ok:true};
        const token=randomBytes(32).toString('hex');next.signups.push({email,subscribedAt:new Date(now()).toISOString(),consent:'Thrustlings game news',source:'thrustlings-landing',unsubscribeHash:hash(token)});
        return {status:200,ok:true,unsubscribeToken:token};
      });
    },
    async unsubscribe(token){
      if(typeof token!=='string'||! /^[a-f0-9]{64}$/.test(token))return {status:400,error:'Invalid unsubscribe link.'};
      return transact(next=>{next.signups=next.signups.filter(signup=>signup.unsubscribeHash!==hash(token));return {status:200,ok:true};});
    },
    totals(){const today=new Date(now()).toISOString().slice(0,10);return {newsletter_subscribers:data.signups.length,newsletter_signups_today:data.signups.filter(signup=>signup.subscribedAt.startsWith(today)).length};},
  };
}
