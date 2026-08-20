<script setup lang="ts">
/**
 * HeaderNavButton
 * Replica of the `.header-nav-btn` component (originally data-v-1ec04a33).
 *
 * Note on the cascade: these scoped styles paint the button in --blue-100
 * (#bcd8f6), but in the header it is wrapped in .dropdown-container and given
 * the .dropdown-menu-cta-button class, so the higher-specificity rules in
 * assets/css/header.css repaint it in #006be0. Only `cursor`, `white-space`
 * and `:focus` survive from this block. That is exactly how the original
 * behaves, so both layers are kept.
 */

defineProps<{
  label: string
}>()
</script>

<template>
  <button type="button" class="header-nav-btn dropdown-menu-cta-button" tabindex="0">
    <span class="header-nav-btn__text">{{ label }}</span>
  </button>
</template>

<style scoped>
/* Transcribed verbatim from the data-v-1ec04a33 scoped block. */

.header-nav-btn {
  align-items: center;
  background: transparent;
  border: 1.5px solid var(--blue-100, #bcd8f6);
  border-radius: 100px;
  cursor: pointer;
  display: flex;
  gap: 12px;
  padding: 15px 30px;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.header-nav-btn:hover {
  background: var(--blue-100, #bcd8f6);
  color: #fff;
}

.header-nav-btn:focus {
  box-shadow: 0 0 0 3px #bcd8f64d;
  outline: none;
}

.header-nav-btn__text {
  color: var(--blue-100, #bcd8f6);
  font-family: Libre Franklin;
  font-size: 14px;
  font-style: normal;
  font-weight: 600;
  letter-spacing: 1.4px;
  line-height: 22px;
  text-transform: uppercase;
  transition: color 0.3s ease;
}

.header-nav-btn:hover .header-nav-btn__text {
  color: #fff;
}
</style>
