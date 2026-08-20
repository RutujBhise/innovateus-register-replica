import { describe, it, expect } from 'vitest'
import {
  buildIntakePayload,
  resolveCountry,
  resolveSeries,
  LIST_SEPARATOR,
  type IntakeFormState
} from '../utils/intakePayload'
import { EVENT_SERIES } from '../utils/eventSeries'

/** A complete, valid US submission. Individual tests override what they need. */
const base = (over: Partial<IntakeFormState> = {}): IntakeFormState => ({
  email: 'rutuj+1@example.org',
  firstName: 'Rutuj',
  lastName: 'Bhise',
  country: 'United States',
  state: 'MA',
  nonUsCountry: '',
  govAffiliation: "Yes, I'm an employee of a government agency",
  govLevel: 'State or Provincial level',
  newsletterOptIn: true,
  ...over
})

const FIXED_NOW = new Date('2026-08-20T12:00:00.000Z')

describe('resolveCountry', () => {
  it('passes United States through', () => {
    expect(resolveCountry({ country: 'United States', nonUsCountry: '' })).toBe('United States')
  })

  it('uses the typed country when the visitor is outside the US', () => {
    expect(
      resolveCountry({ country: 'Outside the United States', nonUsCountry: 'Canada' })
    ).toBe('Canada')
  })

  it('falls back to the option label when no country is typed', () => {
    expect(resolveCountry({ country: 'Outside the United States', nonUsCountry: '   ' })).toBe(
      'Outside the United States'
    )
  })

  it('treats a stored 2-letter US code like the label', () => {
    expect(resolveCountry({ country: 'us', nonUsCountry: '' })).toBe('United States')
  })

  it('returns empty string when nothing is chosen', () => {
    expect(resolveCountry({ country: '', nonUsCountry: 'ignored' })).toBe('')
  })
})

describe('resolveSeries', () => {
  it('joins titles and zoom ids in parallel with "; "', () => {
    // 62 = AI for Public-Sector Procurement, 64 = AI in Public Health
    const r = resolveSeries([64, 62])
    expect(r.count).toBe(2)
    expect(r.titles).toBe('AI for Public-Sector Procurement; AI in Public Health')
    expect(r.zoomEventIds).toBe('CTI09lxVQDKJhwb8AocicQ; QYgwIYtBRyCPDLVtnJObIg')
  })

  it('is order-independent: selection order does not change the output', () => {
    expect(resolveSeries([64, 62])).toEqual(resolveSeries([62, 64]))
  })

  it('keeps the two lists the same length and aligned', () => {
    const ids = EVENT_SERIES.map((s) => s.id)
    const r = resolveSeries(ids)
    const titles = r.titles.split(LIST_SEPARATOR)
    const zooms = r.zoomEventIds.split(LIST_SEPARATOR)
    expect(titles).toHaveLength(EVENT_SERIES.length)
    expect(zooms).toHaveLength(EVENT_SERIES.length)
    titles.forEach((t, i) => {
      const match = EVENT_SERIES.find((s) => s.title.trim() === t)
      expect(match, `no series titled "${t}"`).toBeDefined()
      expect(zooms[i]).toBe(match!.zoomEventId)
    })
  })

  it('trims the stray spaces some source titles carry', () => {
    // Series 40's title starts with a space for DOM fidelity.
    expect(EVENT_SERIES.find((s) => s.id === 40)!.title.startsWith(' ')).toBe(true)
    expect(resolveSeries([40]).titles).toBe(
      'The Prompting Lab: Real Prompts, Real Challenges, All Platforms'
    )
  })

  it('returns empty strings when nothing is selected', () => {
    expect(resolveSeries([])).toEqual({ titles: '', zoomEventIds: '', count: 0 })
  })
})

describe('buildIntakePayload', () => {
  it('maps a full US submission', () => {
    const p = buildIntakePayload(base(), [64], FIXED_NOW)
    expect(p).toEqual({
      first_name: 'Rutuj',
      last_name: 'Bhise',
      email: 'rutuj+1@example.org',
      country: 'United States',
      state: 'MA',
      gov_org: "Yes, I'm an employee of a government agency",
      gov_level: 'State or Provincial level',
      workshop_series: 'AI in Public Health',
      workshops: 'QYgwIYtBRyCPDLVtnJObIg',
      newsletter: true,
      consent_at: '2026-08-20T12:00:00.000Z'
    })
  })

  it('nulls state for a non-US visitor even if one is lingering in state', () => {
    const p = buildIntakePayload(
      base({ country: 'Outside the United States', state: 'MA', nonUsCountry: 'India' }),
      [64],
      FIXED_NOW
    )
    expect(p.country).toBe('India')
    expect(p.state).toBeNull()
  })

  it('nulls gov_level when the affiliation is not a "Yes"', () => {
    const p = buildIntakePayload(
      base({
        govAffiliation:
          'No, I do not work for or support a government or government-affiliated organization',
        govLevel: 'State or Provincial level' // stale value must not persist
      }),
      [64],
      FIXED_NOW
    )
    expect(p.gov_org).toContain('No, I do not work')
    expect(p.gov_level).toBeNull()
  })

  it('keeps gov_level for every "Yes" variant, including the affiliated-org one', () => {
    const affiliated =
      'Yes, I work for a government-affiliated organization (e.g., public university, nonprofit, or quasi-governmental organization)'
    const p = buildIntakePayload(
      base({ govAffiliation: affiliated, govLevel: 'Tribal Government' }),
      [64],
      FIXED_NOW
    )
    expect(p.gov_level).toBe('Tribal Government')
  })

  it('omits consent_at when the newsletter box is unchecked', () => {
    const p = buildIntakePayload(base({ newsletterOptIn: false }), [64], FIXED_NOW)
    expect(p.newsletter).toBe(false)
    expect(p.consent_at).toBeNull()
  })

  it('always sends newsletter as a real boolean, never a string', () => {
    for (const v of [true, false]) {
      const p = buildIntakePayload(base({ newsletterOptIn: v }), [64], FIXED_NOW)
      expect(typeof p.newsletter).toBe('boolean')
      expect(p.newsletter).toBe(v)
    }
  })

  it('trims surrounding whitespace but preserves the visitor\'s casing', () => {
    const p = buildIntakePayload(
      base({ firstName: '  Rutuj ', lastName: ' Bhise  ', email: '  Rutuj+2@Example.org ' }),
      [64],
      FIXED_NOW
    )
    expect(p.first_name).toBe('Rutuj')
    expect(p.last_name).toBe('Bhise')
    expect(p.email).toBe('Rutuj+2@Example.org')
  })

  it('turns empty optional values into null rather than empty strings', () => {
    const p = buildIntakePayload(base({ state: '   ' }), [64], FIXED_NOW)
    expect(p.state).toBeNull()
  })

  it('never emits undefined for a required field', () => {
    const p = buildIntakePayload(base(), [64], FIXED_NOW)
    for (const key of [
      'first_name',
      'last_name',
      'email',
      'country',
      'gov_org',
      'workshop_series',
      'newsletter'
    ] as const) {
      expect(p[key], key).not.toBeUndefined()
      expect(p[key], key).not.toBeNull()
    }
  })
})

describe('EVENT_SERIES data integrity', () => {
  it('has 14 series', () => {
    expect(EVENT_SERIES).toHaveLength(14)
  })

  it('has a unique, non-empty zoom event id for every series', () => {
    const ids = EVENT_SERIES.map((s) => s.zoomEventId)
    expect(ids.every((z) => typeof z === 'string' && z.length > 0)).toBe(true)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('has unique numeric ids and trimmed-unique titles', () => {
    const ids = EVENT_SERIES.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
    const titles = EVENT_SERIES.map((s) => s.title.trim())
    expect(new Set(titles).size).toBe(titles.length)
  })

  it('never contains the list separator inside a title, which would corrupt the join', () => {
    for (const s of EVENT_SERIES) {
      expect(s.title.includes(LIST_SEPARATOR), s.title).toBe(false)
    }
  })
})
