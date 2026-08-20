import { createHash } from 'node:crypto'

/**
 * In-process guards for the intake endpoint: a request rate limit and a
 * short-lived duplicate suppressor.
 *
 * HONEST LIMITATION: both live in module memory, so they are per-instance. On a
 * serverless host several instances run concurrently and each keeps its own
 * counters, so neither is a hard guarantee. They are here because they remove
 * the failure modes that actually happen in practice - an impatient
 * double-click, a retried fetch, a loop hammering the endpoint from one host -
 * at zero infrastructure cost. A real guarantee needs shared state (Redis,
 * Upstash) or a uniqueness constraint in Directus, which is the right fix if
 * this ever becomes more than a prototype.
 */

type Stamp = { at: number }

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000 // 10 minutes
const RATE_LIMIT_MAX = 10 // submissions per window, per key
const DUPLICATE_WINDOW_MS = 60 * 1000 // 1 minute
const MAX_TRACKED_KEYS = 5000 // hard ceiling so memory cannot grow unbounded

const hits = new Map<string, Stamp[]>()
const recent = new Map<string, { at: number; id: string | number | null }>()

/** Drops entries older than `windowMs`, and trims if the map grows too large. */
function prune<T extends { at: number }>(map: Map<string, T | T[]>, windowMs: number) {
  const cutoff = Date.now() - windowMs
  for (const [key, value] of map) {
    if (Array.isArray(value)) {
      const kept = value.filter((v) => v.at > cutoff)
      if (kept.length === 0) map.delete(key)
      else map.set(key, kept)
    } else if (value.at <= cutoff) {
      map.delete(key)
    }
  }
  // Defensive: if a flood outpaces pruning, discard oldest-inserted keys.
  // Map preserves insertion order, so the first keys are the oldest.
  if (map.size > MAX_TRACKED_KEYS) {
    const excess = map.size - MAX_TRACKED_KEYS
    let i = 0
    for (const key of map.keys()) {
      if (i++ >= excess) break
      map.delete(key)
    }
  }
}

export type RateLimitResult = {
  allowed: boolean
  remaining: number
  retryAfterSeconds: number
}

/**
 * Sliding-window rate limit. `key` should be the caller's IP; callers that
 * cannot be identified all share one bucket, which is intentionally strict.
 */
export function checkRateLimit(key: string): RateLimitResult {
  prune(hits as Map<string, Stamp[]>, RATE_LIMIT_WINDOW_MS)

  const now = Date.now()
  const cutoff = now - RATE_LIMIT_WINDOW_MS
  const timestamps = (hits.get(key) ?? []).filter((s) => s.at > cutoff)

  if (timestamps.length >= RATE_LIMIT_MAX) {
    const oldest = timestamps[0]!.at
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((oldest + RATE_LIMIT_WINDOW_MS - now) / 1000))
    }
  }

  timestamps.push({ at: now })
  hits.set(key, timestamps)
  return {
    allowed: true,
    remaining: RATE_LIMIT_MAX - timestamps.length,
    retryAfterSeconds: 0
  }
}

/**
 * Identity of a submission for duplicate detection.
 *
 * Email is lower-cased here (only here - the stored row keeps the visitor's
 * casing) and the series ids are sorted, so "the same submission" is recognised
 * regardless of casing or checkbox order. The newsletter flag is included:
 * re-submitting with the box newly ticked is a different, meaningful intent.
 */
export function submissionFingerprint(input: {
  email: string
  selectedSeriesIds: number[]
  newsletterOptIn: boolean
}): string {
  const canonical = JSON.stringify({
    email: input.email.trim().toLowerCase(),
    series: [...input.selectedSeriesIds].sort((a, b) => a - b),
    newsletter: input.newsletterOptIn
  })
  return createHash('sha256').update(canonical).digest('hex')
}

/** Returns the previous result if this fingerprint was seen very recently. */
export function findRecentSubmission(fingerprint: string) {
  prune(recent as Map<string, { at: number; id: string | number | null }>, DUPLICATE_WINDOW_MS)
  return recent.get(fingerprint) ?? null
}

export function rememberSubmission(fingerprint: string, id: string | number | null) {
  recent.set(fingerprint, { at: Date.now(), id })
}

/** Test seam: clears both maps. */
export function __resetGuards() {
  hits.clear()
  recent.clear()
}

export const GUARD_CONFIG = {
  RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX,
  DUPLICATE_WINDOW_MS
} as const
