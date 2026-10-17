// Creates the repo-root .env from .env.example and fills in a JWT_SECRET. Safe to re-run:
// existing values are never overwritten.
import { randomBytes } from 'node:crypto'
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const envPath = `${root}.env`
const examplePath = `${root}.env.example`

if (!existsSync(envPath)) {
  copyFileSync(examplePath, envPath)
  console.log('Created .env from .env.example')
}

let env = readFileSync(envPath, 'utf8')
const value = (key) => env.match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1].trim() ?? ''

if (!value('JWT_SECRET')) {
  const secret = randomBytes(32).toString('hex')
  env = /^JWT_SECRET=.*$/m.test(env)
    ? env.replace(/^JWT_SECRET=.*$/m, `JWT_SECRET=${secret}`)
    : `${env.trimEnd()}\nJWT_SECRET=${secret}\n`
  writeFileSync(envPath, env)
  console.log('Generated JWT_SECRET')
}

const missing = []
if (!value('GOOGLE_CLIENT_ID')) missing.push('GOOGLE_CLIENT_ID (sign-in will not work)')
if (!value('GEMINI_API_KEY') && !value('ANTHROPIC_API_KEY')) {
  missing.push('GEMINI_API_KEY or ANTHROPIC_API_KEY (chat and document analysis will be off)')
}
if (missing.length) {
  console.log('\nStill to fill in .env:')
  for (const m of missing) console.log(`  - ${m}`)
}
