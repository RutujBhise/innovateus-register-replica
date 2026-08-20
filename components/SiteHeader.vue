<script setup lang="ts">
/**
 * SiteHeader
 * Replica of the sticky `.header-container` header.
 *
 * All styling lives in assets/css/header.css (global), matching the original,
 * where these rules are unscoped. Only the CTA button carries scoped styles,
 * so it is split out into HeaderNavButton.vue.
 */

type NavLink = { label: string; href: string }
type NavItem = {
  id: string
  label: string
  /** A bare link renders as <a> with no chevron (e.g. Featured Topics). */
  href?: string
  links?: NavLink[]
  /**
   * The original applies .dropdown__menu-links--small to every panel except
   * "About Us", which keeps the wide `position: fixed` grid variant.
   */
  small?: boolean
}

const navItems: NavItem[] = [
  {
    id: 'ways-to-learn',
    label: 'Ways to Learn',
    small: true,
    links: [
      { label: 'At-Your-Own-Pace Courses', href: '/course' },
      { label: 'Workshops', href: '/workshops' },
      { label: 'Coaching Programs', href: '/google-certificates' }
    ]
  },
  {
    id: 'featured-topics',
    label: 'Featured Topics',
    href: '/spring-series',
    small: true,
    links: []
  },
  {
    id: 'news-perspectives',
    label: 'News & Perspectives',
    small: true,
    links: [
      { label: 'Updates from InnovateUS', href: '/comms' },
      { label: 'Reboot Democracy Blog', href: 'http://rebootdemocracy.ai' },
      { label: 'Observatory of Public Sector AI', href: '/research' }
    ]
  },
  {
    id: 'about-us',
    label: 'About Us',
    small: false,
    links: [
      { label: 'Mission & Vision', href: '/about' },
      { label: 'Our Team', href: '/about?scrollTo=team' },
      { label: 'Faculty & Instructors', href: '/about?scrollTo=faculty' },
      { label: 'Alumni', href: '/about?scrollTo=alumni' },
      { label: 'Media Kit', href: '/brandkit' }
    ]
  }
]

const openId = ref<string | null>(null)
const headerEl = ref<HTMLElement | null>(null)
/** Trigger that opened the current panel, so Escape can hand focus back to it. */
const openTriggerEl = ref<HTMLElement | null>(null)

const toggle = (id: string, event: Event) => {
  const willOpen = openId.value !== id
  openId.value = willOpen ? id : null
  openTriggerEl.value = willOpen ? (event.currentTarget as HTMLElement) : null
}

const closeAll = () => {
  openId.value = null
  openTriggerEl.value = null
}

/**
 * The original registers a plain `click` listener on document to close any
 * open panel on an outside click. Verified in the live chunk B789qlOy.js.
 */
const onDocumentClick = (event: MouseEvent) => {
  if (!headerEl.value) return
  if (!headerEl.value.contains(event.target as Node)) closeAll()
}

/**
 * Accessibility addition, deliberately NOT in the original: Escape closes the
 * open panel and returns focus to its trigger. Behaviour only - no pixels move.
 */
const onDocumentKeydown = (event: KeyboardEvent) => {
  if (event.key !== 'Escape' || openId.value === null) return
  const trigger = openTriggerEl.value
  closeAll()
  trigger?.focus()
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
  document.addEventListener('keydown', onDocumentKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('keydown', onDocumentKeydown)
})
</script>

<template>
  <header ref="headerEl" class="header-container">
    <div class="header-subcontainer">
      <a href="/" class="header-logo-link">
        <img
          class="header-container__img"
          alt="The InnovateUS logo represented by the word 'innovate' in dark blue, lowercase letters, next to the word 'us' in gold lowercase letters, surrounded by parentheses."
          src="/images/wordmark_light.svg"
        />
      </a>

      <div class="menu-container">
        <button
          type="button"
          class="icon-container menu-button"
          tabindex="0"
          aria-label="Open menu"
        >
          <svg
            width="22"
            height="18"
            viewBox="0 0 22 18"
            fill="var(--icon-color, var(--neutral-600))"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M0.5 0H21.5V3H0.5V0ZM0.5 7.5H21.5V10.5H0.5V7.5ZM21.5 15V18H0.5V15H21.5Z"
              fill="#193154"
            />
          </svg>
        </button>
      </div>

      <nav class="header-menu__items">
        <div v-for="item in navItems" :key="item.id" class="dropdown-container">
          <div class="dropdown-new">
            <!-- Bare link variant: no chevron, navigates directly -->
            <a
              v-if="item.href"
              :href="item.href"
              class="dropdown__menu-item dropdown__menu-item--link"
              tabindex="0"
            >
              <span class="dropdown__menu-item-text">{{ item.label }}</span>
            </a>

            <!-- Toggle variant: chevron rotates 180deg when open -->
            <div
              v-else
              tabindex="0"
              class="dropdown__menu-item"
              role="button"
              aria-haspopup="true"
              :aria-expanded="openId === item.id"
              :aria-controls="`dropdown-panel-${item.id}`"
              @click="toggle(item.id, $event)"
              @keydown.enter.prevent="toggle(item.id, $event)"
              @keydown.space.prevent="toggle(item.id, $event)"
            >
              <span
                class="dropdown__menu-item-text"
                :class="{ 'is-toggled': openId === item.id }"
              >{{ item.label }}</span>
              <span
                class="dropdown__menu-item-arrow"
                :class="{ 'dropdown__menu-item-arrow--open': openId === item.id }"
                aria-hidden="true"
              >
                <svg
                  class="dropdown__menu-item-arrow-svg"
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="23"
                  viewBox="0 0 24 23"
                  fill="none"
                >
                  <path
                    d="M10.6985 5.82227L10.6528 17.8011"
                    stroke="currentColor"
                    stroke-width="1.33333"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                  <path
                    d="M17.2625 12.6375L10.7623 19.1377L4.1248 12.5002"
                    stroke="currentColor"
                    stroke-width="1.33333"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </span>
            </div>
          </div>

          <div
            :id="`dropdown-panel-${item.id}`"
            class="dropdown__menu-links"
            :class="{ 'dropdown__menu-links--small': item.small }"
            :style="openId === item.id ? undefined : { display: 'none' }"
          >
            <span
              v-for="link in item.links"
              :key="link.href"
              class="dropdown__menu-item-container"
            >
              <a :href="link.href" class="dropdown__link">
                <span>{{ link.label }}</span>
              </a>
            </span>
          </div>
        </div>

        <!-- CTA -->
        <div class="dropdown-container">
          <div class="dropdown-new">
            <HeaderNavButton label="Sign Up for Updates" />
          </div>
          <div
            class="dropdown__menu-links dropdown__menu-links--small"
            style="display: none"
          />
        </div>
      </nav>
    </div>
  </header>
</template>
