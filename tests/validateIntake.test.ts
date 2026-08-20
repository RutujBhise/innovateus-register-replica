import { describe, it, expect } from 'vitest'
import { validateIntakeInput, LIMITS } from '../server/utils/validateIntake'
import { EVENT_SERIES } from '../utils/eventSeries'
import {
  GOV_AFFILIATION_OPTIONS,
  GOV_LEVEL_OPTIONS
} from '../utils/registrationQuestions'

const YES_EMPLOYEE = GOV_AFFILIATION_OPTIONS[0]! // "Yes, I'm an employee..."
const YES_AFFILIATED = GOV_AFFILIATION_OPTIONS[2]! // "Yes, I work for a government-affiliated..."
const NO_GOV = GOV_AFFILIATION_OPTIONS[3]! // "No, I do not work for..."

/** A valid US body. Tests override only what they exercise. */
const body = (over: Record<string, unknown> = {}) => ({
  email: 'rutuj+1@example.org',
  firstName: 'Rutuj',
  lastName: 'Bhise',
  country: 'United States',
  state: 'MA',
  nonUsCountry: '',
  govAffiliation: YES_EMPLOYEE,
  govLevel: GOV_LEVEL_OPTIONS[1]!, // "National or Federal Level"
  newsletterOptIn: true,
  selectedSeriesIds: [64],
  ...over
})

/** Narrowing helper so failures read clearly. */
const expectFail = (raw: unknown) => {
  const r = validateIntakeInput(raw)
  // JSON.stringify(undefined) returns undefined, not a string, so label safely.
  const label = String(JSON.stringify(raw) ?? raw).slice(0, 80)
  expect(r.ok, `expected validation to fail for ${label}`).toBe(false)
  return r as Extract<typeof r, { ok: false }>
}

const expectPass = (raw: unknown) => {
  const r = validateIntakeInput(raw)
  if (!r.ok) throw new Error(`expected pass, got errors: ${JSON.stringify(r.errors)}`)
  return r
}

describe('validateIntakeInput: happy paths', () => {
  it('accepts a complete US submission', () => {
    const r = expectPass(body())
    expect(r.value.email).toBe('rutuj+1@example.org')
    expect(r.value.state).toBe('MA')
    expect(r.value.selectedSeriesIds).toEqual([64])
  })

  it('accepts a non-US submission with no state', () => {
    const r = expectPass(
      body({ country: 'Outside the United States', state: '', nonUsCountry: 'India' })
    )
    expect(r.value.nonUsCountry).toBe('India')
  })

  it('does not require gov level when the answer is "No"', () => {
    const r = expectPass(body({ govAffiliation: NO_GOV, govLevel: '' }))
    expect(r.value.govLevel).toBe('')
  })

  it('requires gov level for the affiliated-organisation "Yes" too', () => {
    expectFail(body({ govAffiliation: YES_AFFILIATED, govLevel: '' }))
    expectPass(body({ govAffiliation: YES_AFFILIATED, govLevel: GOV_LEVEL_OPTIONS[3]! }))
  })

  it('trims surrounding whitespace on the way in', () => {
    const r = expectPass(body({ firstName: '  Rutuj  ', email: ' rutuj+1@example.org ' }))
    expect(r.value.firstName).toBe('Rutuj')
    expect(r.value.email).toBe('rutuj+1@example.org')
  })

  it('accepts every real series id at once', () => {
    const all = EVENT_SERIES.map((s) => s.id)
    const r = expectPass(body({ selectedSeriesIds: all }))
    expect(r.value.selectedSeriesIds).toHaveLength(all.length)
  })
})

describe('validateIntakeInput: shape of the body', () => {
  it.each([null, undefined, 'string', 42, [], true])('rejects %p as a body', (raw) => {
    expectFail(raw)
  })

  it('reports every missing required field at once', () => {
    const r = expectFail({})
    expect(Object.keys(r.errors).sort()).toEqual(
      [
        'country',
        'email',
        'firstName',
        'govAffiliation',
        'lastName',
        'newsletterOptIn',
        'selectedSeriesIds'
      ].sort()
    )
    expect(r.message).toMatch(/correct 7 fields/)
  })

  it('uses the single error as the summary when only one field is wrong', () => {
    const r = expectFail(body({ email: 'nope' }))
    expect(r.message).toBe('Enter a valid email address.')
  })
})

describe('validateIntakeInput: identity fields', () => {
  it.each([
    ['missing @', 'nope'],
    ['no domain dot', 'a@b'],
    ['spaces', 'a b@c.com'],
    ['empty', '   ']
  ])('rejects an email that is %s', (_label, email) => {
    expect(expectFail(body({ email })).errors.email).toBeDefined()
  })

  it('accepts a plus-addressed email', () => {
    expectPass(body({ email: 'rutuj+directus-test@example.org' }))
  })

  it('enforces the maximum email length', () => {
    const long = 'a'.repeat(LIMITS.email) + '@example.org'
    expect(expectFail(body({ email: long })).errors.email).toMatch(/or fewer/)
  })

  it('enforces maximum name lengths', () => {
    const long = 'x'.repeat(LIMITS.name + 1)
    expect(expectFail(body({ firstName: long })).errors.firstName).toMatch(/or fewer/)
    expect(expectFail(body({ lastName: long })).errors.lastName).toMatch(/or fewer/)
  })
})

describe('validateIntakeInput: closed-option fields', () => {
  it('rejects a country outside the option list', () => {
    expect(expectFail(body({ country: 'Canada' })).errors.country).toBeDefined()
  })

  it('requires a state for US visitors', () => {
    expect(expectFail(body({ state: '' })).errors.state).toBeDefined()
  })

  it('rejects a state outside the option list', () => {
    expect(expectFail(body({ state: 'Massachusetts' })).errors.state).toBeDefined()
    expect(expectFail(body({ state: 'ZZ' })).errors.state).toBeDefined()
  })

  it('rejects an invented affiliation answer', () => {
    expect(expectFail(body({ govAffiliation: 'Yes, obviously' })).errors.govAffiliation).toBeDefined()
  })

  it('rejects an invented gov level', () => {
    expect(expectFail(body({ govLevel: 'Planetary' })).errors.govLevel).toBeDefined()
  })

  it('caps the free-text non-US country', () => {
    const long = 'x'.repeat(LIMITS.nonUsCountry + 1)
    expect(
      expectFail(body({ country: 'Outside the United States', state: '', nonUsCountry: long }))
        .errors.nonUsCountry
    ).toMatch(/or fewer/)
  })
})

describe('validateIntakeInput: event series', () => {
  it('rejects a non-array', () => {
    expect(expectFail(body({ selectedSeriesIds: '64' })).errors.selectedSeriesIds).toBeDefined()
  })

  it('rejects an empty selection', () => {
    expect(expectFail(body({ selectedSeriesIds: [] })).errors.selectedSeriesIds).toBeDefined()
  })

  it('rejects ids that are not integers', () => {
    for (const bad of [['64'], [64.5], [null], [{}]]) {
      expect(expectFail(body({ selectedSeriesIds: bad })).errors.selectedSeriesIds).toBeDefined()
    }
  })

  it('rejects ids that are not in the catalogue', () => {
    expect(expectFail(body({ selectedSeriesIds: [9999] })).errors.selectedSeriesIds).toBeDefined()
    expect(expectFail(body({ selectedSeriesIds: [64, 9999] })).errors.selectedSeriesIds).toBeDefined()
  })

  it('does not echo the rejected values back to the caller', () => {
    const r = expectFail(body({ selectedSeriesIds: [4242] }))
    expect(r.errors.selectedSeriesIds).not.toContain('4242')
  })

  it('collapses duplicate ids instead of failing', () => {
    const r = expectPass(body({ selectedSeriesIds: [64, 64, 62] }))
    expect(r.value.selectedSeriesIds).toEqual([64, 62])
  })

  it('rejects more ids than the catalogue holds', () => {
    const tooMany = Array.from({ length: EVENT_SERIES.length + 1 }, (_, i) => i + 1)
    expect(expectFail(body({ selectedSeriesIds: tooMany })).errors.selectedSeriesIds).toBeDefined()
  })
})

describe('validateIntakeInput: newsletter flag', () => {
  it('accepts both booleans', () => {
    expect(expectPass(body({ newsletterOptIn: true })).value.newsletterOptIn).toBe(true)
    expect(expectPass(body({ newsletterOptIn: false })).value.newsletterOptIn).toBe(false)
  })

  it('refuses to coerce truthy or falsy stand-ins', () => {
    // `newsletter` is NOT NULL in Directus - an absent or fuzzy value is a bug,
    // not an implied false.
    for (const bad of ['true', 'false', 1, 0, null, undefined, 'yes']) {
      expect(expectFail(body({ newsletterOptIn: bad })).errors.newsletterOptIn).toBeDefined()
    }
  })
})
