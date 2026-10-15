// Run manually. Secrets are written only to the explicitly requested external file.
import { randomBytes } from 'node:crypto'
import { writeFile } from 'node:fs/promises'
import { isAbsolute, relative, resolve } from 'node:path'
import webpush from 'web-push'

const target = process.argv[2]
if (!target || !isAbsolute(target)) throw new Error('Supply an absolute output path outside this checkout.')
const within = relative(resolve('.'), resolve(target))
if (!within.startsWith('..') && !isAbsolute(within)) throw new Error('Do not write runtime secrets into the checkout.')
const keys = webpush.generateVAPIDKeys()
await writeFile(target, [
  `NYC_TRIP_ADMIN_TOKEN=${randomBytes(32).toString('base64url')}`,
  `NYC_VAPID_PUBLIC_KEY=${keys.publicKey}`,
  `NYC_VAPID_PRIVATE_KEY=${keys.privateKey}`,
  'NYC_VAPID_SUBJECT=https://frost-design.be/dpnyc/',
  '',
].join('\n'), { flag: 'wx', mode: 0o600 })
console.log('Runtime configuration written. Add these values as encrypted environment variables in House of Tobias. Keep the same VAPID keys after launch.')
