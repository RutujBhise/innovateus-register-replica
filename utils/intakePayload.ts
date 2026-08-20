import { EVENT_SERIES } from './eventSeries'
import { normalizeCountry } from './registrationQuestions'

/**
 * Maps the registration form's state onto a row for the Directus `cw_intake`
 * collection.
 *
 * Kept as a pure function with no Nuxt/DOM/network dependency so it can be unit
 * tested directly - it is the piece most likely to break silently, because a
 * wrong field name or a wrong join character produces a 400 or a subtly bad row
 * rather than an obvious crash.
 *
 * Schema (from `npm run inspect`), required unless noted:
 *   first_name       string
 *   last_name        string
 *   email            string
 *   country          string
 *   state            string    nullable
 *   gov_org          string
 *   gov_level        string    nullable
 *   workshop_series  text
 *   workshops        text      nullable
 *   newsletter       boolean
 *   consent_at       timestamp nullable
 * `id`, `date_created` and `user_created` are set by Directus.
 */

export type IntakeFormState = {
  email: string
  firstName: string
  lastName: string
  country: string
  state: string
  nonUsCountry: string
  govAffiliation: string
  govLevel: string
  newsletterOptIn: boolean
}

export type IntakePayload = {
  first_name: string
  last_name: string
  email: string
  country: string
  state: string | null
  gov_org: string
  gov_level: string | null
  workshop_series: string
  workshops: string | null
  newsletter: boolean
  consent_at: string | null
}

/** Separator used by the existing rows for both parallel list fields. */
export const LIST_SEPARATOR = '; '

const clean = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

/** Null rather than '' for absent optional values - '' would claim an answer. */
const orNull = (v: string) => (v === '' ? null : v)

/**
 * Resolves the country exactly as the original page does (its `$t()` helper):
 * when the visitor picks "Outside the United States" and then names a country
 * in the follow-up field, that typed value is what gets submitted. Otherwise
 * the option label itself is used.
 */
export function resolveCountry(form: Pick<IntakeFormState, 'country' | 'nonUsCountry'>): string {
  const country = clean(form.country)
  if (!country) return ''
  if (country === 'United States') return 'United States'
  if (country === 'Outside the United States') {
    return clean(form.nonUsCountry) || 'Outside the United States'
  }
  // A stored 2-letter code behaves like its label, mirroring normalizeCountry.
  return normalizeCountry(country) === 'US' ? 'United States' : country
}

/**
 * Selected series, in EVENT_SERIES display order rather than click order, so the
 * same set of checkboxes always produces the same string. Titles are trimmed:
 * a few of the source titles carry stray leading/trailing spaces that are
 * needed for DOM fidelity but should not reach the database.
 */
export function resolveSeries(selectedIds: number[]) {
  const chosen = EVENT_SERIES.filter((s) => selectedIds.includes(s.id))
  return {
    titles: chosen.map((s) => s.title.trim()).join(LIST_SEPARATOR),
    zoomEventIds: chosen.map((s) => s.zoomEventId).join(LIST_SEPARATOR),
    count: chosen.length
  }
}

export function buildIntakePayload(
  form: IntakeFormState,
  selectedSeriesIds: number[],
  /** Injected so tests are deterministic. */
  now: Date = new Date()
): IntakePayload {
  const series = resolveSeries(selectedSeriesIds)
  const isUs = normalizeCountry(form.country) === 'US'

  // The level-of-government answer only applies to a "Yes, ..." affiliation;
  // the form clears it otherwise, and this is a second guard so a stale value
  // can never be persisted.
  const affiliation = clean(form.govAffiliation)
  const levelApplies = affiliation.toLowerCase().startsWith('yes')

  return {
    // Stored as typed (trimmed only). Normalising case would quietly alter the
    // visitor's own answer, and this collection is an intake record.
    first_name: clean(form.firstName),
    last_name: clean(form.lastName),
    email: clean(form.email),
    country: resolveCountry(form),
    state: isUs ? orNull(clean(form.state)) : null,
    gov_org: affiliation,
    gov_level: levelApplies ? orNull(clean(form.govLevel)) : null,
    workshop_series: series.titles,
    workshops: orNull(series.zoomEventIds),
    newsletter: form.newsletterOptIn === true,
    // Only meaningful when consent was actually given.
    consent_at: form.newsletterOptIn === true ? now.toISOString() : null
  }
}
