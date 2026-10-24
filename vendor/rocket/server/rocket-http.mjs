import fs from 'node:fs';
import path from 'node:path';
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.glb':'model/gltf-binary','.blend':'application/octet-stream','.png':'image/png','.svg':'image/svg+xml','.ttf':'font/ttf','.woff2':'font/woff2','.mp3':'audio/mpeg','.md':'text/markdown'};

/** A bounded mount: unknown Rocket paths never fall through into the host SPA. */
export function createRocketHttp({root,getService,landingHandler=null,ships=path.join(root,'ships'),levels=path.join(root,'levels'),three=path.join(root,'vendor/three')}){
  return async function handle(req,res,{gameAtRoot=true}={}){
    let route;try{route=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400).end();return;}
    if(landingHandler&&(route==='/'||route.startsWith('/landing/'))){
      const original=req.url;if(route.startsWith('/landing/'))req.url=req.url.slice(8);
      try{return await landingHandler(req,res,{entryBase:route==='/'?'./landing/':null});}finally{req.url=original;}
    }
    if(route==='/api'||route.startsWith('/api/')){
      const service=getService();if(!service){res.writeHead(503,{'Content-Type':'application/json'}).end(JSON.stringify({error:'Rocket database is starting. Please retry.'}));return;}
      return service.handle(req,res,route.slice(4)||'/');
    }
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return;}
    if(route==='/game'||route==='/hangar'){res.writeHead(302,{Location:route.split('/').at(-1)+'/'}).end();return;}
    let directory=root,relative=route.slice(1),html=null;
    if(route==='/'){
      relative=gameAtRoot?'game/index.html':'index.html';
      if(gameAtRoot)html=fs.readFileSync(path.join(root,relative),'utf8').replace('<head>','<head><base href="./game/">');
    }
    if(route==='/game/')relative='game/index.html';
    if(route==='/hangar/'){
      relative='index.html';html=fs.readFileSync(path.join(root,relative),'utf8').replace('<head>','<head><base href="../">');
    }
    if(route.startsWith('/ships/')){directory=ships;relative=route.slice(7);}
    else if(route.startsWith('/levels/')){directory=levels;relative=route.slice(8);}
    else if(route.startsWith('/vendor/three/')){directory=three;relative=route.slice(14);}
    else if(!['/','/game/','/index.html','/app.js','/style.css','/flight-systems.js','/hangar/'].includes(route)&&!/^\/(game|assets)\/[\w./-]+$/.test(route)){res.writeHead(404).end();return;}
    const target=path.resolve(directory,relative),extension=path.extname(target);
    if(!target.startsWith(path.resolve(directory)+path.sep)||!types[extension]||route.includes('..')){res.writeHead(404).end();return;}
    try{const stat=await fs.promises.stat(target);if(!stat.isFile())throw new Error('not a file');
      res.writeHead(200,{'Content-Type':types[extension],'Content-Length':html?Buffer.byteLength(html):stat.size,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});
      if(req.method==='HEAD')res.end();else if(html)res.end(html);else fs.createReadStream(target).on('error',()=>res.destroy()).pipe(res);
    }catch{res.writeHead(404).end();}
  };
}
