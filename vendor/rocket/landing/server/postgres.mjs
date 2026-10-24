import {randomBytes,createHash} from 'node:crypto';
import {validateEvent,publicConfig,createDirectorateReporter} from './services.mjs';

/** The hosted list and counters survive container restarts in the existing PostgreSQL pool. */
export async function createProductionServices(pool,env=process.env){
  await pool.query(`CREATE TABLE IF NOT EXISTS rocket_landing_newsletter (
    email text PRIMARY KEY, consent text NOT NULL, subscribed_at timestamptz NOT NULL DEFAULT now(), unsubscribe_hash text UNIQUE NOT NULL
  ); CREATE TABLE IF NOT EXISTS rocket_landing_metrics (
    day date PRIMARY KEY, active_ms bigint NOT NULL DEFAULT 0, events jsonb NOT NULL DEFAULT '{}'::jsonb
  )`);
  const seen=new Map(),days={};let totals={newsletter_subscribers:0,newsletter_signups_today:0};
  const hash=value=>createHash('sha256').update(value).digest('hex');
  async function refresh(){const {rows}=await pool.query('SELECT count(*)::int AS newsletter_subscribers, count(*) FILTER (WHERE subscribed_at >= CURRENT_DATE)::int AS newsletter_signups_today FROM rocket_landing_newsletter');totals=rows[0];}
  await refresh();
  const existing=await pool.query("SELECT to_char(day,'YYYY-MM-DD') AS day, active_ms, events FROM rocket_landing_metrics WHERE day >= CURRENT_DATE - 90");
  for(const row of existing.rows)days[row.day]={activeMs:Number(row.active_ms),events:row.events};
  const metrics={
    async accept(body){
      const event=validateEvent(body);if(!event)return false;
      const previous=seen.get(event.session);if(previous?.sequence>=event.sequence)return true;
      const now=Date.now();for(const [id,value]of seen)if(now-value.at>3600000)seen.delete(id);
      if(seen.size>10000)seen.delete(seen.keys().next().value);
      const day=new Date().toISOString().slice(0,10);
      const {rows}=await pool.query(`INSERT INTO rocket_landing_metrics (day,active_ms,events) VALUES ($1,$2,$3::jsonb)
        ON CONFLICT (day) DO UPDATE SET active_ms=rocket_landing_metrics.active_ms+EXCLUDED.active_ms,
        events=COALESCE((SELECT jsonb_object_agg(name,total) FROM (SELECT name,sum(value::bigint) AS total FROM
          (SELECT key AS name,value FROM jsonb_each_text(rocket_landing_metrics.events) UNION ALL SELECT key AS name,value FROM jsonb_each_text(EXCLUDED.events)) counts GROUP BY name) summed),'{}'::jsonb)
        RETURNING active_ms,events`,[day,event.activeMs,JSON.stringify(event.events)]);
      days[day]={activeMs:Number(rows[0].active_ms),events:rows[0].events};seen.set(event.session,{sequence:event.sequence,at:now});return true;
    },snapshot(){return {days:structuredClone(days)};},async flush(){},
  };
  const newsletter={
    async subscribe(body){
      if(body?.consent!==true||typeof body.email!=='string'||body.email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim()))return {status:400,error:'A valid email and consent are required.'};
      const token=randomBytes(32).toString('hex'),result=await pool.query('INSERT INTO rocket_landing_newsletter (email,consent,unsubscribe_hash) VALUES ($1,$2,$3) ON CONFLICT (email) DO NOTHING RETURNING email',[body.email.trim().toLowerCase(),'House of Tobias game news',hash(token)]);await refresh();
      return {status:200,ok:true,...(result.rowCount?{unsubscribeToken:token}:{})};
    },
    async unsubscribe(token){
      if(typeof token!=='string'||! /^[a-f0-9]{64}$/.test(token))return {status:400,error:'Invalid unsubscribe link.'};
      await pool.query('DELETE FROM rocket_landing_newsletter WHERE unsubscribe_hash=$1',[hash(token)]);await refresh();return {status:200,ok:true};
    },totals(){return {...totals};},
  };
  const reporter=createDirectorateReporter({url:env.ROCKET_LANDING_DIRECTORATE_URL,key:env.ROCKET_LANDING_DIRECTORATE_KEY,metrics,newsletter});
  const timer=setInterval(()=>reporter.send(),60000);timer.unref();
  return {metrics,newsletter,reporter,config:publicConfig(env),close(){clearInterval(timer);}};
}
