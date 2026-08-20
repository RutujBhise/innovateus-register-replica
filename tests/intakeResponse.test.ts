import { describe, it, expect } from 'vitest'
import { mapWriteFailure, describeFailure } from '../server/utils/intakeResponse'
import { UpstreamError, ConnectionError } from '../server/utils/directusClient'

describe('mapWriteFailure: duplicates', () => {
  it('treats a 409 as already-on-file', () => {
    expect(mapWriteFailure(new UpstreamError(409, 'conflict'))).toEqual({ kind: 'duplicate' })
  })

  it('treats RECORD_NOT_UNIQUE as already-on-file even though it arrives as a 400', () => {
    // Directus reports a uniqueness clash this way, not as a 409, so the code
    // check is what actually fires in practice.
    expect(
      mapWriteFailure(new UpstreamError(400, 'Field "email" has to be unique', 'RECORD_NOT_UNIQUE'))
    ).toEqual({ kind: 'duplicate' })
  })
})

describe('mapWriteFailure: status mapping', () => {
  it.each([401, 403])('maps %i to a 502 with a neutral message', (status) => {
    const out = mapWriteFailure(new UpstreamError(status, 'whatever'))
    expect(out).toMatchObject({ kind: 'error', statusCode: 502 })
  })

  it.each([400, 422])('maps %i to a 502, since a schema mismatch is our bug', (status) => {
    const out = mapWriteFailure(new UpstreamError(status, 'bad payload'))
    expect(out).toMatchObject({ kind: 'error', statusCode: 502 })
    expect((out as { statusMessage: string }).statusMessage).toMatch(/could not record/i)
  })

  it.each([429, 503, 504])('maps %i to a 503 with retry-is-honest wording', (status) => {
    const out = mapWriteFailure(new UpstreamError(status, 'busy'))
    expect(out).toMatchObject({ kind: 'error', statusCode: 503 })
    expect((out as { statusMessage: string }).statusMessage).toMatch(/try again/i)
  })

  it.each([
    ['a ConnectionError', new ConnectionError('socket died', 'ECONNRESET')],
    ['a plain Error', new Error('something odd')],
    ['undefined', undefined],
    ['a string', 'nope'],
    ['an unmapped status', new UpstreamError(418, "I'm a teapot")]
  ])('falls back to a generic 502 for %s', (_label, err) => {
    expect(mapWriteFailure(err)).toMatchObject({ kind: 'error', statusCode: 502 })
  })
})

describe('mapWriteFailure: does not leak upstream detail', () => {
  // The security-relevant assertion in this file. An auth failure describes our
  // credentials; a validation failure describes our schema. Neither may reach a
  // visitor's browser.
  const secrets = [
    'Invalid user credentials',
    'token',
    'abc123SECRET',
    'directus_users',
    'cw_intake',
    'permission'
  ]

  it.each([401, 403, 400, 422, 429, 503, 504, 500, 418])(
    'strips the detail from a %i',
    (status) => {
      const detail = `Invalid user credentials for token abc123SECRET on cw_intake (permission denied on directus_users)`
      const out = mapWriteFailure(new UpstreamError(status, detail, 'SOME_CODE'))
      if (out.kind === 'duplicate') return
      for (const s of secrets) {
        expect(out.statusMessage.toLowerCase()).not.toContain(s.toLowerCase())
      }
      expect(out.statusMessage).not.toContain('SOME_CODE')
      expect(out.statusMessage).not.toContain(String(status))
    }
  )

  it('always produces a message that reads as visitor-facing English', () => {
    for (const status of [401, 400, 429, 500]) {
      const out = mapWriteFailure(new UpstreamError(status, 'internal detail'))
      if (out.kind === 'duplicate') continue
      expect(out.statusMessage).toMatch(/^[A-Z]/)
      expect(out.statusMessage.trim()).toMatch(/[.!]$/)
    }
  })
})

describe('describeFailure: what goes in the server log', () => {
  it('keeps the detail, which is exactly why it is log-only', () => {
    const line = describeFailure(new UpstreamError(401, 'Invalid credentials', 'INVALID_TOKEN'))
    expect(line).toContain('status=401')
    expect(line).toContain('code=INVALID_TOKEN')
    expect(line).toContain('Invalid credentials')
  })

  it('reports a connection failure with its code', () => {
    const line = describeFailure(new ConnectionError('fetch failed', 'ECONNREFUSED'))
    expect(line).toContain('status=none')
    expect(line).toContain('code=ECONNREFUSED')
  })

  it('never throws on an unexpected value', () => {
    expect(() => describeFailure(undefined)).not.toThrow()
    expect(() => describeFailure(null)).not.toThrow()
    expect(() => describeFailure({ weird: true })).not.toThrow()
    expect(describeFailure(undefined)).toContain('status=none')
  })
})
