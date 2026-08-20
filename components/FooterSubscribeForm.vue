<script setup lang="ts">
/**
 * Footer "Subscribe for Updates" form. Mirrors the original's own component
 * (data-v-702cb38a), including its private copy of .sr-only - the page's
 * .sr-only is scoped to the page component and does not reach the footer.
 *
 * Not wired to a backend. The original posts to its own mailing-list flow; the
 * newsletter opt-in on the registration form is the one that talks to Directus.
 */

const email = ref('')
</script>

<template>
  <div class="footer-form-container">
    <!--
      .footer-form__title is font-size:0 so the whitespace between the two spans
      collapses to nothing; each span sets its own 25px size. The gap you see
      comes from .title-subscribe's margin-right.
    -->
    <h6 class="footer-form__title"><span class="title-subscribe">Subscribe</span><span class="title-for-updates">for Updates</span></h6>
    <form class="footer-form" @submit.prevent>
      <label for="footer-email" class="sr-only">Email address</label>
      <input
        id="footer-email"
        v-model="email"
        type="email"
        class="footer-form__input"
        placeholder="Your Email"
        aria-label="Email address for newsletter subscription"
        required
      />
      <button type="submit" class="footer-subscribe-btn">
        <span class="footer-subscribe-btn__text">SUBSCRIBE</span>
      </button>
    </form>
  </div>
</template>

<style scoped>
.footer-form-container {
  align-items: flex-start;
  align-self: stretch;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.footer-form__title {
  font-size: 0;
  line-height: 1.3;
  margin: 0;
}

.title-subscribe {
  color: var(--blue-100, #bcd8f6);
  font-style: italic;
  margin-right: 0.5rem;
}

.title-for-updates,
.title-subscribe {
  font-family: 'DM Serif Text';
  font-size: 25px;
  font-weight: 400;
  line-height: 30px;
}

.title-for-updates {
  color: var(--white, #f9fbff);
  font-style: normal;
}

.sr-only {
  height: 1px;
  margin: -1px;
  overflow: hidden;
  padding: 0;
  position: absolute;
  width: 1px;
  clip: rect(0, 0, 0, 0);
  border-width: 0;
  white-space: nowrap;
}

.footer-form {
  align-items: center;
  display: flex;
  gap: 1rem;
  width: 100%;
}

.footer-form__input {
  align-items: center;
  background: var(--light-blue, #e6efff);
  border: 1px solid var(--blue-200, #8db6e9);
  border-radius: 5px;
  color: #1a3a52;
  display: flex;
  flex: 1 0 0;
  font-family: inherit;
  font-size: 1rem;
  gap: 10px;
  padding: 10px 20px;
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
}

.footer-form__input::placeholder {
  color: rgba(26, 58, 82, 0.8);
}

.footer-form__input:focus {
  border-color: var(--blue-100, #bcd8f6);
  box-shadow: 0 0 0 3px rgba(188, 216, 246, 0.3);
  outline: none;
}

.footer-subscribe-btn {
  align-items: center;
  background: transparent;
  border: 1.5px solid var(--blue-100, #bcd8f6);
  border-radius: 100px;
  cursor: pointer;
  display: flex;
  font-family: inherit;
  gap: 12px;
  padding: 15px 30px;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.footer-subscribe-btn:hover {
  background: var(--blue-100, #bcd8f6);
}

.footer-subscribe-btn:focus {
  outline: 2px solid var(--blue-100, #bcd8f6);
  outline-offset: 2px;
}

.footer-subscribe-btn__text {
  color: var(--blue-100, #bcd8f6);
  font-family: 'Libre Franklin';
  font-size: 14px;
  font-style: normal;
  font-weight: 600;
  letter-spacing: 1.4px;
  line-height: 22px;
  text-transform: uppercase;
  transition: color 0.3s ease;
}

.footer-subscribe-btn:hover .footer-subscribe-btn__text {
  color: #fff;
}

@media (max-width: 1024px) {
  .footer-form-container {
    align-items: flex-start;
    padding-top: 1rem;
  }

  .footer-form {
    flex-direction: column;
    gap: 1rem;
    width: 100%;
  }

  .footer-form__input {
    width: 100%;
  }

  .footer-subscribe-btn {
    justify-content: center;
    width: 100%;
  }
}
</style>
