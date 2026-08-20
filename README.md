# InnovateUS registration page — replica with newsletter opt-in

A functional replica of [innovate-us.org/register](https://innovate-us.org/register),
plus one field the original does not have: a **weekly-newsletter opt-in**.
Submitting the form writes a row to the Directus `cw_intake` collection, with the
consent timestamp stamped server-side.

**Live prototype:** <https://innovateus-register-replica.netlify.app/register>

**Repository:** <https://github.com/RutujBhise/innovateus-register-replica>

---

## Run it locally without any credentials

This is the quickest way to see the whole submit path work. A local stand-in for
the Directus API replaces the real one, so no token is needed and nothing is
written to the shared collection.

```bash
nvm use          # Node 22
npm ci
npm run stub     # terminal 1 — fake Directus on :4111, prints every payload
npm run dev:stub # terminal 2 — app on :3200, loads .env.stub instead of .env
```

Then open <http://localhost:3200/register> and submit. The stub prints the exact
row that would have been written and flags any required field left empty.

Force each failure branch to see the visitor-facing message for it:

```bash
npm run stub -- --fail=401      # bad credentials  -> generic 502
npm run stub -- --fail=403      # no permission    -> generic 502
npm run stub -- --fail=400      # schema mismatch  -> generic 502
npm run stub -- --fail=unique   # already on file  -> treated as success
npm run stub -- --fail=429      # rate limited     -> 503, "try again"
npm run stub -- --fail=timeout  # never responds   -> 5s, then 503
npm run stub -- --fail=reset    # socket dies      -> no retry (see below)
```

## Run it against the real Directus

```bash
cp .env.example .env     # then paste the access token into NUXT_DIRECTUS_TOKEN
npm run verify           # confirms the token may CREATE — writes nothing
npm run dev
```

`npm run verify` POSTs an empty object. Directus checks auth and permissions
*before* validating the payload, so the status is diagnostic and no row can be
created (every required field is absent):

- `403` → the token cannot create; the real submission would fail
- `400 FAILED_VALIDATION` → permission confirmed, and the response names the
  required fields, which the script diffs against the payload we send

## Other commands

```bash
npm test        # 130 unit tests
npm run typecheck
npm run inspect # prints the cw_intake schema (no secrets)
npm run build
```

---

## Architecture

```
pages/register.vue  ──POST /api/intake──▶  server/api/intake.post.ts  ──▶  Directus cw_intake
```

The page never talks to Directus directly. That hop exists for three reasons:

1. **The access token must never reach the browser.** It is read from
   `runtimeConfig`, which Nuxt keeps server-only — it is not in the client
   bundle.
2. **Validation the client cannot bypass.** Anyone can POST to the endpoint, and
   it writes to a shared collection, so the server re-checks everything the form
   checks — including verifying closed-set answers against the form's own option
   lists.
3. **`consent_at` is stamped from the server clock.** A client-supplied
   timestamp on a consent record is worthless.

The handler itself is deliberately thin. Everything worth testing lives in
modules with no Nitro dependency, because `useRuntimeConfig` only exists inside a
Nitro build and cannot be imported by a unit test:

| Module | Responsibility |
| --- | --- |
| `utils/intakePayload.ts` | form state → `cw_intake` row |
| `server/utils/validateIntake.ts` | server-side validation |
| `server/utils/submissionGuards.ts` | rate limit + duplicate fingerprint |
| `server/utils/directusClient.ts` | HTTP transport, timeout, retry decision |
| `server/utils/intakeResponse.ts` | upstream failure → visitor-safe message |

### Field mapping

`workshop_series` and `workshops` are parallel `; `-joined lists — series titles
and their Zoom event ids, in the same order. That convention was read off the
existing rows in the collection rather than invented.

`country` follows the original's own logic: choosing "Outside the United States"
and then naming a country submits that typed value, not the option label.

## Testing

`npm test` — **130 tests across 5 files**, all pure modules, no browser needed.

The interesting part is how the write path was verified **without writing to a
shared collection**, since that collection holds other people's submissions:

- A local `node:http` server stands in for Directus. Real sockets, real status
  codes — a mocked `fetch` cannot reproduce a refused connection or a destroyed
  socket, which is exactly what the retry logic turns on.
- One test asserts the **complete outbound request** — method, path, auth header
  and every field of the body. That assertion is the substitute for writing a
  real row.
- The retry classifier is table-tested over the error codes that mean "nothing
  was sent" versus "bytes may already have landed".
- `mapWriteFailure` is asserted to never leak upstream detail: the test feeds it
  a message containing credentials, a collection name and a schema hint, and
  checks none of it appears in the response.

## Known limitations

- **The rate limit and duplicate suppressor are per-instance**, held in module
  memory. On a serverless host each instance keeps its own counters, so neither
  is a hard guarantee. They are here because they cheaply remove the failure that
  actually happens — an impatient double-click, which lands on the same warm
  instance. The correct production fix is a unique index on `email` in Directus,
  which is a constraint at the data layer and not something I control on a
  shared collection.
- **An ambiguous timeout can still permit a duplicate.** If Directus commits the
  row but the response never arrives, the visitor is told to try again and the
  fingerprint was not recorded. Recording it would be worse — it would report
  success to someone who is not registered. With read access available, the
  honest fix is to query by email before advising a retry.
- **No CAPTCHA.** The original's Cloudflare Turnstile mount point is reproduced
  in the DOM but the script is not loaded; it needs their site key. A honeypot
  field is enforced server-side instead.
- **Zoom registration itself is not implemented.** The brief asked for the
  submission to be stored in Directus, which is what this does.

## Design fidelity

Verified by measuring the live page and this one at identical viewports and
comparing SHA-256 hashes of the geometry — every box, offset and computed style
for the header, the registration card, the series list, the action row and the
footer. All match at 1280px, and the footer also matches at the 1024px and 640px
breakpoints.

Deliberate differences, all of them either accessibility fixes or performance,
none of them visual:

| Change | Why |
| --- | --- |
| Question `id`s sanitised | The original interpolates the question text into the `id` (`id="question-Do you work for…"`). Whitespace is invalid in an `id`, so its `<label for>` never resolves and the selects are announced as unlabelled comboboxes. |
| `alt=""` on series row icons | The original repeats the series title in `alt` while the same title sits beside it, so every row is announced twice. |
| `aria-live` on the series counter | Ticking a checkbox changes the count; without it a screen-reader user gets no feedback. |
| `aria-expanded` / `aria-controls` / Escape on nav dropdowns | The original's triggers are bare `<div tabindex="0">` with no state exposed and no Escape handling. |
| `role="button"` removed from the mailing-list link | It is an `<a href>` that navigates; the role made screen readers announce "button" for something that does not behave like one. |
| Newsletter hint uses `#4a5568` | The site's `.question-hint` colour measures 2.42:1 against this card — a WCAG AA failure. `#4a5568` is also one of the site's own text colours and clears AA at 7.18:1. |
| Fonts requested once, preconnected | The original chains three `@import` rules inside a `<style>` block, which serialises the requests and blocks render. Same families, same weights. Inria Sans and Inter are dropped — the original requests them but no rule uses either. |
| Series icons served locally | Byte-identical to the CDN's `?width=50` responses (verified by md5), so this is visually identical while removing 14 third-party requests. |

## Attribution and licence

The stylesheets in `assets/css/` and the images in `public/images/` are
**reproduced from innovate-us.org** for the sole purpose of this take-home
exercise, because "conform to the existing InnovateUS designs" was the
requirement. They remain
**© InnovateUS / The Burnes Center for Social Change** and are not licensed for
reuse by me or anyone else.

The application code — `pages/`, `components/` (except the reproduced markup),
`server/`, `utils/`, `tests/`, `scripts/` — is original work.

There is deliberately **no `LICENSE` file**: adding one would purport to grant
rights over content I do not own. The deployed prototype sends
`noindex, nofollow` and ships a disallow-all `robots.txt` so it cannot appear in
search results beside the real page.

## Operational note

Rotate the Directus access token after this exercise is assessed. Any token that
has been on a development machine and in a deployment config has had enough
exposure to be worth retiring.
