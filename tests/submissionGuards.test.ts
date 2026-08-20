import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  checkRateLimit,
  submissionFingerprint,
  findRecentSubmission,
  rememberSubmission,
  __resetGuards,
  GUARD_CONFIG
} from '../server/utils/submissionGuards'

beforeEach(() => {
  __resetGuards()
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-08-20T12:00:00.000Z'))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('checkRateLimit', () => {
  it('allows exactly the configured number of submissions', () => {
    for (let i = 0; i < GUARD_CONFIG.RATE_LIMIT_MAX; i++) {
      const r = checkRateLimit('1.2.3.4')
      expect(r.allowed, `call ${i + 1} should be allowed`).toBe(true)
    }
    const over = checkRateLimit('1.2.3.4')
    expect(over.allowed).toBe(false)
    expect(over.remaining).toBe(0)
    expect(over.retryAfterSeconds).toBeGreaterThan(0)
  })

  it('counts down the remaining allowance', () => {
    const first = checkRateLimit('1.2.3.4')
    expect(first.remaining).toBe(GUARD_CONFIG.RATE_LIMIT_MAX - 1)
  })

  it('keeps separate buckets per key', () => {
    for (let i = 0; i < GUARD_CONFIG.RATE_LIMIT_MAX; i++) checkRateLimit('1.1.1.1')
    expect(checkRateLimit('1.1.1.1').allowed).toBe(false)
    // A different caller is unaffected.
    expect(checkRateLimit('2.2.2.2').allowed).toBe(true)
  })

  it('lets the window slide: allowance returns once entries age out', () => {
    for (let i = 0; i < GUARD_CONFIG.RATE_LIMIT_MAX; i++) checkRateLimit('9.9.9.9')
    expect(checkRateLimit('9.9.9.9').allowed).toBe(false)

    vi.advanceTimersByTime(GUARD_CONFIG.RATE_LIMIT_WINDOW_MS + 1000)
    expect(checkRateLimit('9.9.9.9').allowed).toBe(true)
  })

  it('reports a retry-after that never advises retrying immediately', () => {
    for (let i = 0; i < GUARD_CONFIG.RATE_LIMIT_MAX; i++) checkRateLimit('5.5.5.5')
    // Just before the window expires, the hint must still be at least 1 second.
    vi.advanceTimersByTime(GUARD_CONFIG.RATE_LIMIT_WINDOW_MS - 10)
    const r = checkRateLimit('5.5.5.5')
    expect(r.allowed).toBe(false)
    expect(r.retryAfterSeconds).toBeGreaterThanOrEqual(1)
  })
})

describe('submissionFingerprint', () => {
  const base = {
    email: 'rutuj+1@example.org',
    selectedSeriesIds: [64, 62],
    newsletterOptIn: true
  }

  it('ignores the order the series were ticked in', () => {
    expect(submissionFingerprint(base)).toBe(
      submissionFingerprint({ ...base, selectedSeriesIds: [62, 64] })
    )
  })

  it('ignores email casing and surrounding spaces', () => {
    expect(submissionFingerprint(base)).toBe(
      submissionFingerprint({ ...base, email: '  Rutuj+1@Example.ORG ' })
    )
  })

  it('treats a changed newsletter choice as a different submission', () => {
    // Re-submitting with the box newly ticked is a real, meaningful intent and
    // must not be swallowed as a duplicate.
    expect(submissionFingerprint(base)).not.toBe(
      submissionFingerprint({ ...base, newsletterOptIn: false })
    )
  })

  it('treats a different series selection as a different submission', () => {
    expect(submissionFingerprint(base)).not.toBe(
      submissionFingerprint({ ...base, selectedSeriesIds: [64] })
    )
  })

  it('treats a different person as a different submission', () => {
    expect(submissionFingerprint(base)).not.toBe(
      submissionFingerprint({ ...base, email: 'someone.else@example.org' })
    )
  })

  it('is a stable hex digest', () => {
    const fp = submissionFingerprint(base)
    expect(fp).toMatch(/^[0-9a-f]{64}$/)
    expect(submissionFingerprint(base)).toBe(fp)
  })
})

describe('duplicate suppression window', () => {
  const fp = 'a'.repeat(64)

  it('does not report an unseen submission', () => {
    expect(findRecentSubmission(fp)).toBeNull()
  })

  it('remembers a submission and returns the original id', () => {
    rememberSubmission(fp, 123)
    expect(findRecentSubmission(fp)).toMatchObject({ id: 123 })
  })

  it('still remembers just inside the window', () => {
    rememberSubmission(fp, 123)
    vi.advanceTimersByTime(GUARD_CONFIG.DUPLICATE_WINDOW_MS - 100)
    expect(findRecentSubmission(fp)).not.toBeNull()
  })

  it('forgets once the window has passed, so a genuine resubmit works', () => {
    rememberSubmission(fp, 123)
    vi.advanceTimersByTime(GUARD_CONFIG.DUPLICATE_WINDOW_MS + 100)
    expect(findRecentSubmission(fp)).toBeNull()
  })

  it('handles a null id, which is what a 409 records', () => {
    rememberSubmission(fp, null)
    expect(findRecentSubmission(fp)).toMatchObject({ id: null })
  })
})
