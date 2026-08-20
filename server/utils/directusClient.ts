import type { IntakePayload } from '../../utils/intakePayload'

/**
 * Transport for writing a row to Directus.
 *
 * Extracted from the route handler for one concrete reason: `useRuntimeConfig`
 * and the other Nitro globals only exist inside a Nitro build, so any module
 * that touches them cannot be imported by a plain unit test. Everything here
 * takes its configuration as an argument and its `fetch` as an injectable
 * option, so the whole transport - including the timeout and the retry decision
 * - is testable against a local stub server with no Nuxt runtime.
 */

/** Directus answered with a status. The write may or may not have happened. */
export class UpstreamError extends Error {
  constructor(
    readonly status: number,
    readonly detail: string,
    readonly directusCode?: string
  ) {
    super(detail)
    this.name = 'UpstreamError'
  }
}

/** No HTTP response was received. `code` says whether anything was sent. */
export class ConnectionError extends Error {
  constructor(
    message: string,
    readonly code?: string
  ) {
    super(message)
    this.name = 'ConnectionError'
  }
}

/**
 * Connection failures where we can prove the request never reached Directus, so
 * a retry cannot create a second row.
 *
 * This is a whitelist on purpose. Node's fetch rejects with the same
 * `TypeError: fetch failed` for "nothing was sent" and for "the bytes were sent
 * and the socket then died" - the latter includes ECONNRESET, EPIPE and the
 * UND_ERR_* body/headers timeouts, any of which can happen *after* Directus has
 * already committed the row. Retrying those would create the duplicate this
 * guard exists to prevent, so anything not listed here is treated as ambiguous
 * and is never retried.
 */
export const SAFE_TO_RETRY_CODES: ReadonlySet<string> = new Set([
  'ECONNREFUSED',
  'ENOTFOUND',
  'EAI_AGAIN',
  'ENETUNREACH',
  'EHOSTUNREACH',
  'UND_ERR_CONNECT_TIMEOUT'
])

export function isSafeToRetry(err: unknown): boolean {
  if (!(err instanceof ConnectionError)) return false
  return !!err.code && SAFE_TO_RETRY_CODES.has(err.code)
}

/** Digs the OS/undici error code out of a fetch rejection. */
function errorCode(err: unknown): string | undefined {
  const e = err as { code?: unknown; cause?: { code?: unknown } }
  const code = e?.cause?.code ?? e?.code
  return typeof code === 'string' ? code : undefined
}

export type DirectusWriteOptions = {
  baseUrl: string
  collection: string
  token: string
  /** Per-attempt budget. Default 6s, chosen to fit inside a 10s platform cap. */
  timeoutMs?: number
  /** Ceiling for attempt + retry together. Default 9s. */
  totalBudgetMs?: number
  /** Injected in tests. */
  fetchImpl?: typeof fetch
  /** Pause before the retry. Default 250ms. */
  retryDelayMs?: number
}

export const DEFAULTS = {
  /**
   * Sized for the deployment target. Netlify's synchronous functions time out
   * at 10s on the free tier and that ceiling cannot be raised there, so the
   * whole write - first attempt plus a possible retry - has to finish inside it
   * with room to spare. Overrunning would hand the visitor the platform's error
   * page instead of our own handled 503. Directus answers well under a second
   * in practice, so 5s per attempt is already generous.
   */
  timeoutMs: 5_000,
  totalBudgetMs: 8_000,
  retryDelayMs: 250,
  minRetryTimeoutMs: 1_500
} as const

type DirectusCreateResponse = { data?: { id?: string | number } }

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** One attempt. Exported so a test can drive exactly one request. */
export async function createIntakeItem(
  opts: DirectusWriteOptions,
  payload: IntakePayload,
  timeoutMs = opts.timeoutMs ?? DEFAULTS.timeoutMs
): Promise<string | number | null> {
  const doFetch = opts.fetchImpl ?? globalThis.fetch
  const base = opts.baseUrl.replace(/\/+$/, '')
  const url = `${base}/items/${encodeURIComponent(opts.collection)}`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  let res: Response
  try {
    res = await doFetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${opts.token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    })
  } catch (err) {
    // A timeout is ambiguous: Directus may have received and committed the row
    // before we stopped waiting. Surface it as an upstream failure, which is
    // never retried, rather than as a ConnectionError.
    if (err instanceof Error && err.name === 'AbortError') {
      throw new UpstreamError(504, 'Directus did not respond in time')
    }
    throw new ConnectionError(
      err instanceof Error ? err.message : 'connection failed',
      errorCode(err)
    )
  } finally {
    clearTimeout(timer)
  }

  let body: unknown = null
  try {
    body = await res.json()
  } catch {
    /* empty or non-JSON body, e.g. an HTML error page from a proxy */
  }

  if (!res.ok) {
    const first = (
      body as { errors?: Array<{ message?: string; extensions?: { code?: string } }> }
    )?.errors?.[0]
    throw new UpstreamError(
      res.status,
      first?.message ?? `HTTP ${res.status}`,
      first?.extensions?.code
    )
  }

  return (body as DirectusCreateResponse)?.data?.id ?? null
}

/**
 * One attempt, plus at most one retry when - and only when - the first failure
 * proves nothing was written. The retry gets whatever is left of the total
 * budget so the pair cannot outlive the platform's function timeout.
 */
export async function writeIntakeRow(
  opts: DirectusWriteOptions,
  payload: IntakePayload
): Promise<string | number | null> {
  const started = Date.now()
  const totalBudget = opts.totalBudgetMs ?? DEFAULTS.totalBudgetMs
  const retryDelay = opts.retryDelayMs ?? DEFAULTS.retryDelayMs

  try {
    return await createIntakeItem(opts, payload)
  } catch (err) {
    if (!isSafeToRetry(err)) throw err

    await sleep(retryDelay)

    const remaining = totalBudget - (Date.now() - started)
    // Never below a floor: a 20ms budget would fail for no useful reason.
    const retryTimeout = Math.max(DEFAULTS.minRetryTimeoutMs, remaining)
    return await createIntakeItem(opts, payload, retryTimeout)
  }
}
