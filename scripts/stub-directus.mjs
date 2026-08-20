/**
 * A stand-in for the Directus items API, for local end-to-end testing.
 *
 *   node scripts/stub-directus.mjs [--port=4111] [--fail=CODE] [--delay=ms]
 *
 * Point the app at it with `npm run dev:stub`, which loads .env.stub instead of
 * .env - so the real token is not even present in the process and an accidental
 * write to the shared collection is impossible.
 *
 * It prints every received payload, which is how the outbound row gets eyeballed
 * against the collection schema without creating one.
 *
 * --fail values:
 *   401       invalid credentials
 *   403       no create permission
 *   400       FAILED_VALIDATION (a schema mismatch)
 *   unique    400 RECORD_NOT_UNIQUE (already on file)
 *   409       conflict
 *   429       rate limited
 *   503       service unavailable
 *   500       HTML error page, i.e. a proxy failure
 *   timeout   never respond, so the client's own timeout fires
 *   reset     destroy the socket after reading the body
 */

import { createServer } from 'node:http'

const args = new Map(
  process.argv.slice(2).map((a) => {
    const [k, v = 'true'] = a.replace(/^--/, '').split('=')
    return [k, v]
  })
)

const PORT = Number(args.get('port') ?? 4111)
const FAIL = args.get('fail') ?? ''
const DELAY = Number(args.get('delay') ?? 0)

const err = (message, code) => ({ errors: [{ message, extensions: code ? { code } : {} }] })

const FAILURES = {
  '401': [401, err('Invalid user credentials.', 'INVALID_CREDENTIALS')],
  '403': [403, err('You don’t have permission to access this.', 'FORBIDDEN')],
  '400': [400, err('Value for field "email" is required.', 'FAILED_VALIDATION')],
  unique: [400, err('Field "email" has to be unique.', 'RECORD_NOT_UNIQUE')],
  '409': [409, err('Conflict.', 'CONFLICT')],
  '429': [429, err('Too many requests.', 'REQUESTS_EXCEEDED')],
  '503': [503, err('Service unavailable.', 'SERVICE_UNAVAILABLE')]
}

let count = 0

const server = createServer((req, res) => {
  const chunks = []
  req.on('data', (c) => chunks.push(c))
  req.on('end', async () => {
    const raw = Buffer.concat(chunks).toString('utf8')
    count += 1

    console.log(`\n[stub #${count}] ${req.method} ${req.url}`)
    console.log(`[stub #${count}] auth: ${req.headers.authorization ?? '(none)'}`)

    if (raw) {
      try {
        const parsed = JSON.parse(raw)
        console.log(`[stub #${count}] payload:`)
        console.log(
          Object.entries(parsed)
            .map(([k, v]) => `    ${k.padEnd(16)} ${JSON.stringify(v)}`)
            .join('\n')
        )
        const missing = [
          'first_name',
          'last_name',
          'email',
          'country',
          'gov_org',
          'workshop_series',
          'newsletter'
        ].filter((f) => parsed[f] === undefined || parsed[f] === null || parsed[f] === '')
        console.log(
          missing.length
            ? `[stub #${count}] WARNING required field(s) empty: ${missing.join(', ')}`
            : `[stub #${count}] all required fields present`
        )
      } catch {
        console.log(`[stub #${count}] payload (unparsed): ${raw.slice(0, 300)}`)
      }
    }

    // Health check, so the stub resembles a real instance.
    if (req.url === '/server/ping') {
      res.writeHead(200, { 'Content-Type': 'text/plain' })
      res.end('pong')
      return
    }

    if (DELAY) await new Promise((r) => setTimeout(r, DELAY))

    if (FAIL === 'timeout') {
      console.log(`[stub #${count}] -> never responding (client timeout expected)`)
      return
    }

    if (FAIL === 'reset') {
      console.log(`[stub #${count}] -> destroying socket after reading the body`)
      req.socket.destroy()
      return
    }

    if (FAIL === '500') {
      console.log(`[stub #${count}] -> 500 with an HTML body`)
      res.writeHead(500, { 'Content-Type': 'text/html' })
      res.end('<html><body><h1>502 Bad Gateway</h1></body></html>')
      return
    }

    const failure = FAILURES[FAIL]
    if (failure) {
      const [status, body] = failure
      console.log(`[stub #${count}] -> ${status}`)
      res.writeHead(status, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(body))
      return
    }

    const id = 9000 + count
    console.log(`[stub #${count}] -> 200 created id=${id}`)
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ data: { id } }))
  })
})

server.listen(PORT, '127.0.0.1', () => {
  console.log('='.repeat(72))
  console.log(`  Directus stub listening on http://127.0.0.1:${PORT}`)
  console.log(`  mode  : ${FAIL ? `FAIL=${FAIL}` : 'success'}${DELAY ? ` delay=${DELAY}ms` : ''}`)
  console.log('  Nothing is written to the real collection while the app uses this.')
  console.log('  Start the app with:  npm run dev:stub')
  console.log('='.repeat(72))
})
