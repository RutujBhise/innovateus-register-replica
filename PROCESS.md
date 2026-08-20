# Process and decision-making

*(The paragraph below is the ≤300-word submission text.)*

---

I used Claude Code (Opus 5) as an agent with filesystem and browser access
rather than as a snippet generator, because the hard parts here were discovery
and verification, not typing. Prompting was schema-first: I had it inspect the
`cw_intake` collection before any mapping code existed, so field names were
discovered rather than guessed — that revealed `workshops` holds Zoom event ids
running parallel to `workshop_series`, a convention I would otherwise have
missed. For design fidelity I refused "make it look similar" and instead had it
measure the live page and mine at identical viewports and compare SHA-256 hashes
of the geometry; that caught three defects I would have shipped, including a
global `select { height: 50px }` rule whose absence shifted every field below it
by 1.2px. Finally I prompted adversarially against my own finished endpoint —
"how could this create two rows?" — which surfaced a real bug: the retry treated
every fetch rejection as safe, but `ECONNRESET` can occur *after* Directus
commits, so retrying would have duplicated the row. It now retries only on codes
that prove nothing was sent. Testing is 130 unit tests over the pure modules,
plus a local `node:http` server standing in for Directus so every error branch
and the exact outbound request body are asserted without writing to a collection
shared with other candidates; three read-only probes against the real instance
confirmed create permission (an empty POST returns 400, not 403, and names the
required fields). Key decisions: submissions route through a Nuxt server
endpoint so the access token never reaches the browser; `consent_at` is stamped
from the server clock; closed-set answers are re-validated server-side against
the form's own option lists; and the in-memory duplicate guard's per-instance
limitation is documented rather than hidden.

---

*Word count: 287, against a 300-word limit.*

**Full documentation:** the ground rules asked for tooling, prompting, testing
and decisions to be documented. `PROCESS-FULL.txt` is the complete record —
chronological work log, decision register with alternatives and reasoning, all
14 bugs with what caught each, and what was deliberately not done. Everything
claimed in the paragraph above can be checked against it.

## Notes not included in the 300 words

**Why made-up-email test runs did not go to Directus.** The brief asks for
testing with `name+1@example.org` addresses. Those runs were executed against the
local Directus stand-in rather than the shared collection, so no throwaway rows
were written — the captured request bodies are asserted in
`tests/directusClient.test.ts`. The collection is visibly shared with other
candidates, and a single clean row reads better than a trail of test data. One
real submission carrying my own name was made at the end.

**What the AI got wrong, and how it was caught.** Two failures are worth naming
because they show what the verification was for:

1. A static audit of the code declared a shadowed `ref` variable "harmless".
   It was fatal — Nuxt's auto-import scanner skips injecting `import { ref }`
   if the module declares that identifier anywhere, even block-scoped, so the
   whole page returned `500: ref is not defined`. Only running it caught this.
2. The first retry implementation was reasoned about confidently and was still
   wrong, for the `ECONNRESET` reason above. Adversarial prompting against
   finished work found it; writing more tests against the original assumption
   would not have.

**Tooling boundaries.** `@nuxt/test-utils` was deliberately not added. It would
have given a true end-to-end test of the route handler, but at the cost of
Playwright, happy-dom, a peer-version negotiation and a full Nuxt build on every
test run. Extracting the transport and the error mapping into Nitro-free modules
achieved the same coverage in a fraction of the setup, and the untested remainder
is thin plumbing.
