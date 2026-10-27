import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import express from 'express'
import { createRequestLimiter } from './security-http.mjs'

const deriveKey = promisify(scrypt)
// Only a salted verifier is deployed; the password never enters the client bundle.
const SALT = 'fd6022017abff739e3d7e749066cbb70'
const VERIFIER = Buffer.from('5264fa6165cfe23fe83be7e5f0b1cef2597c422870d5d4c8fbc3c79f5f4d6f8fa02bad66860678879981e22b7dd143df5f677e8cf60b99a7b839e1a5b032e10e', 'hex')
const COOKIE = 'house_access'
const SESSION_MS = 12 * 60 * 60 * 1000

function loginPage(message = '') {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<title>House of Tobias · Sign in</title><style>
:root{font-family:'Hanken Grotesk',system-ui,sans-serif;color-scheme:light dark;background:#f4f3ef;color:#20221e}
*{box-sizing:border-box}body{margin:0;min-height:100svh;display:grid;place-items:center;padding:24px}
main{width:100%;max-width:360px}h1{font-size:30px;letter-spacing:-1px;margin:0 0 12px}p{color:#62645e;line-height:1.5;margin:0 0 32px}
label{display:block;font-size:14px;margin-bottom:8px}input,button{width:100%;font:inherit;border-radius:8px;padding:13px 14px}
input{border:1px solid #93968b;background:transparent;color:inherit}button{border:0;background:#242b22;color:white;margin-top:16px;cursor:pointer}
button:hover{background:#414d3c}:focus-visible{outline:3px solid #6d8059;outline-offset:3px}.error{color:#a12424;margin:16px 0 0;font-size:14px}
@media(prefers-color-scheme:dark){:root{background:#1c1e1a;color:#f3f3ed}p{color:#b7bbb0}button{background:#dbe3d1;color:#20251b}button:hover{background:#c5d1b6}.error{color:#ffb3ad}}
</style></head><body><main><h1>House of Tobias</h1><p>Enter the password to continue.</p>
<form method="post" action="/__house/unlock"><label for="password">Password</label>
<input id="password" name="password" type="password" autocomplete="current-password" required maxlength="256" autofocus>
${message ? `<p class="error" role="alert">${message}</p>` : ''}<button type="submit">Continue</button></form></main></body></html>`
}

export function registerRootAccess(app, { now = Date.now } = {}) {
  const sessions = new Map()
  const allowAttempt = createRequestLimiter({ rate: 1 / 12, burst: 5 })
  const showLogin = (response, status = 401, message = '') => {
    response.set('Cache-Control', 'no-store')
    response.set('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'")
    response.set('X-Content-Type-Options', 'nosniff')
    return response.status(status).type('html').send(loginPage(message))
  }

  app.post('/__house/unlock', express.urlencoded({ extended: false, limit: '1kb' }), async (request, response, next) => {
    response.set('Cache-Control', 'no-store')
    // Check the form's origin without trusting arbitrary forwarded-host headers.
    const origin = request.get('origin')
    if (origin) {
      try {
        if (new URL(origin).host !== request.get('host')) return showLogin(response, 403, 'Please sign in from this website.')
      } catch { return showLogin(response, 403, 'Please sign in from this website.') }
    }
    const client = request.get('do-connecting-ip') || request.socket.remoteAddress
    if (!allowAttempt(client)) {
      response.set('Retry-After', '12')
      return showLogin(response, 429, 'Too many attempts. Please wait a moment and try again.')
    }
    try {
      const password = request.body?.password
      if (typeof password !== 'string' || password.length > 256) return showLogin(response, 401, 'Incorrect password. Please try again.')
      const supplied = await deriveKey(password, SALT, VERIFIER.length)
      if (!timingSafeEqual(supplied, VERIFIER)) return showLogin(response, 401, 'Incorrect password. Please try again.')
      for (const [token, expires] of sessions) if (expires <= now()) sessions.delete(token)
      if (sessions.size >= 4096) sessions.delete(sessions.keys().next().value)
      const token = randomBytes(32).toString('base64url')
      sessions.set(token, now() + SESSION_MS)
      response.cookie(COOKIE, token, { httpOnly: true, secure: true, sameSite: 'strict', maxAge: SESSION_MS, path: '/' })
      return response.redirect(303, '/')
    } catch (error) { next(error) }
  })

  return (request, response, next) => {
    response.set('Cache-Control', 'no-store')
    const token = String(request.headers.cookie || '').split(';').map(value => value.trim()).find(value => value.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1)
    if (token && (sessions.get(token) || 0) > now()) return next()
    if (token) sessions.delete(token)
    return showLogin(response)
  }
}
