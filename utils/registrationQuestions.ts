/**
 * Registration question definitions.
 *
 * The original fetches these at runtime from `/registration-questions.json`
 * (observed in the live page's network log). The values below are that
 * response, transcribed exactly - same titles, same option order, same
 * required flags and length limits.
 *
 * When the real backend is wired up, replace these constants with a fetch of
 * that endpoint; the shape here deliberately mirrors its payload so nothing
 * else has to change.
 */

export type RegistrationQuestion = {
  question_id: string
  title: string
  type: 'single_radio' | 'single_dropdown' | 'short_answer'
  required: boolean
  options: string[]
  min_length: number | null
  max_length: number | null
  field_name: string | null
}

/** Question ids the component special-cases, as constants in the original. */
export const GOV_AFFILIATION_ID = 'gov-affiliation-2026-05'
export const GOV_LEVEL_ID = 'gov-level-2026-05'

export const COUNTRY_OPTIONS = ['United States', 'Outside the United States']

/**
 * 56 entries: 50 states + DC + AS, GU, MP, PR, VI. Two-letter codes, in the
 * original's order (which is alphabetical by state name, not by code - note
 * AS after AK, GU after GA, MP between ND and OH).
 */
export const STATE_OPTIONS = [
  'AL', 'AK', 'AS', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC',
  'FL', 'GA', 'GU', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY',
  'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE',
  'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'MP', 'OH', 'OK',
  'OR', 'PA', 'PR', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT',
  'VA', 'VI', 'WA', 'WV', 'WI', 'WY'
]

export const GOV_AFFILIATION_TITLE =
  'Do you work for or primarily support a government or government-affiliated organization?'

export const GOV_AFFILIATION_OPTIONS = [
  "Yes, I'm an employee of a government agency",
  "Yes, I'm a contractor or consultant working with a government agency",
  'Yes, I work for a government-affiliated organization (e.g., public university, nonprofit, or quasi-governmental organization)',
  'No, I do not work for or support a government or government-affiliated organization'
]

export const GOV_LEVEL_TITLE =
  'If a government employee or consultant: What level of government?'

export const GOV_LEVEL_OPTIONS = [
  'International or Intergovernmental Organization (e.g. UN, OECD, EU)',
  'National or Federal Level',
  'State or Provincial level',
  'Tribal Government',
  'County or equivalent level',
  'Municipal, City, or Local level',
  'Other level not listed here'
]

export const NON_US_COUNTRY_TITLE = 'Country (Non US only)'
export const NON_US_COUNTRY_MIN_LENGTH = 1
export const NON_US_COUNTRY_MAX_LENGTH = 500

/**
 * The original's country normaliser (`se` in the minified bundle):
 *
 *   'United States'             -> 'US'
 *   'Outside the United States' -> ''
 *   any 2-char value            -> uppercased
 *   anything else               -> ''
 *
 * Both the State and the Non-US-Country conditions are derived from this
 * rather than from a direct string comparison, so a stored 2-letter country
 * code behaves the same way a full label does.
 */
export function normalizeCountry(value: string | null | undefined): string {
  const v = (value || '').trim()
  if (!v) return ''
  if (v === 'United States') return 'US'
  if (v === 'Outside the United States') return ''
  if (v.length === 2) return v.toUpperCase()
  return ''
}
