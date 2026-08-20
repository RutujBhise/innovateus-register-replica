import { UpstreamError } from './directusClient'

/**
 * Turns an upstream failure into what the visitor is allowed to see.
 *
 * Pure and h3-free so the mapping table can be unit tested directly. This is
 * the security-relevant half of the error handling: the detail from Directus
 * goes to the server log, never into the response, because it can describe our
 * credentials or our schema.
 */

export type WriteOutcome =
  | { kind: 'duplicate' }
  | { kind: 'error'; statusCode: 502 | 503; statusMessage: string }

export function mapWriteFailure(err: unknown): WriteOutcome {
  const status = err instanceof UpstreamError ? err.status : 0
  const code = err instanceof UpstreamError ? err.directusCode : undefined

  // Directus reports a uniqueness clash as 400 RECORD_NOT_UNIQUE rather than
  // 409, so both are checked. Either way the person is already on file, which
  // from the visitor's side is a success.
  if (status === 409 || code === 'RECORD_NOT_UNIQUE') {
    return { kind: 'duplicate' }
  }

  // Our token is wrong or unauthorised. Never hint at that in the response.
  if (status === 401 || status === 403) {
    return {
      kind: 'error',
      statusCode: 502,
      statusMessage: 'Submissions are temporarily unavailable. Please try again later.'
    }
  }

  // The payload did not match the collection - our bug, not the visitor's.
  if (status === 400 || status === 422) {
    return {
      kind: 'error',
      statusCode: 502,
      statusMessage: 'We could not record this submission. Please contact us if it persists.'
    }
  }

  // Genuinely transient, and the only case where "try again" is honest advice.
  if (status === 429 || status === 503 || status === 504) {
    return {
      kind: 'error',
      statusCode: 503,
      statusMessage: 'The storage service is busy. Please try again in a moment.'
    }
  }

  return {
    kind: 'error',
    statusCode: 502,
    statusMessage: 'Something went wrong recording your submission. Please try again.'
  }
}

/** Redacted one-liner for the server log. Carries no personal data. */
export function describeFailure(err: unknown): string {
  if (err instanceof UpstreamError) {
    return `status=${err.status} code=${err.directusCode ?? 'none'} detail=${err.detail}`
  }
  if (err instanceof Error) {
    return `status=none code=${(err as { code?: string }).code ?? 'none'} detail=${err.message}`
  }
  return 'status=none code=none detail=unknown'
}
