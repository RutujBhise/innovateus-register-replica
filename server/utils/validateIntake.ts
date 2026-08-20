import { EVENT_SERIES } from '../../utils/eventSeries'
import {
  COUNTRY_OPTIONS,
  STATE_OPTIONS,
  GOV_AFFILIATION_OPTIONS,
  GOV_LEVEL_OPTIONS,
  NON_US_COUNTRY_MAX_LENGTH,
  normalizeCountry
} from '../../utils/registrationQuestions'
import type { IntakeFormState } from '../../utils/intakePayload'

/**
 * Server-side validation for POST /api/intake.
 *
 * This deliberately repeats the checks the form already makes. The client is
 * just a convenience: anyone can POST straight to this endpoint, and it writes
 * to a shared production collection, so the endpoint has to defend the data on
 * its own.
 *
 * Beyond presence checks, closed-set answers are verified against the very
 * option lists the form renders. That stops a crafted request from writing
 * arbitrary text into fields that are supposed to hold one of N known values.
 */

/** Generous, and the same expression the client uses. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const LIMITS = {
  name: 100,
  email: 254, // RFC 5321 maximum length of a forward path
  nonUsCountry: NON_US_COUNTRY_MAX_LENGTH,
  series: EVENT_SERIES.length
} as const

export type ValidatedIntake = IntakeFormState & { selectedSeriesIds: number[] }

export type ValidationFailure = {
  ok: false
  /** Field-keyed messages so the client can mark individual inputs. */
  errors: Record<string, string>
  /** One summary line, safe to show a visitor. */
  message: string
}

export type ValidationSuccess = { ok: true; value: ValidatedIntake }

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

const VALID_SERIES_IDS = new Set(EVENT_SERIES.map((s) => s.id))

export function validateIntakeInput(raw: unknown): ValidationSuccess | ValidationFailure {
  const errors: Record<string, string> = {}

  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, errors: {}, message: 'Expected a JSON object.' }
  }
  const body = raw as Record<string, unknown>

  // --- identity -----------------------------------------------------------
  const firstName = str(body.firstName)
  const lastName = str(body.lastName)
  const email = str(body.email)

  if (!firstName) errors.firstName = 'First name is required.'
  else if (firstName.length > LIMITS.name)
    errors.firstName = `First name must be ${LIMITS.name} characters or fewer.`

  if (!lastName) errors.lastName = 'Last name is required.'
  else if (lastName.length > LIMITS.name)
    errors.lastName = `Last name must be ${LIMITS.name} characters or fewer.`

  if (!email) errors.email = 'Email is required.'
  else if (email.length > LIMITS.email)
    errors.email = `Email must be ${LIMITS.email} characters or fewer.`
  else if (!EMAIL_RE.test(email)) errors.email = 'Enter a valid email address.'

  // --- country, and what it implies --------------------------------------
  const country = str(body.country)
  const state = str(body.state)
  const nonUsCountry = str(body.nonUsCountry)

  if (!country) {
    errors.country = 'Country is required.'
  } else if (!COUNTRY_OPTIONS.includes(country)) {
    errors.country = 'Choose one of the listed country options.'
  }

  const isUs = normalizeCountry(country) === 'US'

  if (isUs) {
    // The form makes State required whenever the country is the US.
    if (!state) errors.state = 'State/Province is required.'
    else if (!STATE_OPTIONS.includes(state))
      errors.state = 'Choose a state from the list.'
  }

  // Free text, so length is the only constraint worth enforcing. Only rejected
  // when it is too long - it is optional, and irrelevant for US visitors.
  if (nonUsCountry.length > LIMITS.nonUsCountry) {
    errors.nonUsCountry = `Country must be ${LIMITS.nonUsCountry} characters or fewer.`
  }

  // --- government questions ----------------------------------------------
  const govAffiliation = str(body.govAffiliation)
  const govLevel = str(body.govLevel)

  if (!govAffiliation) {
    errors.govAffiliation = 'This question is required.'
  } else if (!GOV_AFFILIATION_OPTIONS.includes(govAffiliation)) {
    errors.govAffiliation = 'Choose one of the listed options.'
  }

  // Mirrors the form: the level question appears - and is required - only when
  // the affiliation answer begins with "yes".
  const levelApplies = govAffiliation.toLowerCase().startsWith('yes')
  if (levelApplies) {
    if (!govLevel) errors.govLevel = 'Level of government is required.'
    else if (!GOV_LEVEL_OPTIONS.includes(govLevel))
      errors.govLevel = 'Choose one of the listed options.'
  }

  // --- event series -------------------------------------------------------
  const rawIds = body.selectedSeriesIds
  let selectedSeriesIds: number[] = []

  if (!Array.isArray(rawIds)) {
    errors.selectedSeriesIds = 'Select at least one event series.'
  } else {
    // De-duplicate first: a repeated id would otherwise inflate the count and
    // could duplicate a title in workshop_series.
    const unique = [...new Set(rawIds)]
    const numeric = unique.filter((v): v is number => typeof v === 'number' && Number.isInteger(v))

    if (numeric.length !== unique.length) {
      errors.selectedSeriesIds = 'Event series ids must be integers.'
    } else if (numeric.length === 0) {
      errors.selectedSeriesIds = 'Select at least one event series.'
    } else if (numeric.length > LIMITS.series) {
      errors.selectedSeriesIds = 'Too many event series selected.'
    } else {
      const unknown = numeric.filter((id) => !VALID_SERIES_IDS.has(id))
      if (unknown.length) {
        // Do not echo the values back; they came from an untrusted caller.
        errors.selectedSeriesIds = 'One or more selected event series are not recognised.'
      } else {
        selectedSeriesIds = numeric
      }
    }
  }

  // --- newsletter ---------------------------------------------------------
  // `newsletter` is NOT NULL in Directus, so an absent value is a bug, not a
  // "false". Require a real boolean rather than coercing.
  const optIn = body.newsletterOptIn
  if (typeof optIn !== 'boolean') {
    errors.newsletterOptIn = 'Newsletter opt-in must be true or false.'
  }

  if (Object.keys(errors).length > 0) {
    const count = Object.keys(errors).length
    return {
      ok: false,
      errors,
      message:
        count === 1
          ? Object.values(errors)[0]!
          : `Please correct ${count} fields and try again.`
    }
  }

  return {
    ok: true,
    value: {
      email,
      firstName,
      lastName,
      country,
      state,
      nonUsCountry,
      govAffiliation,
      govLevel,
      newsletterOptIn: optIn as boolean,
      selectedSeriesIds
    }
  }
}
