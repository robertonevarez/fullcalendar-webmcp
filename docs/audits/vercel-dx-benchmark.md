# Vercel DX Benchmark — FullCalendar WebMCP

**Status:** Internal audit artifact (excluded from Blume publish via `**/audits/**`).  
**Date:** 2026-08-31  
**Package baseline:** `@protocoltooling/fullcalendar@0.2.0`  
**Purpose:** Derive testable DX principles from live Vercel documentation, then apply them to Protocol Tooling consumer docs without imitating Vercel’s visual identity.

---

## Official Vercel pages inspected

| Area | URL |
|---|---|
| Docs landing / navigation | https://vercel.com/docs |
| Getting started / first deploy | https://vercel.com/docs/getting-started-with-vercel |
| AI SDK product overview | https://vercel.com/docs/ai-sdk |
| AI Gateway + AI SDK quickstart | https://vercel.com/docs/ai-gateway/sdks-and-apis/ai-sdk |
| AI SDK framework quickstart | https://sdk.vercel.ai/docs/getting-started/nextjs-app-router |
| Framework integration | https://vercel.com/docs/frameworks/nextjs |
| Error / troubleshooting hub | https://vercel.com/docs/errors |
| Academy task-oriented lesson | https://vercel.com/academy/nextjs-foundations/project-setup |
| Academy AI SDK setup | https://vercel.com/academy/ai-sdk/ai-sdk-dev-setup |
| Agent-oriented docs | https://vercel.com/docs/agent-resources |
| Agent discovery patterns (linked from agent-resources) | Markdown endpoints, `llms.txt`, `llms-full.txt`, `sitemap.md`, page “Copy markdown” |

---

## Derived DX principles (testable)

### 1. First executable command before architecture

**Observed Vercel pattern:** Getting Started opens with a one-line outcome, then install/login/deploy commands before conceptual explanation. AI SDK pages put `npm install` and a 5-line `generateText` example above streaming/tools/reasoning.

**Why it works:** Developers convert interest into muscle memory before they need a mental model.

**Protocol Tooling implication:** Quickstart must show `npm install @protocoltooling/fullcalendar` and the repository + hook shape before explaining WebMCP, persistence theory, or metadata.

---

### 2. One-sentence outcome at the top of every action page

**Observed Vercel pattern:** Academy lessons open with **Outcome** / “You will…”; AI SDK quickstarts state what you will build in one sentence.

**Why it works:** Readers can self-select in seconds.

**Protocol Tooling implication:** Overview and Quickstart lead with a single outcome sentence, not publisher identity or architecture history.

---

### 3. Progressive disclosure: optional concepts stay optional

**Observed Vercel pattern:** AI SDK Getting Started says Prompt Engineering / HTTP Streaming “can optionally” be read first. Advanced topics (reasoning, images, version quirks) come after a working baseline.

**Why it works:** Complexity arrives only when relevant.

**Protocol Tooling implication:** Metadata, AbortSignal, Strict Mode lifecycle, and domain mapping leave the Quickstart. Link them from Next steps / Guides / Concepts.

---

### 4. Strong defaults reduce decisions before first success

**Observed Vercel pattern:** Default model string routing, default env var names (`AI_GATEWAY_API_KEY`), framework auto-detection on `vercel`, Fast Track sections that pick one path.

**Why it works:** Decision fatigue is the enemy of time-to-first-success.

**Protocol Tooling implication:** Document one golden path (existing React FullCalendar + host repository). Defer Next.js/Pages/Vite variations to Guides. Do not force metadata, `onRegistrationError`, or AbortSignal in the minimal example.

---

### 5. Every quickstart ends with an observable success condition

**Observed Vercel pattern:** Academy **Done-When** checklists; “Verify in Browser”; “Making Sure It Works!”; migration docs that say confirm requests appear in the dashboard.

**Why it works:** Invisible success is indistinguishable from failure—especially for registration-based systems.

**Protocol Tooling implication:** Quickstart Verify must be deterministic: tools discoverable → list events → mutate → UI updates → hard reload retains change.

---

### 6. Headings describe developer goals, not internal systems

**Observed Vercel pattern:** “Install the Vercel CLI”, “Deploy your project”, “Configure your AI Gateway API key”, symptom-style troubleshooting headings.

**Why it works:** Skimmers navigate by intent.

**Protocol Tooling implication:** Prefer “Add your event repository” over “Implement CalendarEventRepository adapter”; troubleshooting titles must be symptoms (“Agent cannot see calendar tools”).

---

### 7. Examples are minimal, realistic, and executable

**Observed Vercel pattern:** Short install + short code that runs; imports shown; recommended architecture demonstrated (not just type signatures). Academy Fast Track is copyable.

**Why it works:** Copy/paste is the primary learning path.

**Protocol Tooling implication:** One canonical example that shows `events: repository` and `onEventsChanged: refresh` clearly. Every snippet must compile in a clean consumer. Abstract `api.*` stubs are OK if the shape is complete; incomplete variables are defects.

---

### 8. Information hierarchy separates Overview / Get started / Guides / Concepts / Reference / Troubleshooting

**Observed Vercel pattern:** Product landing answers what/why; Getting Started answers how fast; Guides are task-shaped; Reference is exhaustive; Errors/Troubleshooting are symptom-indexed.

**Why it works:** Readers know where to look; duplication is controlled.

**Protocol Tooling implication:** Preserve Blume hierarchy. Overview = value + fit + pointer to Quickstart. Quickstart = only first success. Concepts = why. Guides = specific tasks. Reference = exact API. Troubleshooting = symptoms.

---

### 9. Language is imperative and short; caveats are local, not defensive essays

**Observed Vercel pattern:** Short imperative steps; notes appear next to the step they affect; jargon is introduced once with a purpose.

**Why it works:** Feels like a co-pilot, not an RFC.

**Protocol Tooling implication:** Replace “repository-authoritative architectural boundary ensures…” with “Connect your existing event persistence.” Keep deeper reasoning in Concepts.

---

### 10. Troubleshooting is symptom → cause → fix (→ verify)

**Observed Vercel pattern:** Academy troubleshooting blocks paste the error, then Fix; platform Errors hub is symptom/error-code oriented.

**Why it works:** Developers arrive with a symptom, not an architecture question.

**Protocol Tooling implication:** Expand Troubleshooting around observable failures; add Verify where useful; remove architecture-titled sections.

---

### 11. Agent readability is additive, not a reason to degrade human docs

**Observed Vercel pattern:** `llms.txt`, markdown page variants, Copy markdown, agent cross-link maps—alongside human UX. Blume already enables `ai.llmsTxt` and `ai.webmcp` for Protocol Tooling.

**Why it works:** Agents get machine-friendly indexes without forcing humans to read dumps.

**Protocol Tooling implication:** Keep Blume AI features on. Prefer concise canonical examples and stable headings (already agent-friendly). Do not add new agent infrastructure before submission solely because Vercel has more endpoints; document as a later recommendation if needed.

---

### 12. Reference stays exhaustive so Quickstart can stay thin

**Observed Vercel pattern:** Quickstarts stay short; full options live in reference/docs corpus.

**Why it works:** Progressive disclosure without losing completeness.

**Protocol Tooling implication:** Do not shrink Reference. Move ceremony out of Quickstart into Reference/Guides instead of deleting detail.

---

## API ergonomics audit (docs-only for 0.2.0 freeze)

| Question | Finding | Severity | Migration | Docs alone? |
|---|---|---|---|---|
| Is `events` the clearest option name for a repository? | Mildly confusing next to FullCalendar’s `events` prop (array). Name means “event operations,” not “event array.” | P2 DX | Renaming to `repository` would be a breaking change | **Yes for now** — Quickstart labels it clearly as the persistence object |
| Does `onEventsChanged` communicate timing? | Yes if docs say “after agent create/update/delete.” | P3 | — | Yes |
| Are names obvious? | `useFullCalendarWebMCP` and `CalendarEventRepository` are discoverable | P3 | — | Yes |
| Metadata ceremony? | Optional field; no ceremony required | — | — | Keep examples tiny |
| AbortSignal invisible unless needed? | Correct default | — | — | Keep out of Quickstart |
| Forced implementation details? | `end: null` → `undefined` map for FullCalendar props is friction | P2 | Helper in a future minor | Document in Troubleshooting; do not change API in this pass |
| FC6 vs FC7 plugin imports in examples? | `@fullcalendar/daygrid` fails on FC7; FC7 uses `@fullcalendar/react/daygrid` | P0 docs | — | **Fixed** — Quickstart defaults to v7; Troubleshooting documents v6 |

**Decision:** No public API changes in this DX pass. Prefer documentation clarifications over churn against frozen `0.2.0`.

---

## Journey friction inventory (pre-change)

| Step | Friction |
|---|---|
| Landing → FullCalendar | OK via org page link |
| Understand value | Overview repeats publisher identity; install appears but Quickstart is not the first CTA emphasis enough |
| Install | Clear |
| Integrate | Quickstart introduces repository + hook + full memory demo before verification; heavy |
| Connect persistence | Good conceptually; buried under architecture language elsewhere |
| Verify WebMCP | Vague (“open in WebMCP environment”); no Done-When |
| Tools | Six tools listed mid-quickstart before success |
| Metadata | Correctly optional, but section title “Agent-visible metadata projection” sounds like an RFC |
| Troubleshoot | Partially symptom-oriented; missing several common symptoms |

### Concept count before first success (pre-change)

Roughly **9+**: Protocol Tooling, FullCalendar WebMCP, WebMCP, `CalendarEventRepository`, `CalendarEvent`, `calendarRef`, `events` (repository), `onEventsChanged`, six tool names, `end` null mapping.

**Target:** ≤5 named concepts before Verify: install package, repository methods, `calendarRef`, hook options (`events` + `onEventsChanged`), WebMCP-capable browser (verify only).


---

## DX scorecard (this pass)

| Dimension | Current (pre-pass) | Final |
|---|---:|---:|
| Value proposition clarity | 3 | 5 |
| Time to first command | 3 | 5 |
| Time to first working integration | 2 | 4 |
| Copy/paste reliability | 2 | 5 |
| Concept count before success | 2 | 5 |
| API discoverability | 4 | 4 |
| Progressive disclosure | 2 | 5 |
| Language simplicity | 2 | 5 |
| Verification clarity | 2 | 5 |
| Troubleshooting quality | 3 | 5 |
| Reference completeness | 5 | 5 |
| Agent readability | 4 | 4 |

**Concept budget:** ~9+ concepts before success → **4–5** (install, repository methods, `calendarRef`, hook options, WebMCP browser at verify).

**Remaining weaknesses:** `events` option name still overloaded with FullCalendar’s events array (docs clarify; API frozen). WebMCP verification still depends on an external capable browser/runtime (no in-package status UI). FC6/FC7 dual import paths remain ecosystem friction. Agent discovery already includes Blume `llms.txt` / markdown pages; no extra Vercel-style graph endpoints added.

**Recommendation:** **ready to freeze** for challenge submission (docs/DX only; no runtime churn).
