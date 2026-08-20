# Process and decision-making

---

For this assignment, I leveraged generative AI (Claude) as an execution engine while I drove the technical constraints, architectural decisions, and QA. Drawing on my background in quality assurance and AI workflows, I refused generic 'looks similar' code generation. Instead, I established a strict verification method, utilizing DOM geometry hashing across breakpoints to ensure the new registration card was a pixel-perfect match to the existing InnovateUS design system.

I managed the build incrementally, component by component. This approach allowed me to enforce strict accessibility standards from the ground up, explicitly mandating screen-reader and keyboard optimization without altering visual constraints. I also caught and corrected UX oversights in real-time, such as ensuring the form properly scrolled to its confirmation message upon successful submission.

For the backend integration with Directus, security and edge-case handling were the priority. I ensured the API token was safely isolated server-side via Nuxt. To validate the code, I used adversarial prompting—effectively challenging the model to break its own submission endpoint. This rigorous testing surfaced a potential concurrency flaw where ECONNRESET network errors could create duplicate database rows, which we then corrected.

Ultimately, my process centered on defining clear technical boundaries, maintaining tight project scope, and aggressively testing the output to deliver a secure, accessible, and highly functional feature.

---

**Full documentation:** the ground rules asked for tooling, prompting, testing
and decisions to be documented. `PROCESS-FULL.txt` is the complete record —
chronological work log, decision register with alternatives and reasoning, all
14 bugs with what caught each, and what was deliberately not done. Everything
claimed in the paragraph above can be checked against it.

