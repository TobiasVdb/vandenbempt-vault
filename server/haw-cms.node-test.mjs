import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import { registerHawCms } from './haw-cms.mjs'

function memoryStore() {
  let credentials=null;const content=new Map(),media=new Map(),messages=new Map()
  return {
    async credentials(){return credentials},async setup(salt,verifier){if(credentials)return false;credentials={salt,verifier};return true},async resetCredentials(salt,verifier){if(!credentials)return false;credentials={salt,verifier};return true},
    async content(page){return [...content.values()].filter(row=>row.page===page)},
    async save(page,field,kind,base,value){content.set(page+'|'+field,{page,field,kind,base,value})},
    async reset(page,field){content.delete(page+'|'+field)},async mediaList(){return [...media.values()].map(({data,...item})=>item)},
    async mediaGet(id){return media.get(id)||null},async mediaAdd(item){media.set(item.id,item)},async mediaDelete(id){if(!media.has(id))return 'missing';if([...content.values()].some(row=>row.kind==='image'&&row.value===id))return 'in_use';media.delete(id);return 'deleted'},async messages(){return [...messages.values()]},
    async messageAdd(item){messages.set(item.id,{...item,status:'new'})},async messageStatus(id,status){if(!messages.has(id))return false;messages.get(id).status=status;return true},async messageDelete(id){return messages.delete(id)},
  }
}

test('CMS requires an existing administrator for setup and protects editing, media and follow-up', async () => {
  const app=express();app.use(express.json({limit:'1mb'}));const store=memoryStore()
  registerHawCms(app,{store,isReady:()=>true,isHouseAuthenticated:req=>req.get('x-house-test')==='yes',secureCookies:false})
  const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));const origin=`http://127.0.0.1:${server.address().port}`,base=origin+'/haw/api'
  let cookie='';const call=(path,{method='GET',body,headers={}}={})=>fetch(base+path,{method,headers:{origin,...(cookie?{cookie}:{}),...(body&&!(body instanceof FormData)?{'content-type':'application/json'}:{}),...headers},body:body instanceof FormData?body:body?JSON.stringify(body):undefined})
  try {
    assert.equal((await call('/session')).status,200)
    assert.equal((await call('/messages',{method:'POST',body:{name:'Example',email:'person@example.test',message:'Hello',language:'en'}})).status,503)
    assert.equal((await call('/setup',{method:'POST',body:{password:'a strong example password'}})).status,403)
    assert.equal((await call('/setup',{method:'POST',headers:{'x-house-test':'yes',origin:'https://evil.example'},body:{password:'a strong example password'}})).status,403)
    assert.equal((await call('/setup',{method:'POST',headers:{'x-house-test':'yes'},body:{password:'short'}})).status,400)
    const setup=await call('/setup',{method:'POST',headers:{'x-house-test':'yes'},body:{password:'a strong example password'}});assert.equal(setup.status,200);cookie=setup.headers.get('set-cookie').split(';')[0]
    assert.equal((await call('/setup',{method:'POST',headers:{'x-house-test':'yes'},body:{password:'another long password'}})).status,409)
    const field={page:'',field:'t:0123abcd:0',kind:'text',base:'Before',value:'After'}
    assert.equal((await call('/content',{method:'PUT',headers:{origin:'https://evil.example'},body:field})).status,403)
    assert.equal((await call('/content',{method:'PUT',body:{...field,page:'0/'}})).status,400)
    assert.equal((await call('/content',{method:'PUT',body:{...field,page:'en/1/'}})).status,400)
    assert.equal((await call('/content',{method:'PUT',body:{...field,field:'t:bad'}})).status,400)
    assert.equal((await call('/content',{method:'PUT',body:field})).status,200)
    assert.equal((await (await call('/content?page=')).json()).fields[0].value,'After')
    const link={page:'',field:'l:0123abcd:0',kind:'link',base:'contact/',value:'mailto:test@example.test'}
    assert.equal((await call('/content',{method:'PUT',body:{...link,value:'javascript:alert(1)'}})).status,400)
    assert.equal((await call('/content',{method:'PUT',body:link})).status,200)
    const bad=new FormData();bad.append('file',new Blob(['<svg/>'],{type:'image/svg+xml'}),'bad.svg');assert.equal((await call('/media',{method:'POST',body:bad})).status,400)
    const good=new FormData();good.append('file',new Blob([Buffer.from([137,80,78,71,13,10,26,10,0])],{type:'image/png'}),'ok.png');const uploaded=await call('/media',{method:'POST',body:good});assert.equal(uploaded.status,201);const image=await uploaded.json()
    const imageResponse=await call('/media/'+image.id);assert.equal(imageResponse.status,200);assert.equal(imageResponse.headers.get('x-content-type-options'),'nosniff')
    assert.equal((await call('/content',{method:'PUT',body:{page:'en/',field:'i:0123abcd:0',kind:'image',base:'hero-background',value:image.id}})).status,200)
    assert.equal((await call('/media/'+image.id,{method:'DELETE',body:{}})).status,409)
    assert.equal((await call('/messages',{method:'POST',body:{name:'Example',email:'person@example.test',message:'Please contact me',language:'en'}})).status,201)
    const messages=await (await call('/messages')).json();assert.equal(messages.items.length,1)
    assert.equal((await call('/messages/'+messages.items[0].id,{method:'PATCH',body:{status:'done'}})).status,200)
    assert.equal((await (await call('/messages')).json()).items[0].status,'done')
    assert.equal((await call('/messages/'+messages.items[0].id,{method:'DELETE',body:{}})).status,200)
    assert.equal((await (await call('/messages')).json()).items.length,0)
    assert.equal((await call('/content',{method:'DELETE',body:{page:'en/',field:'i:0123abcd:0'}})).status,200)
    assert.equal((await call('/media/'+image.id,{method:'DELETE',body:{}})).status,200)
    assert.equal((await call('/logout',{method:'POST',body:{}})).status,200)
    assert.equal((await call('/messages')).status,401);assert.equal((await call('/pages')).status,401);assert.equal((await call('/media')).status,401);assert.equal((await call('/content',{method:'PUT',body:field})).status,401)
    assert.equal((await call('/login',{method:'POST',body:{password:'wrong'}})).status,401)
    assert.equal((await call('/login',{method:'POST',body:{password:'a strong example password'}})).status,200)
    assert.equal((await call('/reset-password',{method:'POST',body:{password:'another long password'}})).status,403)
    assert.equal((await call('/reset-password',{method:'POST',headers:{'x-house-test':'yes'},body:{password:'another long password'}})).status,200)
    assert.equal((await call('/login',{method:'POST',body:{password:'a strong example password'}})).status,401)
    assert.equal((await call('/login',{method:'POST',body:{password:'another long password'}})).status,200)
  } finally { server.closeAllConnections();await new Promise(resolve=>server.close(resolve)) }
})

test('CMS returns a clear unavailable response until storage is ready',async()=>{
  const app=express();registerHawCms(app,{store:null,isReady:()=>false,isHouseAuthenticated:()=>false});const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));try{const r=await fetch(`http://127.0.0.1:${server.address().port}/haw/api/session`);assert.equal(r.status,503)}finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve))}
})
