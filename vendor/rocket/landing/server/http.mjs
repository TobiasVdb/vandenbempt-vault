import fs from 'node:fs';
import path from 'node:path';
export function createLandingHttp({root,base=root,production=true,getServices}){
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.ttf':'font/ttf','.glb':'model/gltf-binary','.json':'application/json'};
const json=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));};
const origins=new Set(['https://rocket.planetarypixel.be',...(process.env.LANDING_ALLOWED_ORIGINS||'').split(',').filter(Boolean)]);
async function body(req){if(req.body!==undefined){if(Buffer.byteLength(JSON.stringify(req.body))>4096)throw Object.assign(new Error('Request too large'),{status:413});return req.body;}let text='';for await(const chunk of req){text+=chunk;if(Buffer.byteLength(text)>4096)throw Object.assign(new Error('Request too large'),{status:413});}try{return JSON.parse(text);}catch{throw Object.assign(new Error('Invalid JSON'),{status:400});}}
const rates=new Map();
return async function handle(req,res,{entryBase=null}={}){
  try{
    const route=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    if(route.startsWith('/api/')){
      const services=getServices();if(!services)return json(res,503,{error:'Landing services are starting.'});const {metrics,newsletter,reporter,config}=services;
      if(req.method==='GET'&&route==='/api/config')return json(res,200,config);
      if(req.method==='GET'&&route==='/api/health')return json(res,200,{ok:true,tracker:'aggregate',directorate:reporter.enabled?'configured':'unconfigured',newsletter:config.newsletterReady});
      if(req.method!=='POST'||!['/api/events','/api/newsletter','/api/newsletter/unsubscribe'].includes(route))return json(res,404,{error:'Not found'});
      const origin=req.headers.origin,own=new URL(`http://${req.headers.host}`).host;
      if(origin&&!origins.has(origin)&&new URL(origin).host!==own)return json(res,403,{error:'Origin not allowed'});
      if(req.headers['sec-fetch-site']==='cross-site'&&!origins.has(origin))return json(res,403,{error:'Origin not allowed'});
      const key=req.socket.remoteAddress+':'+(route==='/api/events'?'events':'newsletter'),now=Date.now();let rate=rates.get(key);
      if(!rate||rate.until<now){rate={count:0,until:now+60000};rates.set(key,rate);}if(++rate.count>(route==='/api/events'?120:8))return json(res,429,{error:'Please retry shortly.'});
      for(const [id,value]of rates)if(value.until<now)rates.delete(id);
      const data=await body(req);
      if(route==='/api/events'){const accepted=await metrics.accept(data);return json(res,accepted?202:400,{ok:accepted});}
      const result=route.endsWith('/unsubscribe')?await newsletter.unsubscribe(data.token):await newsletter.subscribe(data);return json(res,result.status,result);
    }
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return;}
    let directory=root,relative=route==='/'?'index.html':route.slice(1);
    if(!production&&route.startsWith('/runtime/')){
      directory=path.resolve(base,'../viewer');relative=route.slice(9);
      if(relative.startsWith('ships/')){directory=path.resolve(base,'../ships');relative=relative.slice(6);}
      else if(relative.startsWith('vendor/three/')){directory=path.resolve(base,'../viewer/node_modules/three');relative=relative.slice(13);}
      else if(!/^(game\/[\w./-]+\.js|assets\/(HankenGrotesk\.ttf|menu-mountains-v1\.png)|flight-systems\.js)$/.test(relative)){res.writeHead(404).end();return;}
    }else if(!/^(index\.html|icon\.svg|src\/[\w-]+\.(js|css)|runtime\/(game\/[\w-]+\.js|assets\/[\w.-]+|ships\/aster\.glb|flight-systems\.js|vendor\/three\/[\w./-]+\.js))$/.test(relative)){res.writeHead(404).end();return;}
    const target=path.resolve(directory,relative);if(!target.startsWith(directory+path.sep)||!types[path.extname(target)]||route.includes('..')){res.writeHead(404).end();return;}
    let stat;try{stat=await fs.promises.stat(target);}catch{res.writeHead(404).end();return;}if(!stat.isFile()){res.writeHead(404).end();return;}
    const html=entryBase&&relative==='index.html'?(await fs.promises.readFile(target,'utf8')).replace('<head>',`<head><base href="${entryBase}">`).replaceAll('href="#','href="../#'):null;
    res.writeHead(200,{'Content-Type':types[path.extname(target)],'Content-Length':html?Buffer.byteLength(html):stat.size,'X-Content-Type-Options':'nosniff','Cache-Control':'no-cache','Referrer-Policy':'strict-origin-when-cross-origin'});
    if(req.method==='HEAD')res.end();else if(html)res.end(html);else fs.createReadStream(target).on('error',()=>res.destroy()).pipe(res);
  }catch(error){json(res,error.status||500,{error:error.status?error.message:'Request could not be completed.'});}
};
}
