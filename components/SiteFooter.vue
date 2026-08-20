<script setup lang="ts">
/**
 * Site footer. Mirrors the original's own component (data-v-55b1c428) and its
 * three children: MailingBanner, FooterLinks, FooterSubscribeForm.
 *
 * Styles transcribed verbatim from the live stylesheet. `--white`,
 * `--light-blue` and `--blue-200` are never declared on the original either, so
 * the var() fallbacks are what actually render; kept as-is rather than
 * "tidied" into literals.
 */

/** Read from the original's footer chunk (DOjs7nod.js). */
const LINKEDIN_URL = 'https://linkedin.com/company/innovateus-govlab'
const BLUESKY_URL = 'https://bsky.app/profile/innovateus.bsky.social'

const openExternal = (url: string) => {
  window.open(url, '_blank', 'noopener,noreferrer')
}
</script>

<template>
  <footer class="footer-master-container">
    <MailingBanner />

    <div class="footer-inner">
      <div class="footer-logo-section">
        <a href="/" class="footer-logo-link">
          <img
            class="footer-container__img"
            src="/images/wordmark_dark.svg"
            alt="The InnovateUS logo is represented by the word 'innovate' in dark blue, lowercase letters, next to the word 'us' in gold lowercase letters, surrounded by parentheses."
          />
        </a>
      </div>

      <div class="footer-container">
        <div class="footer-links-section">
          <FooterLinks />
        </div>

        <div class="footer-follow-section">
          <div class="follow-us-container">
            <span class="follow-us-text">Follow us on</span>
            <div class="social-icons-grid" role="group" aria-label="Social media links">
              <button
                type="button"
                class="social-icon-button"
                aria-label="Follow us on LinkedIn (opens in new window)"
                @click="openExternal(LINKEDIN_URL)"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="60"
                  height="60"
                  viewBox="0 0 60 60"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M10 15C10 13.6739 10.5268 12.4021 11.4645 11.4645C12.4021 10.5268 13.6739 10 15 10H45C46.3261 10 47.5979 10.5268 48.5355 11.4645C49.4732 12.4021 50 13.6739 50 15V45C50 46.3261 49.4732 47.5979 48.5355 48.5355C47.5979 49.4732 46.3261 50 45 50H15C13.6739 50 12.4021 49.4732 11.4645 48.5355C10.5268 47.5979 10 46.3261 10 45V15Z"
                    stroke="#BCD8F6"
                    stroke-width="3"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                  <path
                    d="M20 27.5V40"
                    stroke="#BCD8F6"
                    stroke-width="3"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                  <path
                    d="M20 20V20.025"
                    stroke="#BCD8F6"
                    stroke-width="3"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                  <path
                    d="M30 40V27.5"
                    stroke="#BCD8F6"
                    stroke-width="3"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                  <path
                    d="M40 40V32.5C40 31.1739 39.4732 29.9021 38.5355 28.9645C37.5979 28.0268 36.3261 27.5 35 27.5C33.6739 27.5 32.4021 28.0268 31.4645 28.9645C30.5268 29.9021 30 31.1739 30 32.5"
                    stroke="#BCD8F6"
                    stroke-width="3"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </button>
              <button
                type="button"
                class="social-icon-button bluesky-button"
                aria-label="Follow us on Bluesky (opens in new window)"
                @click="openExternal(BLUESKY_URL)"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="44"
                  height="38"
                  viewBox="0 0 44 38"
                  fill="none"
                  aria-hidden="true"
                >
                  <g clip-path="url(#clip0_620_37)">
                    <path
                      d="M10.67 4.28844C7.362 1.89047 2 0.0344951 2 5.94041C2 7.1204 2.7 15.8463 3.112 17.2623C4.538 22.1882 9.372 22.7622 14 22.0002C5.91 23.3302 4.222 28.4161 8.666 32.82C10.726 34.856 12.492 36 14 36C18 36 20.268 30.4621 21 29.0001C21.666 27.6661 22 26.6661 22 26.0001C22 26.6661 22.334 27.6661 23 29.0001C23.732 30.4621 26 36 30 36C31.508 36 33.274 34.858 35.334 32.82C39.778 28.4141 38.09 23.3282 30 22.0002C34.628 22.7602 39.46 22.1882 40.888 17.2623C41.3 15.8463 42 7.1184 42 5.94041C42 0.0344951 36.64 1.89047 33.33 4.28844C28.744 7.61239 23.81 14.3843 22 18.0002C20.19 14.3843 15.256 7.61239 10.67 4.28844Z"
                      stroke="#BCD8F6"
                      stroke-width="3"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </g>
                  <defs>
                    <clipPath id="clip0_620_37">
                      <rect width="44" height="38" fill="white" />
                    </clipPath>
                  </defs>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div class="footer-form-section">
          <FooterSubscribeForm />
        </div>
      </div>

      <div class="footer-license-section">
        <!--
          Interpolated so the text content matches byte for byte: the original
          has a space either side of "This work is licensed under a", and the
          anchor carries its own leading and trailing space, producing a double
          space before "Creative".
        -->
        <p class="footer-license-text">{{ ' This work is licensed under a ' }}<a
            href="https://creativecommons.org/licenses/by-sa/4.0/"
            target="_blank"
            rel="noopener noreferrer"
          >{{ ' Creative Commons Attribution-ShareAlike 4.0 International License ' }}</a>{{ '. ' }}</p>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.footer-master-container {
  background: linear-gradient(
    180deg,
    #134175,
    #142941 53.85%,
    #142941 90%,
    #134175
  );
  color: #fff;
  margin: 0;
  padding: 0;
  width: 100%;
}

.footer-inner {
  align-items: flex-start;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 100px;
  margin: 0;
  max-width: 1440px;
  padding: 100px 80px 20px;
  width: 100%;
}

.footer-logo-section {
  flex: 0 0 auto;
}

.footer-logo-link {
  border-radius: 4px;
  display: block;
  text-decoration: none;
  transition: outline-offset 0.2s ease;
}

.footer-logo-link:focus {
  outline: 2px solid var(--blue-100, #bcd8f6);
  outline-offset: 2px;
}

.footer-container__img {
  display: block;
  height: 2rem;
  width: auto;
}

.footer-container {
  align-items: flex-start;
  display: flex;
  gap: 8rem;
  justify-content: flex-start;
  width: 100%;
}

.footer-links-section {
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  gap: 1rem;
}

.footer-follow-section {
  flex: 0 0 auto;
}

.follow-us-container {
  align-items: flex-start;
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 0 80px;
}

.follow-us-text {
  font-size: 0.875rem;
  font-weight: 500;
  letter-spacing: 0.05em;
  text-transform: capitalize;
}

.social-icons-grid {
  align-items: center;
  display: flex;
  gap: 1.5rem;
}

.social-icon-button {
  align-items: center;
  background: none;
  border: none;
  border-radius: 4px;
  color: #fff;
  cursor: pointer;
  display: flex;
  height: 3rem;
  justify-content: center;
  padding: 0;
  transition: all 0.3s ease;
  width: 3rem;
}

.social-icon-button:hover svg {
  opacity: 0.8;
  transform: scale(1.05);
}

.social-icon-button:focus {
  outline: 2px solid var(--blue-100, #bcd8f6);
  outline-offset: 2px;
}

.social-icon-button svg {
  height: 100%;
  transition: all 0.3s ease;
  width: 100%;
}

.bluesky-button svg {
  aspect-ratio: 22 / 19;
  height: 38px;
  width: 44px;
}

.footer-form-section {
  flex: 1;
  min-width: 0;
}

.footer-license-section {
  text-align: center;
  width: 100%;
}

.footer-license-text {
  margin: 0;
  text-align: center;
}

.footer-license-text,
.footer-license-text a {
  color: var(--white, #f9fbff);
  font-family: 'Libre Franklin';
  font-size: 16px;
  font-style: normal;
  font-weight: 500;
  line-height: 24px;
}

.footer-license-text a {
  text-decoration-line: underline;
  text-decoration-style: solid;
  -webkit-text-decoration-skip: ink;
  border-radius: 2px;
  text-decoration-skip-ink: auto;
  text-decoration-thickness: auto;
  text-underline-offset: 16%;
  text-underline-position: from-font;
  transition: opacity 0.3s ease;
}

.footer-license-text a:focus {
  outline: 2px solid var(--blue-100, #bcd8f6);
  outline-offset: 2px;
}

.footer-license-text a:hover {
  opacity: 0.8;
}

@media (max-width: 1024px) {
  .footer-inner {
    align-items: flex-start;
    gap: 60px;
    padding: 60px 40px 20px;
  }

  .footer-container {
    align-items: flex-start;
    flex-direction: column;
    gap: 2rem;
    width: 100%;
  }

  .footer-follow-section,
  .footer-links-section {
    width: 100%;
  }

  .follow-us-container {
    padding: 0;
    width: 100%;
  }

  .footer-form-section {
    width: 100%;
  }
}

@media (max-width: 640px) {
  .footer-inner {
    padding: 48px 24px 20px;
  }
}
</style>
