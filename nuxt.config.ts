// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: false },

  // Nitro and Vite's HMR socket both want the same port, and they end up splitting
  // the address families: whichever one Nitro does not get answers plain HTTP
  // with "426 Upgrade Required". Whether you see the app then depends on
  // whether your browser resolves "localhost" to 127.0.0.1 or ::1.
  // Fix: give HMR its own port, and bind Nitro to "::" so Node accepts both
  // IPv4 and IPv6 on 3200 (dual-stack).
  devServer: {
    host: '::',
    port: 3200
  },

  vite: {
    server: {
      hmr: { port: 3201 }
    }
  },

  css: [
    '~/assets/css/base.css',
    '~/assets/css/header.css',
    '~/assets/css/register-page.css'
  ],

  /**
   * Server-only by default. Anything outside `public` is never sent to the
   * browser, which is where the Directus token has to stay. Nuxt overrides each
   * of these from the matching env var:
   *   directusUrl       <- NUXT_DIRECTUS_URL
   *   directusToken     <- NUXT_DIRECTUS_TOKEN
   *   intakeCollection  <- NUXT_INTAKE_COLLECTION
   *
   * Defaults point at the collection named in the task brief:
   *   https://burnes-center.directus.app/items/cw_intake
   * so only the token has to be supplied via .env.
   */
  runtimeConfig: {
    directusUrl: 'https://burnes-center.directus.app',
    directusToken: '',
    intakeCollection: 'cw_intake'
  },

  /**
   * Deployment target is Netlify. The preset is deliberately NOT pinned: Nitro
   * detects `netlify` from the platform's own env vars during the build, and
   * leaving it unset keeps `npm run build && npm run preview` working locally
   * with the node-server preset.
   *
   * Netlify's synchronous function timeout is 10s on the free tier and cannot
   * be raised there, which is why the intake route budgets 8s of its own (see
   * DEFAULTS in server/utils/directusClient.ts) rather than relying on the
   * platform to be patient.
   */

  routeRules: {
    '/': { redirect: '/register' },
    // Nothing about an intake response is cacheable, at any layer.
    '/api/**': { headers: { 'cache-control': 'no-store' } }
  },

  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      title: 'Zoom Events - InnovateUS',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content: 'Browse and register for upcoming Zoom events and workshops.'
        },
        // This is a replica for an exercise; keep it out of search results so it
        // cannot be mistaken for, or outrank, the real InnovateUS page.
        { name: 'robots', content: 'noindex, nofollow' }
      ],
      link: [
        // The original loads six families through three chained @import rules
        // inside a <style> block, which serialises the requests and blocks
        // render. Same families, same weights, but preconnected and requested
        // in parallel as a single stylesheet.
        //
        // Inria Sans and Inter are deliberately dropped: they are requested by
        // the original but no rule in its stylesheet references either one.
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href:
            'https://fonts.googleapis.com/css2' +
            '?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400' +
            '&family=Libre+Franklin:wght@300;400;500;600;700' +
            '&family=DM+Serif+Display:ital@0;1' +
            '&family=DM+Serif+Text:ital@0;1' +
            '&display=swap'
        }
      ]
    }
  }
})
