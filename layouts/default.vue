<script setup lang="ts">
/**
 * Default layout.
 * Mirrors the original DOM order on /register:
 *   PartnerBanner -> SiteHeader -> <main> -> <footer> -> PartnerBanner
 */
</script>

<template>
  <div>
    <PartnerBanner />
    <SiteHeader />

    <main>
      <slot />
    </main>

    <SiteFooter />

    <PartnerBanner />
  </div>
</template>
