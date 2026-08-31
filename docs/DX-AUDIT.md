# Developer Experience (DX) Audit: `protocoltooling@0.1.0`

This document records friction points, awkward explanations, and ergonomic hurdles discovered while authoring the public developer documentation for `protocoltooling@0.1.0`.

---

## Friction Point 1: FullCalendar v6 vs v7 Ref Type Divergence

- **What is awkward:**
  FullCalendar React v6 exports `FullCalendar` as a class component (where `useRef<FullCalendar>(null)` works directly), whereas FullCalendar React v7 exports `FullCalendar` as a functional component with a dedicated `CalendarRef` type (requiring `import { type CalendarRef } from "@fullcalendar/react"` and `useRef<CalendarRef>(null)`). In documentation snippets, providing a single universal snippet requires either explaining the version difference or defaulting to v6 syntax with a troubleshooting note for v7.
- **Where it appears:**
  `docs/quickstart.mdx`, `docs/guides/existing-app.mdx`, `docs/troubleshooting.mdx`, `docs/reference/types.mdx`.
- **Classification:**
  Documentation & ecosystem friction.
- **Future API improvement suggestion:**
  Export a convenience ref helper or type alias (e.g. `ProtocolCalendarRef` or a custom `useCalendarRef()` hook) in a future minor release so developers do not need to think about which FullCalendar version type they are importing.

---

## Friction Point 2: Event `end: null` vs FullCalendar `end: undefined`

- **What is awkward:**
  `CalendarEvent.end` is typed as `string | null` in Protocol Tooling to explicitly represent the absence of an end time in JSON payloads and database models. However, FullCalendar's `EventInput` expects `string | undefined` in strict TypeScript environments. Passing `CalendarEvent[]` directly to FullCalendar's `events` prop in TypeScript can require `events.map(e => ({ ...e, end: e.end ?? undefined }))` if strict null checks are active.
- **Where it appears:**
  `docs/guides/existing-app.mdx`, `docs/troubleshooting.mdx`.
- **Classification:**
  Type impedance mismatch between JSON standards and FullCalendar prop types.
- **Future API improvement suggestion:**
  In a future release, type `end` as `string | null | undefined` in `CalendarEvent` (or provide a built-in `toFullCalendarEvents()` transform helper) to eliminate the mapping step.

---

## Friction Point 3: Explicit Offset ISO 8601 Requirement for AI Agents

- **What is awkward:**
  AI tools expect ISO 8601 timestamps with explicit offsets (e.g. `2026-09-02T10:00:00-06:00` or `Z`) to prevent timezone drift. Explaining why `calendar_get_context` should be called before interpreting relative dates ("tomorrow at 2pm") is essential for agent accuracy, but adds conceptual weight to the tool explanation.
- **Where it appears:**
  `docs/concepts/webmcp.mdx`, `docs/reference/types.mdx`.
- **Classification:**
  Documentation-only friction (AI runtime best practice).
- **Future API improvement suggestion:**
  None required in core API; the `calendar_get_context` tool already provides browser and FullCalendar timezone information cleanly.

---

## Friction Point 4: Delayed WebMCP Runtime Injection

- **What is awkward:**
  Because WebMCP browser extensions or polyfills may inject `window.document.modelContext` after initial React hydration, `useFullCalendarWebMCP` includes a 250 ms retry polling mechanism. While transparent to users, developers testing in environments without WebMCP wonder why no error is thrown immediately.
- **Where it appears:**
  `docs/troubleshooting.mdx`, `docs/reference/use-fullcalendar-webmcp.mdx`.
- **Classification:**
  Runtime environment lifecycle friction.
- **Future API improvement suggestion:**
  Consider exposing an optional status state (e.g. `isWebMCPAvailable`, `registrationStatus`) from an optional hook return value in a future version for developer debugging dashboards.
