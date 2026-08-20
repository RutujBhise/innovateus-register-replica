<script setup lang="ts">
/**
 * /register
 *
 * A functional replica of https://innovate-us.org/register, plus one field the
 * original does not have: the weekly-newsletter opt-in.
 *
 * Submitting POSTs the whole form to our own /api/intake, which writes a row to
 * the Directus `cw_intake` collection. The hop through our server exists so the
 * access token never reaches the browser, so validation cannot be bypassed by
 * the client, and so `consent_at` is stamped from the server clock.
 *
 * Styling comes from assets/css/register-page.css, which is the original's own
 * stylesheet verbatim. The only component with styles of its own is
 * NewsletterOptIn.vue, because it is the only thing here that is not a clone.
 */

useHead({ title: 'Zoom Events - InnovateUS' })

const form = reactive({
  email: '',
  firstName: '',
  lastName: '',
  country: '',
  state: '',
  nonUsCountry: '',
  govAffiliation: '',
  govLevel: '',
  /** Added for this build - not a field on the original form. */
  newsletterOptIn: false
})

/** Honeypot. Left empty by humans; bots fill it. Checked server-side. */
const honeypot = ref('')

const submitting = ref(false)
const submitMessage = ref<{ kind: 'error' | 'success'; text: string } | null>(null)

/** The original's two sr-only live regions; we actually write to them. */
const statusRegion = ref<HTMLElement | null>(null)
const alertRegion = ref<HTMLElement | null>(null)
/** The visible alert box, so the outcome can be brought into view. */
const alertBox = ref<HTMLElement | null>(null)


const fail = (text: string) => {
  submitMessage.value = { kind: 'error', text }
  if (alertRegion.value) alertRegion.value.textContent = text
  if (statusRegion.value) statusRegion.value.textContent = ''
  revealOutcome()
}

/**
 * The alert renders at the top of the card but the button is at the bottom, so
 * without this the page succeeds off-screen and looks like nothing happened.
 * Focus moves too, not just scroll: it puts a keyboard or screen-reader user at
 * the outcome instead of leaving them at the button they just pressed.
 */
const revealOutcome = () => {
  nextTick(() => {
    // Two frames, not one. A success also resets the form, which unchecks every
    // series and removes the conditional State field - the page gets shorter.
    // Scrolling during that reflow targets a stale offset and lands nowhere
    // near the alert, so wait for layout to settle first.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const el = alertBox.value
        if (!el) return
        // 'instant', not 'smooth'. The site sets scroll-behavior: smooth
        // globally, and gliding ~2000px back to the top takes about a second -
        // long enough after a submit that it reads as nothing having happened.
        // The outcome should be on screen the moment it exists.
        el.scrollIntoView({ block: 'center', behavior: 'instant' })
        el.focus({ preventScroll: true })
      })
    )
  })
}

/** Clears the form after a successful submission so it cannot be sent twice. */
const resetForm = () => {
  form.email = ''
  form.firstName = ''
  form.lastName = ''
  form.country = ''
  form.state = ''
  form.nonUsCountry = ''
  form.govAffiliation = ''
  form.govLevel = ''
  form.newsletterOptIn = false
  selectedSeries.value = []
  fieldErrors.value = {}
}

const succeed = (text: string) => {
  submitMessage.value = { kind: 'success', text }
  if (statusRegion.value) statusRegion.value.textContent = text
  if (alertRegion.value) alertRegion.value.textContent = ''
  resetForm()
  revealOutcome()
}

/**
 * The original builds these ids by interpolating the question title, e.g.
 *   id="question-Do you work for or primarily support a government..."
 * Whitespace is not valid in an id, so those <label for> references never
 * resolve and the fields are announced as unlabelled comboboxes. These are the
 * same ids with the whitespace removed, which is the only difference from the
 * original's markup and changes nothing visually.
 */
const IDS = {
  govAffiliation: 'question-gov-affiliation',
  govLevel: 'question-gov-level',
  nonUsCountry: 'question-country-non-us'
}

/**
 * Field-level errors, keyed by the same names the server returns. Used to mark
 * inputs with aria-invalid and to move focus to the first problem. There is no
 * per-field error text on purpose: the original design has nowhere to put it
 * without shifting the layout, so the summary alert carries the wording and
 * aria-invalid carries the machine-readable state.
 */
const fieldErrors = ref<Record<string, string>>({})

/** For the three inputs the original already gives an aria-invalid="false". */
const invalid = (field: string) => (fieldErrors.value[field] ? 'true' : 'false')

/**
 * For controls the original gives no aria-invalid at all: returns undefined so
 * the attribute is simply absent while the field is valid, keeping the markup
 * identical to the original in the normal case.
 */
const invalidIf = (field: string) => (fieldErrors.value[field] ? 'true' : undefined)

/**
 * Client-side mirror of the server's rules. The server is the authority - this
 * exists so the common mistakes are caught without a round trip.
 */
const validateLocally = (): Record<string, string> => {
  const e: Record<string, string> = {}
  // Checked first so it is named first in the summary. It is the least obvious
  // requirement on the page, and with several fields blank the truncated list
  // would otherwise drop exactly the one the visitor could not guess.
  if (selectedCount.value === 0)
    e.selectedSeriesIds = 'Select at least one event series.'
  if (!form.email.trim()) e.email = 'Email is required.'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
    e.email = 'Enter a valid email address.'
  if (!form.firstName.trim()) e.firstName = 'First name is required.'
  if (!form.lastName.trim()) e.lastName = 'Last name is required.'
  if (!form.country.trim()) e.country = 'Country is required.'
  if (showState.value && !form.state.trim()) e.state = 'State/Province is required.'
  // Names the question: as a lone error this message is the whole summary,
  // and "This question is required" does not say which one.
  if (!form.govAffiliation.trim())
    e.govAffiliation = 'Please answer the government organisation question.'
  if (showGovLevel.value && !form.govLevel.trim())
    e.govLevel = 'Level of government is required.'
  return e
}

/**
 * Human names for the summary. There is deliberately no inline error text next
 * to each field - the original design has nowhere to put it without shifting
 * the layout - so this summary is the only place a sighted user learns which
 * field is wrong. "Please correct 5 fields" does not tell them that.
 */
const FIELD_LABELS: Record<string, string> = {
  selectedSeriesIds: 'at least one event series',
  email: 'Email',
  firstName: 'First Name',
  lastName: 'Last Name',
  country: 'Country',
  state: 'State/Province',
  nonUsCountry: 'Country (Non US only)',
  govAffiliation: 'the government organisation question',
  govLevel: 'Level of government'
}

const summarise = (errors: Record<string, string>) => {
  const keys = Object.keys(errors)
  if (keys.length === 0) return 'Please check the form and try again.'
  // A single problem already has a precise message of its own.
  if (keys.length === 1) return errors[keys[0]!]!

  const labels = keys.map((k) => FIELD_LABELS[k] ?? k)
  const list =
    labels.length <= 4
      ? `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`
      : `${labels.slice(0, 3).join(', ')} and ${labels.length - 3} more`
  return `Please complete ${list}.`
}

/**
 * Submits the form to our own endpoint, which writes the row to Directus.
 *
 * Validation order matches the original: event series first, then the rest.
 * The button is disabled for the duration, and the server additionally
 * suppresses an identical repeat within a short window, so a double submit
 * cannot create two rows.
 */
const onSubmit = async () => {
  submitMessage.value = null
  fieldErrors.value = {}

  // Deliberately NOT short-circuiting on the empty-series case the way the
  // original does. Reporting only that would hide the five other blank fields
  // and force the visitor through the form one error at a time.
  const local = validateLocally()
  if (Object.keys(local).length > 0) {
    fieldErrors.value = local
    fail(summarise(local))
    return
  }

  submitting.value = true
  try {
    const res = await $fetch<{
      ok: boolean
      stored: boolean
      duplicate?: boolean
      id: string | number | null
    }>('/api/intake', {
      method: 'POST',
      body: {
        email: form.email,
        firstName: form.firstName,
        lastName: form.lastName,
        country: form.country,
        state: form.state,
        nonUsCountry: form.nonUsCountry,
        govAffiliation: form.govAffiliation,
        govLevel: form.govLevel,
        newsletterOptIn: form.newsletterOptIn,
        selectedSeriesIds: [...selectedSeries.value],
        // Honeypot: empty for real visitors.
        website: honeypot.value
      }
    })

    if (res.duplicate) {
      succeed('We already have this registration on file, so nothing was duplicated.')
    } else {
      // Do NOT name a local `ref` here. Nuxt's auto-import scanner skips
      // injecting `import { ref } from 'vue'` if the module declares that
      // identifier anywhere - even block-scoped - which breaks every ref()
      // call in setup and 500s the page.
      const reference = res.id != null ? ` Your reference is #${res.id}.` : ''
      const news = form.newsletterOptIn
        ? ' You are also subscribed to the weekly newsletter.'
        : ''
      succeed(`Thanks - your registration has been recorded.${reference}${news}`)
    }
  } catch (error: unknown) {
    // Nuxt wraps the H3 error: statusMessage on `data`, our payload on `data.data`.
    const err = error as {
      statusCode?: number
      data?: { statusMessage?: string; message?: string; data?: { errors?: Record<string, string> } }
    }
    const serverErrors = err?.data?.data?.errors
    if (serverErrors && Object.keys(serverErrors).length > 0) {
      fieldErrors.value = serverErrors
      fail(err?.data?.statusMessage || summarise(serverErrors))
    } else {
      fail(
        err?.data?.statusMessage ||
          err?.data?.message ||
          'Something went wrong. Please try again.'
      )
    }
  } finally {
    submitting.value = false
  }
}

/**
 * Conditional-field rules, transcribed from the original's computed refs.
 *
 *   State/Province     shown when normalizeCountry(country) === 'US'  (`Dt`)
 *                      and required under the same condition          (`oe`)
 *   Country (Non US)   shown when country is 'Outside the United
 *                      States', or is a 2-letter code that is not US   (`Pt`)
 *   Level of gov't     shown when the affiliation answer starts with
 *                      "yes", case-insensitively                      (`xe`)
 *
 * That last one is worth spelling out: it is a startsWith("yes") test, not a
 * check against specific options. So it shows for all three "Yes, ..."
 * answers - including "government-affiliated organization" - even though the
 * question reads "If a government employee or consultant".
 */
const showState = computed(() => normalizeCountry(form.country) === 'US')
const stateRequired = showState

const showNonUsCountry = computed(() => {
  const v = form.country.trim()
  if (!v) return false
  if (v === 'Outside the United States') return true
  const code = normalizeCountry(v)
  return !!code && code !== 'US'
})

const showGovLevel = computed(() =>
  form.govAffiliation.trim().toLowerCase().startsWith('yes')
)

// The original clears a conditional answer whenever its field goes away, so a
// stale answer is never submitted.
watch(showGovLevel, (visible) => {
  if (!visible) form.govLevel = ''
})
watch(
  () => form.country,
  () => {
    if (normalizeCountry(form.country) === 'US') form.nonUsCountry = ''
    else form.state = ''
  }
)

/** Selected series ids. Empty on first render, as in the original. */
const selectedSeries = ref<number[]>([])

const selectedCount = computed(() => selectedSeries.value.length)
const allSelected = computed(
  () => EVENT_SERIES.length > 0 && selectedCount.value === EVENT_SERIES.length
)

/**
 * The original's select-all button is a toggle: its label reads
 * "Unselect all series" once everything is selected, and clicking it then
 * clears the whole list.
 */
const toggleAllSeries = () => {
  selectedSeries.value = allSelected.value ? [] : EVENT_SERIES.map((s) => s.id)
}

</script>

<template>
  <div id="main-content" class="zoom-events-page">
    <div class="registration-form-inline-container">
      <div class="registration-details-header">
        <h2>Registration Details</h2>
      </div>

      <div class="registration-form-wrapper">
        <!--
          Two polite/assertive live regions, as in the original. They stay empty
          until there is something to announce (validation, submit result).
        -->
        <div
          ref="statusRegion"
          role="status"
          aria-live="polite"
          aria-atomic="true"
          class="sr-only"
        />
        <div
          ref="alertRegion"
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
          class="sr-only"
        />

        <!--
          The original's alert slot sits here. No role on the visible box: the
          sr-only regions above already announce, and duplicating the role would
          make a screen reader read every message twice.
        -->
        <div
          v-if="submitMessage"
          ref="alertBox"
          class="alert"
          :class="submitMessage.kind === 'error' ? 'alert-error' : 'alert-success'"
          tabindex="-1"
        >{{ submitMessage.text }}</div>

        <form class="registration-form" novalidate @submit.prevent>
          <div class="form-section">
            <div class="form-group">
              <label for="email">
                Email <span class="required" aria-label="required">*</span>
              </label>
              <input
                id="email"
                v-model="form.email"
                type="email"
                required
                aria-required="true"
                :aria-invalid="invalid('email')"
                placeholder="your.email@example.com"
                autocomplete="email"
              />
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="first_name">
                  First Name <span class="required" aria-label="required">*</span>
                </label>
                <input
                  id="first_name"
                  v-model="form.firstName"
                  type="text"
                  required
                  aria-required="true"
                  :aria-invalid="invalid('firstName')"
                  placeholder="John"
                  autocomplete="given-name"
                />
              </div>
              <div class="form-group">
                <label for="last_name">
                  Last Name <span class="required" aria-label="required">*</span>
                </label>
                <input
                  id="last_name"
                  v-model="form.lastName"
                  type="text"
                  required
                  aria-required="true"
                  :aria-invalid="invalid('lastName')"
                  placeholder="Doe"
                  autocomplete="family-name"
                />
              </div>
            </div>
          </div>

          <div class="form-section">
            <!--
              A 1fr 1fr grid: Country on the left, and whichever of
              State/Province or Country (Non US only) applies on the right.
              They are mutually exclusive, so the right cell is empty until a
              country is chosen.
            -->
            <div class="form-row">
              <div class="form-group">
                <label for="country">
                  Country <span class="required" aria-label="required">*</span>
                </label>
                <select
                  id="country"
                  v-model="form.country"
                  required
                  aria-required="true"
                  :aria-invalid="invalidIf('country')"
                  class="custom-question-select"
                  autocomplete="country"
                >
                  <option value="">Select country (required)</option>
                  <option v-for="opt in COUNTRY_OPTIONS" :key="opt" :value="opt">
                    {{ opt }}
                  </option>
                </select>
              </div>

              <div v-if="showState" class="form-group">
                <label for="state">
                  State/Province
                  <span v-if="stateRequired" class="required" aria-label="required">*</span>
                </label>
                <select
                  id="state"
                  v-model="form.state"
                  :required="stateRequired"
                  :aria-required="stateRequired ? 'true' : undefined"
                  :aria-invalid="invalidIf('state')"
                  class="custom-question-select"
                  autocomplete="address-level1"
                >
                  <option value="">
                    {{ stateRequired ? 'Select state (required)' : 'Select state' }}
                  </option>
                  <option v-for="opt in STATE_OPTIONS" :key="opt" :value="opt">
                    {{ opt }}
                  </option>
                </select>
              </div>

              <div v-if="showNonUsCountry" class="form-group">
                <label :for="IDS.nonUsCountry" class="question-label">
                  {{ NON_US_COUNTRY_TITLE }}
                </label>
                <input
                  :id="IDS.nonUsCountry"
                  v-model="form.nonUsCountry"
                  type="text"
                  :aria-invalid="invalidIf('nonUsCountry')"
                  :minlength="NON_US_COUNTRY_MIN_LENGTH"
                  :maxlength="NON_US_COUNTRY_MAX_LENGTH"
                  placeholder="Enter your answer (optional)"
                  class="custom-question-input"
                />
              </div>
            </div>

            <div class="form-row gov-questions-row">
              <div class="form-group custom-question-group">
                <label :for="IDS.govAffiliation" class="question-label">
                  {{ GOV_AFFILIATION_TITLE }}
                  <span class="required" aria-label="required">*</span>
                </label>
                <select
                  :id="IDS.govAffiliation"
                  v-model="form.govAffiliation"
                  required
                  aria-required="true"
                  :aria-invalid="invalidIf('govAffiliation')"
                  class="custom-question-select"
                >
                  <option disabled value="">Select</option>
                  <option
                    v-for="opt in GOV_AFFILIATION_OPTIONS"
                    :key="opt"
                    :value="opt"
                  >
                    {{ opt }}
                  </option>
                </select>
              </div>

              <div v-if="showGovLevel" class="form-group custom-question-group">
                <label :for="IDS.govLevel" class="question-label">
                  {{ GOV_LEVEL_TITLE }}
                  <span class="required" aria-label="required">*</span>
                </label>
                <select
                  :id="IDS.govLevel"
                  v-model="form.govLevel"
                  required
                  aria-required="true"
                  :aria-invalid="invalidIf('govLevel')"
                  class="custom-question-select"
                >
                  <option disabled value="">Select</option>
                  <option v-for="opt in GOV_LEVEL_OPTIONS" :key="opt" :value="opt">
                    {{ opt }}
                  </option>
                </select>
              </div>
            </div>
          </div>
        </form>

        <div class="selected-series-section">
          <h3 class="selected-series-title">Selected Event Series</h3>
          <!--
            aria-live added: toggling a checkbox changes this count, and without
            it a screen-reader user gets no feedback that anything happened.
          -->
          <p class="selected-series-subtitle" aria-live="polite">
            You are registering for <strong>{{ selectedCount }}</strong> event series.
          </p>
          <div class="select-all-container" style="margin-bottom: 1rem;">
            <button
              type="button"
              class="btn btn-secondary btn-small"
              @click="toggleAllSeries"
            >{{ allSelected ? 'Unselect all series' : 'Select all series' }}</button>
            <span
              v-if="selectedCount === 0"
              style="margin-left: 0.75rem; color: rgb(85, 85, 85);"
            > Select at least one series to continue. </span>
          </div>
          <SeriesCheckboxList
            v-model="selectedSeries"
            :items="EVENT_SERIES"
            id-prefix="series"
          />
        </div>

        <form
          class="registration-form additional-questions-form"
          novalidate
          @submit.prevent="onSubmit"
        >
          <!--
            NEW FIELD - not present on the original. Styles live in the
            component's own scoped block; see components/NewsletterOptIn.vue for
            why it matches the Selected Event Series rows rather than the
            generic form-row pattern.
          -->
          <NewsletterOptIn v-model="form.newsletterOptIn" />

          <div class="honeypot-field">
            <label for="website">Website (leave blank)</label>
            <input
              id="website"
              v-model="honeypot"
              type="text"
              name="website"
              tabindex="-1"
              autocomplete="off"
              aria-hidden="true"
            />
          </div>

          <div class="form-actions">
            <!--
              Turnstile mount point. Present and hidden in the original too; it
              stays empty here because the Cloudflare script is not loaded.
            -->
            <div class="turnstile-wrapper" style="display: none;">
              <div id="turnstile-widget-container" class="turnstile-container" />
            </div>
            <button
              type="submit"
              class="btn btn-primary btn-medium"
              :aria-busy="submitting ? 'true' : 'false'"
              aria-live="polite"
              :disabled="submitting"
            ><span>{{ submitting ? 'Registering…' : 'Register' }}</span></button>
            <p class="registration-help-text">
              Having trouble registering? Contact us at
              <a href="#">hello [at] innovate-us.org</a>
            </p>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
