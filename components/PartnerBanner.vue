<script setup lang="ts">
/**
 * PartnerBanner
 * Replica of the `.banner` component (originally data-v-9a351003).
 * Rendered twice on /register: once above the header, once below the footer.
 * The lower instance uses the `reverse` variant, which flips the mobile
 * dropdown order and swaps the slideDown animation for slideUp.
 */

const props = withDefaults(
  defineProps<{
    reverse?: boolean
  }>(),
  { reverse: false }
)

const partners = [
  { label: 'AI for Impact', href: 'https://burnes.northeastern.edu/ai-for-impact-coop/' },
  { label: 'The Burnes Center for Social Change', href: 'https://www.theburnescenter.org' },
  { label: 'Reboot Democracy', href: 'https://rebootdemocracy.ai' },
  { label: 'The GovLab', href: 'https://thegovlab.org' }
]

const open = ref(false)
const toggle = () => (open.value = !open.value)
</script>

<template>
  <div class="banner">
    <!-- Desktop: single row, visible above 1024px -->
    <div class="banner__desktop">
      <span class="banner__label">This is a partner project of :</span>
      <a
        v-for="partner in partners"
        :key="partner.href"
        :href="partner.href"
        target="_blank"
        rel="noopener"
        class="banner__link"
      >
        <img src="/images/arrow-inno.svg" alt="" class="banner__icon" />{{ ' ' + partner.label + ' ' }}</a>
    </div>

    <!-- Mobile: collapsible, visible at or below 1024px -->
    <div class="banner__mobile">
      <button
        class="banner__toggle"
        type="button"
        :aria-expanded="open"
        aria-controls="banner-partner-list"
        @click="toggle"
      >
        <span class="banner__label">This is a partner project of :</span>
        <img
          src="/images/arrow-down2.svg"
          alt=""
          class="banner__arrow"
          :class="{ 'banner__arrow--open': open }"
        />
      </button>

      <div
        v-if="open"
        id="banner-partner-list"
        class="banner__dropdown"
        :class="{ 'banner__dropdown--reverse': props.reverse }"
      >
        <a
          v-for="partner in partners"
          :key="partner.href"
          :href="partner.href"
          target="_blank"
          rel="noopener"
          class="banner__link"
        >
          <img src="/images/arrow-inno.svg" alt="" class="banner__icon" />{{ ' ' + partner.label + ' ' }}</a>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Transcribed verbatim from the data-v-9a351003 scoped block. */

.banner {
  background-color: #376bd1;
  border-bottom: 1.5px solid hsla(0, 0%, 100%, 0.2);
  width: 100%;
}

.banner__desktop {
  align-items: center;
  box-sizing: border-box;
  display: flex;
  gap: 40px;
  height: 45px;
  margin: 0 auto;
  max-width: 88rem;
  padding: 0 4rem;
}

.banner__mobile {
  display: none;
}

.banner__label,
.banner__link {
  color: #f8f6f1;
  font-family: var(--font-sans);
  font-size: 14px;
  font-weight: 400;
  line-height: 20px;
  white-space: nowrap;
}

.banner__link {
  align-items: center;
  display: flex;
  gap: 12px;
  letter-spacing: 0;
  text-decoration: none;
}

.banner__link:hover {
  color: #f8f6f1;
  opacity: 0.8;
}

.banner__icon {
  flex-shrink: 0;
  height: auto;
  width: 17.67px;
}

.banner__toggle {
  align-items: center;
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  padding: 12px 1.5rem;
  width: 100%;
}

.banner__arrow {
  filter: brightness(0) invert(1);
  height: 16px;
  transition: transform 0.3s ease;
  width: 16px;
}

.banner__arrow--open,
.banner__arrow--up {
  transform: rotate(180deg);
}

.banner__dropdown {
  animation: slideDown 0.3s ease;
  border-bottom: 1.5px solid hsla(0, 0%, 100%, 0.15);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 15px;
  padding: 12px 20px;
}

.banner__dropdown--reverse {
  animation: slideUp 0.4s ease;
  flex-direction: column-reverse;
}

.banner__dropdown--reverse .banner__arrow--open {
  transform: rotate(0);
}

.banner__dropdown-header {
  align-items: center;
  display: flex;
  justify-content: space-between;
  width: 100%;
}

@keyframes slideDown {
  0% {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideUp {
  0% {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 1024px) {
  .banner__desktop {
    display: none;
  }
  .banner__mobile {
    display: flex;
    flex-direction: column;
  }
  .banner__toggle {
    padding: 12px 20px;
  }
}
</style>
