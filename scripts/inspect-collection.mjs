/**
 * Inspects the Directus intake collection so the payload can be built against
 * the real schema instead of guessed field names.
 *
 *   node scripts/inspect-collection.mjs
 *
 * Reads NUXT_DIRECTUS_* from .env. The token is never printed - only whether it
 * is present and what it is allowed to do.
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

/** Minimal .env reader: no dependency, and tolerant of comments/blank lines. */
function readEnv() {
  let raw = ''
  try {
    raw = readFileSync(join(root, '.env'), 'utf8')
  } catch {
    return {}
  }
  const out = {}
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i === -1) continue
    // Strip surrounding quotes in case they were pasted in by habit.
    out[t.slice(0, i).trim()] = t
      .slice(i + 1)
      .trim()
      .replace(/^["']|["']$/g, '')
  }
  return out
}

const env = readEnv()
const BASE = (env.NUXT_DIRECTUS_URL || 'https://burnes-center.directus.app').replace(/\/+$/, '')
const COLLECTION = env.NUXT_INTAKE_COLLECTION || 'cw_intake'
const TOKEN = env.NUXT_DIRECTUS_TOKEN || ''

if (!TOKEN || TOKEN === 'PASTE_YOUR_ACCESS_TOKEN_HERE') {
  console.error(
    '\n  No token found.\n' +
      '  Open replica/.env and replace PASTE_YOUR_ACCESS_TOKEN_HERE with the access token.\n'
  )
  process.exit(1)
}

const get = async (path) => {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${TOKEN}` }
  })
  let body = null
  try {
    body = await res.json()
  } catch {
    /* non-JSON response */
  }
  return { status: res.status, ok: res.ok, body }
}

const line = (n = 78) => console.log('-'.repeat(n))

console.log(`\nDirectus : ${BASE}`)
console.log(`Collection: ${COLLECTION}`)
console.log(`Token    : present (${TOKEN.length} chars, value not shown)`)

// 1. Who does this token authenticate as, and is it even valid?
const me = await get('/users/me?fields=id,status,role.name,role.admin_access,role.app_access')
line()
if (me.ok) {
  const d = me.body?.data ?? {}
  console.log('Token identity:')
  console.log(`  user id     : ${d.id ?? '(n/a)'}`)
  console.log(`  status      : ${d.status ?? '(n/a)'}`)
  console.log(`  role        : ${d.role?.name ?? '(n/a)'}`)
  console.log(`  admin access: ${d.role?.admin_access ?? '(n/a)'}`)
} else {
  console.log(`Token identity: FAILED (HTTP ${me.status})`)
  console.log(`  ${me.body?.errors?.[0]?.message ?? 'no message'}`)
  console.log('  A static token still works for items even if /users/me is denied.')
}

// 2. The field list - the thing we actually need.
const fields = await get(`/fields/${COLLECTION}`)
line()
if (fields.ok && Array.isArray(fields.body?.data)) {
  const rows = fields.body.data.map((f) => ({
    field: f.field,
    type: f.type,
    required: f.schema?.is_nullable === false || f.meta?.required === true ? 'yes' : '',
    nullable: f.schema?.is_nullable === false ? 'no' : 'yes',
    default: f.schema?.default_value ?? '',
    interface: f.meta?.interface ?? '',
    choices: (f.meta?.options?.choices ?? [])
      .map((c) => c.value ?? c.text)
      .join(' | ')
      .slice(0, 60)
  }))
  console.log(`Fields in "${COLLECTION}" (${rows.length}):\n`)
  const pad = (s, n) => String(s ?? '').padEnd(n).slice(0, n)
  console.log(
    pad('FIELD', 28) + pad('TYPE', 14) + pad('REQ', 5) + pad('NULL', 6) + 'INTERFACE / CHOICES'
  )
  line()
  for (const r of rows) {
    console.log(
      pad(r.field, 28) +
        pad(r.type, 14) +
        pad(r.required, 5) +
        pad(r.nullable, 6) +
        (r.choices ? `${r.interface}: ${r.choices}` : r.interface)
    )
  }
} else {
  console.log(`Field list: NOT READABLE (HTTP ${fields.status})`)
  console.log(`  ${fields.body?.errors?.[0]?.message ?? 'no message'}`)
  console.log('  This is normal for a create-only token. Falling back to a probe below.')
}

// 3. Can we read items? Useful, not required - a create-only token cannot.
const items = await get(`/items/${COLLECTION}?limit=1`)
line()
console.log(`Read items: HTTP ${items.status}${items.ok ? ' (allowed)' : ' (denied)'}`)
if (items.ok && Array.isArray(items.body?.data)) {
  const sample = items.body.data[0]
  console.log(
    sample
      ? `  existing keys: ${Object.keys(sample).join(', ')}`
      : '  collection is empty'
  )
} else {
  console.log(`  ${items.body?.errors?.[0]?.message ?? ''}`)
}

// 4. If the schema was not readable, provoke a validation error to learn the
//    field names. An empty payload makes Directus name what it is unhappy about
//    without creating a row.
if (!fields.ok) {
  line()
  console.log('Probing required fields with an empty payload (creates nothing):')
  const res = await fetch(`${BASE}/items/${COLLECTION}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  })
  let body = null
  try {
    body = await res.json()
  } catch {
    /* ignore */
  }
  console.log(`  HTTP ${res.status}`)
  for (const e of body?.errors ?? []) {
    console.log(`  - ${e.message}`)
    if (e.extensions?.field) console.log(`    field: ${e.extensions.field}`)
  }
  if (res.ok) {
    console.log('  NOTE: the empty payload was ACCEPTED and created a row.')
    console.log(`  Created id: ${body?.data?.id ?? '(unknown)'} - delete it in the Directus admin.`)
  }
}

line()
console.log('Done. Paste the output above (it contains no secrets).\n')
