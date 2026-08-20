import { describe, it, expect, afterEach } from 'vitest'
import {
  createIntakeItem,
  writeIntakeRow,
  isSafeToRetry,
  UpstreamError,
  ConnectionError,
  SAFE_TO_RETRY_CODES,
  type DirectusWriteOptions
} from '../server/utils/directusClient'
import { buildIntakePayload } from '../utils/intakePayload'
import { startStub, jsonReply, directusError, type Stub } from './helpers/stubDirectus'

const PAYLOAD = buildIntakePayload(
  {
    email: 'rutuj+stub@example.org',
    firstName: 'Rutuj',
    lastName: 'Bhise',
    country: 'United States',
    state: 'MA',
    nonUsCountry: '',
    govAffiliation: "Yes, I'm an employee of a government agency",
    govLevel: 'State or Provincial level',
    newsletterOptIn: true
  },
  [64, 62],
  new Date('2026-08-20T12:00:00.000Z')
)

let stub: Stub | null = null
afterEach(async () => {
  await stub?.close()
  stub = null
})

const opts = (over: Partial<DirectusWriteOptions> = {}): DirectusWriteOptions => ({
  baseUrl: stub!.url,
  collection: 'cw_intake',
  token: 'test-token',
  timeoutMs: 2_000,
  retryDelayMs: 5,
  ...over
})

describe('createIntakeItem: the request it sends', () => {
  it('sends exactly the row we intend to write', async () => {
    // This assertion is the stand-in for writing a real row: it proves the
    // outbound body matches the collection's schema field for field.
    stub = await startStub(jsonReply(200, { data: { id: 9001 } }))
    const id = await createIntakeItem(opts(), PAYLOAD)

    expect(id).toBe(9001)
    expect(stub.requests).toHaveLength(1)
    const req = stub.requests[0]!
    expect(req.method).toBe('POST')
    expect(req.url).toBe('/items/cw_intake')
    expect(req.headers.authorization).toBe('Bearer test-token')
    expect(req.headers['content-type']).toBe('application/json')
    expect(req.json).toEqual({
      first_name: 'Rutuj',
      last_name: 'Bhise',
      email: 'rutuj+stub@example.org',
      country: 'United States',
      state: 'MA',
      gov_org: "Yes, I'm an employee of a government agency",
      gov_level: 'State or Provincial level',
      workshop_series: 'AI for Public-Sector Procurement; AI in Public Health',
      workshops: 'CTI09lxVQDKJhwb8AocicQ; QYgwIYtBRyCPDLVtnJObIg',
      newsletter: true,
      consent_at: '2026-08-20T12:00:00.000Z'
    })
  })

  it('normalises trailing slashes on the base url', async () => {
    stub = await startStub(jsonReply(200, { data: { id: 1 } }))
    await createIntakeItem(opts({ baseUrl: `${stub.url}///` }), PAYLOAD)
    expect(stub.requests[0]!.url).toBe('/items/cw_intake')
  })

  it('percent-encodes a collection name that needs it', async () => {
    stub = await startStub(jsonReply(200, { data: { id: 1 } }))
    await createIntakeItem(opts({ collection: 'odd name/x' }), PAYLOAD)
    expect(stub.requests[0]!.url).toBe('/items/odd%20name%2Fx')
  })

  it('tolerates a success with an empty body', async () => {
    stub = await startStub((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end('')
    })
    await expect(createIntakeItem(opts(), PAYLOAD)).resolves.toBeNull()
  })
})

describe('createIntakeItem: how it classifies responses', () => {
  it('surfaces status and Directus code on a 400', async () => {
    stub = await startStub(
      jsonReply(400, directusError('Value for field "email" is required', 'FAILED_VALIDATION'))
    )
    await expect(createIntakeItem(opts(), PAYLOAD)).rejects.toMatchObject({
      name: 'UpstreamError',
      status: 400,
      directusCode: 'FAILED_VALIDATION'
    })
  })

  it('surfaces a 401', async () => {
    stub = await startStub(jsonReply(401, directusError('Invalid user credentials')))
    await expect(createIntakeItem(opts(), PAYLOAD)).rejects.toMatchObject({ status: 401 })
  })

  it('surfaces RECORD_NOT_UNIQUE, which Directus returns as a 400 not a 409', async () => {
    stub = await startStub(
      jsonReply(400, directusError('Field "email" has to be unique', 'RECORD_NOT_UNIQUE'))
    )
    await expect(createIntakeItem(opts(), PAYLOAD)).rejects.toMatchObject({
      status: 400,
      directusCode: 'RECORD_NOT_UNIQUE'
    })
  })

  it('handles a 500 whose body is HTML, not JSON', async () => {
    stub = await startStub((_req, res) => {
      res.writeHead(500, { 'Content-Type': 'text/html' })
      res.end('<html><body>Bad Gateway</body></html>')
    })
    await expect(createIntakeItem(opts(), PAYLOAD)).rejects.toMatchObject({
      status: 500,
      detail: 'HTTP 500'
    })
  })

  it('turns a timeout into an ambiguous 504, not a connection error', async () => {
    // Handler never answers.
    stub = await startStub(() => {})
    const err = await createIntakeItem(opts({ timeoutMs: 60 }), PAYLOAD).catch((e) => e)
    expect(err).toBeInstanceOf(UpstreamError)
    expect(err.status).toBe(504)
    expect(stub.requests).toHaveLength(1)
  })
})

describe('isSafeToRetry: the rule that protects against duplicate rows', () => {
  it('only ever retries a ConnectionError', () => {
    expect(isSafeToRetry(new UpstreamError(504, 'timeout'))).toBe(false)
    expect(isSafeToRetry(new UpstreamError(500, 'boom'))).toBe(false)
    expect(isSafeToRetry(new Error('generic'))).toBe(false)
    expect(isSafeToRetry(undefined)).toBe(false)
  })

  it.each([...SAFE_TO_RETRY_CODES])('retries %s: nothing was sent', (code) => {
    expect(isSafeToRetry(new ConnectionError('failed', code))).toBe(true)
  })

  it.each([
    'ECONNRESET',
    'EPIPE',
    'UND_ERR_SOCKET',
    'UND_ERR_HEADERS_TIMEOUT',
    'UND_ERR_BODY_TIMEOUT',
    'ERR_STREAM_PREMATURE_CLOSE'
  ])('refuses to retry %s: bytes may already have been written', (code) => {
    expect(isSafeToRetry(new ConnectionError('failed', code))).toBe(false)
  })

  it('refuses to retry an unrecognised code, because unknown means ambiguous', () => {
    expect(isSafeToRetry(new ConnectionError('failed', 'SOMETHING_NEW'))).toBe(false)
    expect(isSafeToRetry(new ConnectionError('failed', undefined))).toBe(false)
  })
})

describe('writeIntakeRow: retry behaviour end to end', () => {
  it('retries a refused connection exactly once, then gives up', async () => {
    // Start and immediately stop a stub so the port is closed but routable.
    const dead = await startStub(jsonReply(200, {}))
    const url = dead.url
    await dead.close()

    let attempts = 0
    const countingFetch = ((...args: Parameters<typeof fetch>) => {
      attempts++
      return globalThis.fetch(...args)
    }) as typeof fetch

    const err = await writeIntakeRow(
      {
        baseUrl: url,
        collection: 'cw_intake',
        token: 't',
        timeoutMs: 500,
        retryDelayMs: 5,
        fetchImpl: countingFetch
      },
      PAYLOAD
    ).catch((e) => e)

    expect(err).toBeInstanceOf(ConnectionError)
    expect(attempts).toBe(2)
  })

  it('does NOT retry when the socket dies mid-request', async () => {
    // The row may already have been committed, so a second attempt could
    // create a duplicate. At most one request must reach the server.
    stub = await startStub((req) => {
      req.socket.destroy()
    })
    const err = await writeIntakeRow(opts(), PAYLOAD).catch((e) => e)
    expect(err).toBeTruthy()
    expect(stub.requests.length).toBeLessThanOrEqual(1)
  })

  it('does not retry a timeout', async () => {
    stub = await startStub(() => {})
    const err = await writeIntakeRow(opts({ timeoutMs: 60 }), PAYLOAD).catch((e) => e)
    expect(err).toBeInstanceOf(UpstreamError)
    expect(stub.requests).toHaveLength(1)
  })

  it('does not retry an HTTP error status', async () => {
    stub = await startStub(jsonReply(500, directusError('nope')))
    await writeIntakeRow(opts(), PAYLOAD).catch(() => {})
    expect(stub.requests).toHaveLength(1)
  })

  it('succeeds on the first attempt without retrying', async () => {
    stub = await startStub(jsonReply(200, { data: { id: 7 } }))
    await expect(writeIntakeRow(opts(), PAYLOAD)).resolves.toBe(7)
    expect(stub.requests).toHaveLength(1)
  })
})
