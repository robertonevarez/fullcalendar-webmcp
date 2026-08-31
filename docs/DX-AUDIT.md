# Developer Experience (DX) Audit: `protocoltooling@0.1.0`

This document records friction points, awkward explanations, and ergonomic hurdles discovered while authoring the public developer documentation for the FullCalendar WebMCP release formerly published as `protocoltooling@0.1.0`.

## Package migration

Previous package: `protocoltooling`  
Current package: `@protocoltooling/fullcalendar`  
The old package is deprecated.

---

## Friction Point 1: FullCalendar v6 vs v7 Ref Type Divergence

- **What is awkward:**
  FullCalendar React v6 exports `FullCalendar` as a class component (where `useRef<FullCalendar>(null)` works directly), whereas FullCalendar React v7 exports `FullCalendar` as a functional component with a dedicated `CalendarRef` type (requiring `import { type CalendarRef } from "@fullcalendar/react"` and `useRef<CalendarRef>(null)`). In documentation snippets, providing a single universal snippet requires either explaining the version difference or defaulting to v6 syntax with a troubleshooting note for v7.
- **Where it appears:**
  `docs/integrations/fullcalendar/quickstart.mdx`, `docs/integrations/fullcalendar/guides/existing-app.mdx`, `docs/integrations/fullcalendar/troubleshooting.mdx`, `docs/integrations/fullcalendar/reference/types.mdx`.
- **Classification:**
  Documentation & ecosystem friction.
- **Future API improvement suggestion:**
  Export a convenience ref helper or type alias (e.g. `ProtocolCalendarRef` or a custom `useCalendarRef()` hook) in a future minor release so developers do not need to think about which FullCalendar version type they are importing.

---

## Friction Point 2: Event `end: null` vs FullCalendar `end: undefined`

- **What is awkward:**
  `CalendarEvent.end` is typed as `string | null` in Protocol Tooling to explicitly represent the absence of an end time in JSON payloads and database models. However, FullCalendar's `EventInput` expects `string | undefined` in strict TypeScript environments. Passing `CalendarEvent[]` directly to FullCalendar's `events` prop in TypeScript requires `events.map(e => ({ ...e, end: e.end ?? undefined }))` when strict null checks are active.
- **Where it appears:**
  `docs/integrations/fullcalendar/guides/existing-app.mdx`, `docs/integrations/fullcalendar/troubleshooting.mdx`.
- **Classification:**
  Type impedance mismatch between JSON standards and FullCalendar prop types.
- **Future API improvement suggestion:**
  In a future release, type `end` as `string | null | undefined` in `CalendarEvent` (or provide a built-in `toFullCalendarEvents()` transform helper) to eliminate the mapping step.

---

## Friction Point 3: Explicit Offset ISO 8601 Requirement for AI Agents

- **What is awkward:**
  AI tools expect ISO 8601 timestamps with explicit offsets (e.g. `2026-09-02T10:00:00-06:00` or `Z`) to prevent timezone drift. Explaining why `calendar_get_context` should be called before interpreting relative dates ("tomorrow at 2pm") is essential for agent accuracy, but adds conceptual weight to the tool explanation.
- **Where it appears:**
  `docs/integrations/fullcalendar/concepts/webmcp.mdx`, `docs/integrations/fullcalendar/reference/types.mdx`.
- **Classification:**
  Documentation-only friction (AI runtime best practice).
- **Future API improvement suggestion:**
  None required in core API; the `calendar_get_context` tool already provides browser and FullCalendar timezone information cleanly.

---

## Friction Point 4: Delayed WebMCP Runtime Injection

- **What is awkward:**
  Because WebMCP browser extensions or polyfills may inject `window.document.modelContext` after initial React hydration, `useFullCalendarWebMCP` includes a 250 ms retry polling mechanism. While transparent to users, developers testing in environments without WebMCP wonder why no error is thrown immediately.
- **Where it appears:**
  `docs/integrations/fullcalendar/troubleshooting.mdx`, `docs/integrations/fullcalendar/reference/use-fullcalendar-webmcp.mdx`.
- **Classification:**
  Runtime environment lifecycle friction.
- **Future API improvement suggestion:**
  Consider exposing an optional status state (e.g. `isWebMCPAvailable`, `registrationStatus`) from an optional hook return value in a future version for developer debugging dashboards.

---

## Friction Point 5: Organization vs Integration Identity

- **Problem:**
  The initial documentation treated Protocol Tooling as the name of the FullCalendar WebMCP integration.
- **Why this matters:**
  It creates ambiguity between:
  1. Organization / Publisher (`Protocol Tooling`)
  2. Integration / Product (`FullCalendar WebMCP`)
  3. npm Distribution Package (`@protocoltooling/fullcalendar@0.1.0`; previously `protocoltooling@0.1.0`)
  and would make future integrations difficult to document consistently.
- **Resolution:**
  Adopted the clear two-tier model:
  ```text
  Protocol Tooling (Organization)
  └── FullCalendar WebMCP (Integration)
  ```
  with the integration published as `@protocoltooling/fullcalendar@0.1.0` (previously `protocoltooling@0.1.0`, now deprecated). This is a documentation taxonomy fix that does not require changing the current public API.

---

## Friction Point 6: Organization Shell vs Integration Docs Shell

- **Problem:**
  The initial reorganization moved FullCalendar content under `/integrations/fullcalendar`, but the root Protocol Tooling page still inherited the FullCalendar documentation navigation and visual context.
- **Effect:**
  The organization homepage still felt like the FullCalendar product documentation.
- **Resolution:**
  Separated the site using Blume's native capabilities:
  - **Organization Homepage (`/`):** Implemented via `pages/index.astro` using Blume's built-in `PageLayout`. It renders a clean organization introduction and integration directory with zero documentation sidebars or FullCalendar tree leakage.
  - **FullCalendar WebMCP Documentation (`/integrations/fullcalendar`):** Scoped via `navigation.tabs` in `blume.config.ts`. Navigating to the integration activates the dedicated FullCalendar WebMCP sidebar and documentation shell.
- **Search Limitation Note:**
  Blume's default Orama search indexes all built pages globally. Section-level search scoping is not a built-in toggle in Blume v1.5.3's client Orama search; global search is retained across the shared domain without custom forks.
