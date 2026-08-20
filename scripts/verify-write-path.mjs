/**
 * Proves the configured token can CREATE in the intake collection - without
 * creating anything.
 *
 *   npm run verify
 *
 * The trick is the last probe: POST an empty object. Directus runs auth and
 * permission checks BEFORE payload validation, so the status is diagnostic:
 *
 *   401  token is invalid
 *   403  authenticated but NOT allowed to create   <- the failure you do not
 *                                                     want to meet for the
 *                                                     first time on the real
 *                                                     submission
 *   400  allowed to create; validation rejected the empty body, and the error
 *        names the required fields so they can be diffed against our payload
 *
 * A row cannot be created, because every required field is absent. The 200 case
 * is still handled loudly, just in case the schema ever changes.
 *
 * Prints no secrets.
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function readEnv(file) {
  let raw = ''
  try {
    raw = readFileSync(join(root, file), 'utf8')
  } catch {
    return {}
  }
  const out = {}
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i === -1) continue
    out[t.slice(0, i).trim()] = t
      .slice(i + 1)
      .trim()
      .replace(/^["']|["']$/g, '')
  }
  return out
}

const env = readEnv('.env')
const BASE = (env.NUXT_DIRECTUS_URL || '').replace(/\/+$/, '')
const COLLECTION = env.NUXT_INTAKE_COLLECTION || 'cw_intake'
const TOKEN = env.NUXT_DIRECTUS_TOKEN || ''

/** Field names our payload sends. Kept in sync with utils/intakePayload.ts. */
const PAYLOAD_FIELDS = [
  'first_name',
  'last_name',
  'email',
  'country',
  'state',
  'gov_org',
  'gov_level',
  'workshop_series',
  'workshops',
  'newsletter',
  'consent_at'
]

const line = () => console.log('-'.repeat(74))
const fail = (msg) => {
  console.error(`\n  FAIL: ${msg}\n`)
  process.exit(1)
}

if (!BASE) fail('NUXT_DIRECTUS_URL is not set in .env')
if (!TOKEN || TOKEN === 'PASTE_YOUR_ACCESS_TOKEN_HERE')
  fail('NUXT_DIRECTUS_TOKEN is not set in .env')

const req = async (path, init = {}) => {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {})
    }
  })
  let body = null
  try {
    body = await res.json()
  } catch {
    /* non-JSON */
  }
  return { status: res.status, ok: res.ok, body }
}

console.log(`\nDirectus  : ${BASE}`)
console.log(`Collection: ${COLLECTION}`)
console.log(`Token     : present (${TOKEN.length} chars, not shown)`)

let verdictCreate = 'unknown'

// 1. Is the token valid at all?
line()
const me = await req('/users/me?fields=id,status,role.name')
if (me.ok) {
  const d = me.body?.data ?? {}
  console.log(`1. Token identity      OK  user=${d.id ?? '?'} role=${d.role?.name ?? 'n/a'}`)
} else {
  console.log(`1. Token identity      HTTP ${me.status} (a static token may still work for items)`)
}

// 2. What does Directus say we may do?
const perms = await req(`/permissions/me?filter[collection][_eq]=${COLLECTION}`)
if (perms.ok) {
  const rows = Array.isArray(perms.body?.data) ? perms.body.data : []
  const actions = [...new Set(rows.map((r) => r.action).filter(Boolean))]
  console.log(
    `2. Declared permissions OK  ${actions.length ? actions.join(', ') : '(none reported)'}`
  )
} else {
  console.log(`2. Declared permissions HTTP ${perms.status} (not readable; relying on probe 4)`)
}

// 3. Can we read? Not required, but it enables the post-submission lookup.
const read = await req(`/items/${COLLECTION}?limit=1&fields=id`)
console.log(
  `3. Read items           ${read.ok ? 'ALLOWED' : `DENIED (HTTP ${read.status})`}` +
    `${read.ok ? '  -> the id lookup after submission is available' : ''}`
)

// 4. The probe. Creates nothing.
line()
console.log('4. Create probe: POST {} (cannot create a row - all required fields absent)')
const probe = await req(`/items/${COLLECTION}`, { method: 'POST', body: JSON.stringify({}) })
console.log(`   HTTP ${probe.status}`)

const errors = probe.body?.errors ?? []
const codes = errors.map((e) => e.extensions?.code).filter(Boolean)
const namedFields = [...new Set(errors.map((e) => e.extensions?.field).filter(Boolean))]

for (const e of errors.slice(0, 4)) {
  console.log(`   - ${e.message}${e.extensions?.field ? `  [field: ${e.extensions.field}]` : ''}`)
}

if (probe.ok) {
  const id = probe.body?.data?.id
  console.log(`\n   WARNING: the empty payload was ACCEPTED and created row id=${id}.`)
  console.log('   The schema must have changed. Delete that row in the Directus admin.')
  verdictCreate = 'created-a-row'
} else if (probe.status === 401) {
  verdictCreate = 'invalid-token'
} else if (probe.status === 403) {
  verdictCreate = 'no-create-permission'
} else if (probe.status === 400) {
  verdictCreate = codes.includes('FAILED_VALIDATION') ? 'confirmed' : 'confirmed-probably'
} else {
  verdictCreate = `unexpected-${probe.status}`
}

// 5. Do the fields Directus demands match what we send?
if (namedFields.length) {
  line()
  const unknown = namedFields.filter((f) => !PAYLOAD_FIELDS.includes(f))
  console.log(`5. Required fields named by Directus: ${namedFields.join(', ')}`)
  console.log(
    unknown.length
      ? `   MISMATCH: our payload does not send: ${unknown.join(', ')}`
      : '   All named fields are present in our payload.'
  )
}

// Verdict
line()
const verdicts = {
  confirmed: ['PASS', 'Create permission confirmed. The real submission should succeed.'],
  'confirmed-probably': [
    'PASS',
    'Validation rejected the empty body, so create permission exists.'
  ],
  'no-create-permission': [
    'FAIL',
    'Authenticated but NOT allowed to create. The real submission WILL fail - get a token with create rights on this collection.'
  ],
  'invalid-token': ['FAIL', 'The token is not valid.'],
  'created-a-row': ['WARN', 'A row was created by the probe. Delete it before submitting.']
}
const [tag, msg] = verdicts[verdictCreate] ?? ['WARN', `Unexpected result: ${verdictCreate}`]
console.log(`\n  ${tag}: ${msg}\n`)
process.exit(tag === 'FAIL' ? 1 : 0)
