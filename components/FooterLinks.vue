<script setup lang="ts">
/**
 * Footer link column. Mirrors the original's own component (data-v-02f0d951).
 *
 * The original renders these with a v-for inside a <nav>, so they are plain
 * anchors rather than list items - which is why .footer-links carries a
 * list-style declaration that does nothing. Kept verbatim.
 */

const links = [
  { label: 'Contact Us', href: '/contact-us' },
  { label: 'Privacy Policy', href: '/privacy-policy' },
  { label: 'Accessibility Policy', href: '/accessibility-policy' }
]
</script>

<template>
  <nav class="footer-links" aria-label="Footer links">
    <a v-for="link in links" :key="link.href" :href="link.href" class="footer-link">{{ link.label }}</a>
  </nav>
</template>

<style scoped>
.footer-links {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  list-style: none;
  margin: 0;
  padding: 0;
}

.footer-link {
  border-radius: 2px;
  color: var(--white, #f9fbff);
  font-family: 'Libre Franklin';
  font-size: 16px;
  font-style: normal;
  font-weight: 500;
  line-height: 24px;
  text-decoration: none;
  transition: opacity 0.3s ease;
}

.footer-link:hover {
  opacity: 0.8;
  text-decoration: underline;
}

.footer-link:focus {
  outline: 2px solid var(--blue-100, #bcd8f6);
  outline-offset: 2px;
}

@media (max-width: 1024px) {
  .footer-links {
    flex-direction: row;
    flex-wrap: wrap;
    gap: 1.5rem;
  }
}
</style>
