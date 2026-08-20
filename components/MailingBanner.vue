<script setup lang="ts">
/**
 * The "Want to be a part of our community of innovators?" banner at the top of
 * the footer. Mirrors the original's own component (data-v-5670f074).
 *
 * Styles below are transcribed verbatim from the live stylesheet.
 */
</script>

<template>
  <div class="mailing-banner">
    <!--
      The two spans are separated by exactly three spaces in the original.
      They collapse to one space when rendered, but the interpolation keeps the
      text content byte-identical rather than relying on Vue's whitespace
      condensing.
    -->
    <h3 class="mailing-heading"><span class="mailing-heading-white">Want to be a part of our community of innovators?</span>{{ '   ' }}<span class="mailing-heading-italic">We'd love to keep in touch.</span></h3>
    <!--
      The original adds role="button" here. It is a link that navigates, so the
      role makes a screen reader announce "button" for something that does not
      behave like one (no Space activation, and the announcement hides that it
      moves you to another page). Dropping the attribute changes no pixels.
    -->
    <a href="/mailinglist" class="mailing-btn"> Join Our Mailing List </a>
  </div>
</template>

<style scoped>
.mailing-banner {
  align-items: flex-start;
  align-self: stretch;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 40px;
  justify-content: center;
  max-width: 800px;
  padding: 100px 80px 0;
  width: 100%;
}

.mailing-heading {
  font-family: 'DM Serif Display', serif;
  font-size: 36px;
  font-style: normal;
  font-weight: 400;
  line-height: 42px;
  margin: 0;
}

.mailing-heading-white {
  color: #f9fbff;
}

.mailing-heading-italic {
  color: #bcd8f6;
  font-style: italic;
}

.mailing-btn {
  align-items: center;
  background: transparent;
  border: 1.5px solid #bcd8f6;
  border-radius: 100px;
  color: #bcd8f6;
  cursor: pointer;
  display: inline-flex;
  font-family: 'Libre Franklin', sans-serif;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 1.4px;
  line-height: 22px;
  padding: 15px 30px;
  text-decoration: none;
  text-transform: uppercase;
  transition: background 0.2s ease, color 0.2s ease;
  white-space: nowrap;
}

.mailing-btn:hover {
  background: #bcd8f6;
  color: #0d2a4a;
}

.mailing-btn:focus-visible {
  outline: 2px solid #bcd8f6;
  outline-offset: 2px;
}

@media (max-width: 1024px) {
  .mailing-banner {
    padding: 60px 40px 0;
  }

  .mailing-heading {
    font-size: 28px;
    line-height: 36px;
  }
}

@media (max-width: 640px) {
  .mailing-banner {
    padding: 48px 24px 0;
  }

  .mailing-btn {
    align-self: stretch;
    box-sizing: border-box;
    justify-content: center;
    min-width: 0;
    padding-inline: 20px;
    text-align: center;
    white-space: normal;
  }
}
</style>
