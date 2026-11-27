import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import fs from 'node:fs'
import path from 'node:path'
import multer from 'multer'
import { createRequestLimiter } from './security-http.mjs'

const scrypt = promisify(scryptCallback)
const COOKIE = 'haw_editor'
const SESSION_MS = 12 * 60 * 60 * 1000
const MAX_IMAGE_BYTES = 6 * 1024 * 1024
const STATES = new Set(['new', 'in_progress', 'done'])

export async function initializeHawCms(pool) {
  await pool.query(`CREATE TABLE IF NOT EXISTS haw_cms_settings (id INTEGER PRIMARY KEY CHECK (id = 1), salt TEXT NOT NULL, verifier TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`)
  await pool.query(`CREATE TABLE IF NOT EXISTS haw_cms_content (page TEXT NOT NULL, field TEXT NOT NULL, kind TEXT NOT NULL, base TEXT NOT NULL, value TEXT NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY(page, field))`)
  await pool.query(`CREATE TABLE IF NOT EXISTS haw_cms_media (id UUID PRIMARY KEY, name TEXT NOT NULL, mime TEXT NOT NULL, data BYTEA NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`)
  await pool.query(`CREATE TABLE IF NOT EXISTS haw_cms_messages (id UUID PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL, message TEXT NOT NULL, language TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'new', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`)
}

export function createHawStore(pool) {
  return {
    async credentials() { return (await pool.query('SELECT salt, verifier FROM haw_cms_settings WHERE id = 1')).rows[0] || null },
    async setup(salt, verifier) { return (await pool.query('INSERT INTO haw_cms_settings (id, salt, verifier) VALUES (1, $1, $2) ON CONFLICT (id) DO NOTHING RETURNING id', [salt, verifier])).rowCount === 1 },
    async resetCredentials(salt, verifier) { return (await pool.query('UPDATE haw_cms_settings SET salt=$1, verifier=$2 WHERE id=1 RETURNING id', [salt, verifier])).rowCount === 1 },
    async content(page) { return (await pool.query('SELECT field, kind, base, value FROM haw_cms_content WHERE page = $1 ORDER BY field', [page])).rows },
    async save(page, field, kind, base, value) {
      const client=await pool.connect()
      try { await client.query('BEGIN'); if(kind==='image' && uuid(value)){const image=await client.query('SELECT id FROM haw_cms_media WHERE id=$1 FOR UPDATE',[value]);if(!image.rowCount){await client.query('ROLLBACK');return false}} await client.query('INSERT INTO haw_cms_content (page, field, kind, base, value) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (page,field) DO UPDATE SET kind=EXCLUDED.kind, base=EXCLUDED.base, value=EXCLUDED.value, updated_at=NOW()', [page, field, kind, base, value]);await client.query('COMMIT');return true } catch(error){await client.query('ROLLBACK');throw error} finally{client.release()}
    },
    async reset(page, field) { await pool.query('DELETE FROM haw_cms_content WHERE page=$1 AND field=$2', [page, field]) },
    async mediaList() { return (await pool.query('SELECT id, name, mime, created_at FROM haw_cms_media ORDER BY created_at DESC LIMIT 250')).rows },
    async mediaGet(id) { return (await pool.query('SELECT id, name, mime, data FROM haw_cms_media WHERE id=$1', [id])).rows[0] || null },
    async mediaAdd(item) { await pool.query('INSERT INTO haw_cms_media (id,name,mime,data) VALUES ($1,$2,$3,$4)', [item.id, item.name, item.mime, item.data]) },
    async mediaDelete(id) {
      const client=await pool.connect()
      try { await client.query('BEGIN');const image=await client.query('SELECT id FROM haw_cms_media WHERE id=$1 FOR UPDATE',[id]);if(!image.rowCount){await client.query('ROLLBACK');return 'missing'}const usage=await client.query("SELECT 1 FROM haw_cms_content WHERE kind='image' AND value=$1 LIMIT 1",[id]);if(usage.rowCount){await client.query('ROLLBACK');return 'in_use'}await client.query('DELETE FROM haw_cms_media WHERE id=$1',[id]);await client.query('COMMIT');return 'deleted' }catch(error){await client.query('ROLLBACK');throw error}finally{client.release()}
    },
    async messages() { return (await pool.query('SELECT id,name,email,message,language,status,created_at,updated_at FROM haw_cms_messages ORDER BY created_at DESC LIMIT 500')).rows },
    async messageAdd(item) { await pool.query('INSERT INTO haw_cms_messages (id,name,email,message,language) VALUES ($1,$2,$3,$4,$5)', [item.id, item.name, item.email, item.message, item.language]) },
    async messageStatus(id,status) { return (await pool.query('UPDATE haw_cms_messages SET status=$2, updated_at=NOW() WHERE id=$1 RETURNING id', [id,status])).rowCount > 0 },
    async messageDelete(id) { return (await pool.query('DELETE FROM haw_cms_messages WHERE id=$1 RETURNING id', [id])).rowCount > 0 },
  }
}

function cookieValue(request) {
  return String(request.headers.cookie || '').split(';').map(x => x.trim()).find(x => x.startsWith(COOKIE + '='))?.slice(COOKIE.length + 1) || ''
}
function sameOrigin(request) {
  try { return Boolean(request.get('origin')) && new URL(request.get('origin')).host === request.get('host') } catch { return false }
}
function imageMime(buffer) {
  if (buffer.length >= 8 && buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return 'image/png'
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg'
  if (buffer.length >= 12 && buffer.toString('ascii',0,4) === 'RIFF' && buffer.toString('ascii',8,12) === 'WEBP') return 'image/webp'
  if (buffer.length >= 6 && ['GIF87a','GIF89a'].includes(buffer.toString('ascii',0,6))) return 'image/gif'
  return null
}
const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
const validPage = page => typeof page === 'string' && page.length <= 300 && /^(?:en\/)?(?:[a-z0-9-]+\/)*$/.test(page) && !/^(?:en\/)?(?:0|1|api|admin)\//.test(page)
const validField = field => typeof field === 'string' && /^[til]:[0-9a-f]{8}:[0-9]{1,4}$/.test(field)
const safeLink = value => { if(!value || value.length>2048 || /[\x00-\x1f\x7f]/.test(value))return false;try{return ['http:','https:','mailto:','tel:'].includes(new URL(value,'https://example.test/haw/').protocol)}catch{return false} }

export function registerHawCms(app, { store, isReady, isHouseAuthenticated, assetDir, secureCookies = true }) {
  const sessions = new Map()
  const allowLogin = createRequestLimiter({ rate: 1/12, burst: 5 })
  const allowSubmit = createRequestLimiter({ rate: 1/60, burst: 3 })
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_IMAGE_BYTES, files: 1 } }).single('file')
  const client = req => req.get('do-connecting-ip') || req.socket.remoteAddress || 'unknown'
  const ready = (req,res,next) => { res.set('Cache-Control','no-store'); if (!isReady()) return res.status(503).json({ error: 'CMS is temporarily unavailable.' }); next() }
  const requireOrigin = (req,res,next) => sameOrigin(req) ? next() : res.status(403).json({ error: 'Invalid request origin.' })
  const authenticated = req => { const token = cookieValue(req); const expiry = sessions.get(token) || 0; if (expiry > Date.now()) return true; if (token) sessions.delete(token); return false }
  const requireAuth = (req,res,next) => authenticated(req) ? next() : res.status(401).json({ error: 'Sign in required.' })
  const assetNames = () => { if (!assetDir || !fs.existsSync(assetDir)) return []; return fs.readdirSync(assetDir, {withFileTypes:true}).filter(item => item.isFile() && /^[a-zA-Z0-9._-]+\.(png|jpe?g|webp|gif|avif|svg)$/i.test(item.name)).map(item => item.name) }
  const validImage = async value => uuid(value) ? Boolean(await store.mediaGet(value)) : typeof value === 'string' && value.startsWith('asset:') && assetNames().includes(value.slice(6))
  const sitePages = () => {
    if(!assetDir)return []
    const root=path.dirname(assetDir), pages=[]
    function scan(dir,relative=''){
      for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
        if(entry.isDirectory()){if(['assets','0','1','admin'].includes(entry.name))continue;scan(path.join(dir,entry.name),relative+entry.name+'/')}
        else if(entry.isFile() && entry.name==='index.html'){const html=fs.readFileSync(path.join(dir,entry.name),'utf8');const title=html.match(/<title>([^<]+)<\/title>/i)?.[1]?.replaceAll('&amp;','&') || relative || 'Home';pages.push({path:relative,title,language:relative.startsWith('en/')?'en':'nl'})}
      }
    }
    scan(root);return pages.sort((a,b)=>a.path.localeCompare(b.path))
  }
  const fail = (res,error) => { console.error('HAW CMS request failed:', error); if (!res.headersSent) res.status(500).json({ error: 'The request could not be completed.' }) }
  const route = (method,url,...handlers) => app[method]('/haw/api'+url, ready, ...handlers.map(handler => (req,res,next) => Promise.resolve(handler(req,res,next)).catch(error => fail(res,error))))
  const createSession = res => { const now=Date.now(); for(const [key,expiry] of sessions) if(expiry<=now)sessions.delete(key); if(sessions.size>=256)sessions.delete(sessions.keys().next().value); const token=randomBytes(32).toString('base64url'); sessions.set(token,now+SESSION_MS);res.cookie(COOKIE,token,{httpOnly:true,secure:secureCookies,sameSite:'strict',path:'/haw',maxAge:SESSION_MS}) }

  route('get','/session',async (req,res) => { const settings=await store.credentials(); res.json({authenticated:authenticated(req),setupRequired:!settings,setupAllowed:!settings && isHouseAuthenticated(req),resetAllowed:Boolean(settings) && isHouseAuthenticated(req)}) })
  route('post','/setup',requireOrigin,async (req,res) => {
    if (!isHouseAuthenticated(req)) return res.status(403).json({error:'Sign in to House of Tobias first.'})
    const password=req.body?.password
    if(typeof password!=='string'||password.length<16||password.length>256)return res.status(400).json({error:'Use a password of 16 to 256 characters.'})
    const salt=randomBytes(16).toString('hex'), verifier=(await scrypt(password,salt,64)).toString('hex')
    if(!await store.setup(salt,verifier))return res.status(409).json({error:'The CMS is already configured.'})
    createSession(res);res.json({ok:true})
  })
  route('post','/reset-password',requireOrigin,async (req,res) => {
    if(!isHouseAuthenticated(req))return res.status(403).json({error:'Sign in to House of Tobias first.'})
    const password=req.body?.password
    if(typeof password!=='string'||password.length<16||password.length>256)return res.status(400).json({error:'Use a password of 16 to 256 characters.'})
    const salt=randomBytes(16).toString('hex'), verifier=(await scrypt(password,salt,64)).toString('hex')
    if(!await store.resetCredentials(salt,verifier))return res.status(409).json({error:'The CMS is not configured.'})
    sessions.clear();createSession(res);res.json({ok:true})
  })
  route('post','/login',requireOrigin,async (req,res) => {
    if(!allowLogin(client(req)))return res.status(429).json({error:'Too many attempts. Try again later.'})
    const settings=await store.credentials(), password=req.body?.password
    if(!settings||typeof password!=='string'||password.length>256)return res.status(401).json({error:'Incorrect password.'})
    const expected=Buffer.from(settings.verifier,'hex'), actual=await scrypt(password,settings.salt,64)
    if(expected.length!==actual.length||!timingSafeEqual(expected,actual))return res.status(401).json({error:'Incorrect password.'})
    createSession(res);res.json({ok:true})
  })
  route('post','/logout',requireOrigin,(req,res) => { sessions.delete(cookieValue(req));res.clearCookie(COOKIE,{path:'/haw',httpOnly:true,secure:secureCookies,sameSite:'strict'});res.json({ok:true}) })
  route('get','/content',async (req,res) => {const page=req.query.page;if(!validPage(page))return res.status(400).json({error:'Invalid page.'});res.json({fields:await store.content(page)})})
  route('put','/content',requireOrigin,requireAuth,async (req,res) => {const {page,field,kind,base,value}=req.body||{};if(!validPage(page)||!validField(field)||!['text','image','link'].includes(kind)||typeof base!=='string'||base.length>5000||typeof value!=='string'||value.length>5000||kind!==({t:'text',i:'image',l:'link'}[field[0]]))return res.status(400).json({error:'Invalid field.'});if(kind==='link'&&!safeLink(value))return res.status(400).json({error:'Invalid link.'});if(kind==='image'&&(!await validImage(value)))return res.status(400).json({error:'Image not found.'});if(await store.save(page,field,kind,base,value)===false)return res.status(400).json({error:'Image not found.'});res.json({ok:true})})
  route('delete','/content',requireOrigin,requireAuth,async (req,res) => {const {page,field}=req.body||{};if(!validPage(page)||!validField(field))return res.status(400).json({error:'Invalid field.'});await store.reset(page,field);res.json({ok:true})})
  route('get','/pages',requireAuth,async (_req,res) => res.json({items:sitePages()}))
  route('get','/media',requireAuth,async (_req,res) => res.json({items:[...assetNames().map(name=>({id:'asset:'+name,name,mime:'image'})),...await store.mediaList()]}))
  route('post','/media',requireOrigin,requireAuth,(req,res,next) => upload(req,res,error => error ? res.status(400).json({error:'Image must be under 6 MB.'}) : next()),async (req,res) => {const file=req.file,mime=file&&imageMime(file.buffer);if(!file||!mime||file.mimetype!==mime)return res.status(400).json({error:'Choose a PNG, JPEG, WebP or GIF image.'});const item={id:randomUUID(),name:String(file.originalname||'image').replace(/[\x00-\x1f<>]/g,'').slice(0,160),mime,data:file.buffer};await store.mediaAdd(item);res.status(201).json({id:item.id,name:item.name,mime:item.mime})})
  route('delete','/media/:id',requireOrigin,requireAuth,async (req,res) => {if(!uuid(req.params.id))return res.sendStatus(404);const result=await store.mediaDelete(req.params.id);if(result==='missing')return res.sendStatus(404);if(result==='in_use')return res.status(409).json({error:'This image is still used on a page.'});res.json({ok:true})})
  route('get','/media/:id',async (req,res) => {if(!uuid(req.params.id))return res.sendStatus(404);const item=await store.mediaGet(req.params.id);if(!item)return res.sendStatus(404);res.set({'Content-Type':item.mime,'X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox",'Cache-Control':'public, max-age=31536000, immutable'});res.send(item.data)})
  route('post','/messages',requireOrigin,async (req,res) => {if(!await store.credentials())return res.status(503).json({error:'Contact follow-up is not yet configured.'});if(!allowSubmit(client(req)))return res.status(429).json({error:'Please wait before sending another message.'});const {name,email,message,language}=req.body||{};if(typeof name!=='string'||!name.trim()||name.length>120||typeof email!=='string'||email.length>254||!/^\S+@\S+\.\S+$/.test(email)||typeof message!=='string'||!message.trim()||message.length>5000||!['nl','en'].includes(language))return res.status(400).json({error:'Please check your details.'});await store.messageAdd({id:randomUUID(),name:name.trim(),email:email.trim(),message:message.trim(),language});res.status(201).json({ok:true})})
  route('get','/messages',requireAuth,async (_req,res) => res.json({items:await store.messages()}))
  route('patch','/messages/:id',requireOrigin,requireAuth,async (req,res) => {if(!uuid(req.params.id)||!STATES.has(req.body?.status))return res.status(400).json({error:'Invalid status.'});if(!await store.messageStatus(req.params.id,req.body.status))return res.sendStatus(404);res.json({ok:true})})
  route('delete','/messages/:id',requireOrigin,requireAuth,async (req,res) => {if(!uuid(req.params.id)||!await store.messageDelete(req.params.id))return res.sendStatus(404);res.json({ok:true})})
}
