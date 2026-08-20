import type { H3Event } from 'h3'
import { buildIntakePayload } from '../../utils/intakePayload'
import { validateIntakeInput } from '../utils/validateIntake'
import { writeIntakeRow } from '../utils/directusClient'
import { mapWriteFailure, describeFailure } from '../utils/intakeResponse'
import {
  checkRateLimit,
  submissionFingerprint,
  findRecentSubmission,
  rememberSubmission
} from '../utils/submissionGuards'

/**
 * POST /api/intake
 *
 * Records a registration-form submission - including the newsletter opt-in - as
 * a row in the Directus `cw_intake` collection.
 *
 * Why the page does not post to Directus directly:
 *   1. The access token must never reach the browser. It is read from
 *      runtimeConfig, which Nuxt keeps server-only.
 *   2. Validation the client cannot bypass. This writes to a shared collection,
 *      so the endpoint re-checks everything the form checks.
 *   3. `consent_at` is stamped from the server clock. A client-supplied
 *      timestamp on a consent record is worthless.
 *
 * This file is deliberately thin. The parts worth testing - payload mapping,
 * validation, the abuse guards, the HTTP transport and the error mapping - all
 * live in modules that have no Nitro dependency, because `useRuntimeConfig` and
 * friends only exist inside a Nitro build and cannot be imported by a unit test.
 * That call is made here, once, and passed down.
 *
 * Responses:
 *   200 { ok, stored, duplicate?, id }
 *   400 { statusMessage, data: { errors: { field: message } } }
 *   413 body too large
 *   429 { statusMessage } + Retry-After
 *   502 upstream rejected or failed
 *   503 not configured, or upstream busy
 */

const MAX_BODY_BYTES = 16 * 1024

function clientIp(event: H3Event): string {
  // Behind a proxy the socket address is the proxy's, so prefer the first hop
  // in X-Forwarded-For. Spoofable in principle, which is fine: the rate limit
  // is a courtesy guard, not an authorisation boundary.
  const fwd = getRequestHeader(event, 'x-forwarded-for')
  const first = fwd?.split(',')[0]?.trim()
  return first || event.node.req.socket.remoteAddress || 'unknown'
}

export default defineEventHandler(async (event) => {
  const started = Date.now()

  const declared = Number(getRequestHeader(event, 'content-length') ?? 0)
  if (declared > MAX_BODY_BYTES) {
    throw createError({ statusCode: 413, statusMessage: 'Request body too large.' })
  }

  const raw = await readBody(event).catch(() => null)

  // Honeypot: accept and discard, so a bot cannot distinguish this from success.
  const website = (raw as { website?: unknown } | null)?.website
  if (typeof website === 'string' && website.trim()) {
    console.info('[intake] discarded submission: honeypot filled')
    return { ok: true, stored: false, id: null, reason: 'discarded' }
  }

  const limit = checkRateLimit(clientIp(event))
  if (!limit.allowed) {
    // h3 types Retry-After as a number and serialises it itself.
    setResponseHeader(event, 'Retry-After', limit.retryAfterSeconds)
    throw createError({
      statusCode: 429,
      statusMessage: 'Too many submissions from this connection. Please try again shortly.'
    })
  }

  const validated = validateIntakeInput(raw)
  if (!validated.ok) {
    throw createError({
      statusCode: 400,
      statusMessage: validated.message,
      data: { errors: validated.errors }
    })
  }
  const input = validated.value

  // Collapses a double-click or a client-side retry into one row.
  const fingerprint = submissionFingerprint(input)
  const seen = findRecentSubmission(fingerprint)
  if (seen) {
    console.info('[intake] duplicate within window, returning the original result')
    return { ok: true, stored: false, duplicate: true, id: seen.id }
  }

  const config = useRuntimeConfig(event)
  const baseUrl = String(config.directusUrl || '')
  const token = String(config.directusToken || '')
  const collection = String(config.intakeCollection || '')

  if (!baseUrl || !token || !collection) {
    console.error('[intake] not configured: missing directusUrl, token or collection')
    throw createError({
      statusCode: 503,
      statusMessage: 'Submissions are not configured on this deployment. Set NUXT_DIRECTUS_TOKEN.'
    })
  }

  // Built here so `consent_at` comes from the server clock.
  const payload = buildIntakePayload(input, input.selectedSeriesIds)

  let id: string | number | null = null
  try {
    id = await writeIntakeRow({ baseUrl, collection, token }, payload)
  } catch (err) {
    // Log the detail, return none of it: it can describe our credentials or our
    // schema. No payload in the log either - it is all personal data.
    console.error(
      `[intake] write failed after ${Date.now() - started}ms (${describeFailure(err)})`
    )

    const outcome = mapWriteFailure(err)
    if (outcome.kind === 'duplicate') {
      rememberSubmission(fingerprint, null)
      return { ok: true, stored: false, duplicate: true, id: null }
    }
    throw createError({
      statusCode: outcome.statusCode,
      statusMessage: outcome.statusMessage
    })
  }

  rememberSubmission(fingerprint, id)

  // Metrics only - no personal data.
  console.info(
    `[intake] stored id=${id ?? 'unknown'} in ${Date.now() - started}ms ` +
      `(series=${input.selectedSeriesIds.length} newsletter=${payload.newsletter})`
  )

  return { ok: true, stored: true, id }
})
