<script setup lang="ts">
/**
 * Weekly-newsletter opt-in.
 *
 * NEW COMPONENT - nothing on the original page corresponds to it, so this is
 * the one place with styles of our own. It is deliberately isolated in a scoped
 * block so the boundary between "cloned" and "added" stays obvious.
 *
 * Design brief: it has to look like it shipped with the page. The nearest
 * sibling on this screen is the Selected Event Series list, so the card borrows
 * that component's vocabulary rather than inventing any:
 *
 *   20x20 checkbox with accent-color #06c   <- .series-checkbox-input
 *   1rem gap between control and text       <- .series-checkbox-label
 *   16px / 500 / #1a1a1a title              <- .series-list-title
 *   6px radius, #e2e8f0 border, .2s ease    <- .checkbox-option
 *   #f7fafc resting, #edf2f7 hover          <- .checkbox-option:hover
 *   focus ring 0 0 0 3px rgba(0,102,204,.1) <- the form inputs' :focus
 *
 * The one intentional deviation is the hint colour. The site's .question-hint
 * is #9ca3af, which measures ~2.6:1 on this card and fails WCAG AA for body
 * text. #4a5568 is also the site's own secondary-text colour (it is what
 * .registration-details-header .form-description uses) and clears AA
 * comfortably, so the palette stays native and the text stays legible.
 */

const model = defineModel<boolean>({ required: true })

const INPUT_ID = 'newsletter_opt_in'
const HINT_ID = 'newsletter_opt_in_hint'
</script>

<template>
  <div class="newsletter-optin">
    <!--
      The input is nested inside the label AND matched by `for`, so the whole
      padded card is a hit target rather than just the text. Padding lives on
      the label, not the wrapper, so clicks in the padding still toggle.
    -->
    <label class="newsletter-optin__label" :for="INPUT_ID">
      <input
        :id="INPUT_ID"
        v-model="model"
        type="checkbox"
        class="newsletter-optin__input"
        :aria-describedby="HINT_ID"
      />
      <span class="newsletter-optin__text">
        <span class="newsletter-optin__title">
          Sign me up for the weekly InnovateUS newsletter
        </span>
        <span :id="HINT_ID" class="newsletter-optin__hint">
          One email a week. Unsubscribe any time.
        </span>
      </span>
    </label>
  </div>
</template>

<style scoped>
.newsletter-optin {
  background: #f7fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  transition: background-color 0.2s ease, border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.newsletter-optin:hover {
  background: #edf2f7;
  border-color: #cbd5e0;
}

/*
 * :focus-within, not :focus - the focusable element is the checkbox, but the
 * affordance a keyboard user needs to see is the whole card. Mirrors the focus
 * treatment on the text inputs above so the page has one focus language.
 */
.newsletter-optin:focus-within {
  border-color: #06c;
  box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.1);
}

.newsletter-optin__label {
  align-items: flex-start;
  cursor: pointer;
  display: flex;
  gap: 1rem;
  margin: 0;
  padding: 1rem;
}

.newsletter-optin__input {
  accent-color: #06c;
  cursor: pointer;
  flex-shrink: 0;
  height: 20px;
  width: 20px;
  /*
   * Top-aligned, not centred: the text block is two lines, and centring a
   * control against a multi-line label is what made the first attempt look
   * crooked. The 2px nudge optically centres the 20px box on the 24px first
   * line instead.
   */
  margin: 2px 0 0;
}

.newsletter-optin__text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  /* Lets the text wrap instead of forcing the flex row wider. */
  min-width: 0;
}

.newsletter-optin__title {
  color: #1a1a1a;
  font-size: 1rem;
  font-weight: 500;
  line-height: 1.5;
}

.newsletter-optin__hint {
  color: #4a5568;
  font-size: 0.875rem;
  font-weight: 400;
  line-height: 1.4;
}

@media (prefers-reduced-motion: reduce) {
  .newsletter-optin {
    transition: none;
  }
}
</style>
