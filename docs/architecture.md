# Phase 0 architecture: FullCalendar through WebMCP

## Decision

Use one React hook:

```ts
useFullCalendarWebMCP({ calendarRef, events, onEventsChanged })
```

The hook registers six generic tools: `calendar_get_context`, `calendar_list_events`, `calendar_get_event`, `calendar_create_event`, `calendar_update_event`, and `calendar_delete_event`.

The important seam is `events`, a host-provided CRUD repository. The adapter does not treat `calendar.addEvent()` as persistence and does not maintain a second event ledger.

```text
Agent -> WebMCP tools -> host event repository -> existing persistence
                                      |
                                      v
                              existing UI refresh

Human -> FullCalendar callback -> same host event repository -> same refresh
```

Only `calendar_get_context` reads FullCalendar's Calendar API, for the active view and visible range. Event reads and mutations use the durable host seam.

## Why a hook

The hook is the smallest React-idiomatic lifecycle boundary. Its effect owns registration and abort-driven cleanup; refs keep tool handlers pointed at current host callbacks without re-registering tools after every render.

Rejected alternatives:

- **FullCalendar plugin:** idiomatic for rendering and calendar behavior, but WebMCP registration is a document/React lifecycle concern. It also encourages accidental coupling to FullCalendar's in-memory event store.
- **Wrapper component:** adds a new component boundary and prop forwarding while hiding the persistence contract.
- **Provider:** useful only if several descendant components share agent state; this proof has no such state.
- **Imperative adapter as the primary React API:** viable for non-React hosts, but forces every React consumer to reproduce setup, cleanup, and latest-callback handling. It can be added later without changing the repository contract.
- **Declarative WebMCP forms:** CRUD and range queries are application actions, not existing form submissions; the imperative API is the correct current surface.

## Persistence and identity

The host repository owns persistence and assigns IDs on create. Every later get, update, and delete uses that stable ID. The demo repository uses a versioned `localStorage` key and `crypto.randomUUID()`, which is lightweight proof—not a proposed production database. Reconstructing the repository or reloading the page reads the same records.

The demo may fall back to seed data in memory when storage cannot be read, but mutations never degrade to memory: a failed durable write rejects the repository call and therefore rejects the WebMCP tool call without claiming success.

Agent and human mutations converge before the UI: both call `LocalCalendarEventRepository`, then reload controlled FullCalendar events. A failed human drag/resize calls FullCalendar's `revert()` callback.

## WebMCP lifecycle

- Registration uses the current `document.modelContext.registerTool()` API.
- One `AbortController` owns the whole six-tool registration. Aborting it unregisters the tools; there is no `unregisterTool()` call in the current standard.
- React unmount and Strict Mode effect replay abort that controller. Tests assert exactly one final tool set and complete cleanup.
- If `document.modelContext` is unavailable at mount, a 250 ms poll waits for delayed runtime injection and stops on unmount.
- Duplicate names reject registration with `InvalidStateError`. Partial registrations made by this hook are aborted, the pre-existing tool is preserved, and `onRegistrationError` is called when supplied.
- Each tool execution forwards WebMCP's per-call `AbortSignal` into host repository actions. A backend implementation can pass it directly to `fetch`.
- Tool outputs contain event titles and are marked `untrustedContentHint`; read tools also use `readOnlyHint`.

## Timezone assumptions

The demo displays FullCalendar in `local` time. `calendar_get_context` returns UTC `now`, the resolved IANA browser timezone, FullCalendar's configured timezone, and the visible range. Tool descriptions require explicit-offset ISO 8601 values. The repository normalizes timed events to UTC instants. Recurrence, floating times, and timezone migration are out of scope.

## Actual integration cost

There are two separate costs. The hook wiring below is measured only after the host has an `events` object implementing `CalendarEventRepository`:

| Item | Cost |
| --- | ---: |
| Imports added | 1 |
| Integration statements | 3 |
| FullCalendar config changes | 1 (`ref`) |
| New host callbacks | 0 |
| Existing callbacks supplied | 1 (`reloadEvents`) |
| Persistence changes | 0 |
| Runtime dependencies added for adapter | 1 (`webmcp-types`, types only) |
| Framework assumptions | React 17–19 and FullCalendar React 7 |

The hook wiring is four executable lines including the import. The repository interface has five operations because durable CRUD cannot be inferred safely from FullCalendar's transient API.

The persistence adapter is additional and must be measured separately:

| Host persistence shape | Adapter cost |
| --- | ---: |
| Existing object already implements the five operations | 0 glue lines |
| Separate API methods mapped directly to the interface | 7 executable lines in the README example |
| Phase 0 `localStorage` repository | 163 physical source lines before tests |

The demo repository count includes storage durability, validation, stable ID creation, UTC normalization, and range filtering; it is not hook integration. A second integration into an independently structured FullCalendar application is required before treating the repository contract as the final public API.

## Known limitations

- One default calendar tool namespace exists per document; multiple calendars need an explicit namespace design.
- No recurrence, resources, attendees, availability, or scheduling intelligence.
- The demo's `localStorage` is single-browser and synchronous. Production hosts should provide their existing API repository.
- Cancellation can stop an in-flight host request, but any remote mutation accepted immediately before cancellation can still have an indeterminate client response.
- The runtime-availability poll is a compatibility measure because the current standard defines no late-injection readiness event.
- Automated tests prove the WebMCP contract with a standards-shaped runtime double. Final ChatGPT in-app browser discovery still requires a supported account/model and a served secure page.

## Sources read on 2026-08-30

- [WebMCP specification and explainer](https://github.com/webmachinelearning/webmcp)
- [Chrome WebMCP imperative API](https://developer.chrome.com/docs/ai/webmcp/imperative-api)
- [OpenAI WebMCP Challenge](https://openai.com/webmcp-challenge/)
- [OpenAI: using site tools in the ChatGPT desktop app](https://help.openai.com/en/articles/20001423-using-site-tools-in-the-chatgpt-desktop-app)
- [FullCalendar documentation](https://fullcalendar.io/docs)
- [FullCalendar React integration](https://fullcalendar.io/docs/react)
- [FullCalendar Event Object](https://fullcalendar.io/docs/event-object)
- [FullCalendar event sources](https://fullcalendar.io/docs/event-source)
- [FullCalendar event model and lifecycle callbacks](https://fullcalendar.io/docs/event-model)

---

# Phase 1: React Framework & Persistence Portability Validation

## Independent Target

- **Application:** Next.js enterprise driving school booking platform (`registerdriver`).
- **React Framework:** Next.js 16+ App Router with React 19 (`^19.2.8`) and Server Actions (`next-safe-action`).
- **FullCalendar Configuration:** FullCalendar React v6 (`@fullcalendar/react` `^6.1.17`, `@fullcalendar/daygrid`, `@fullcalendar/timegrid`, `@fullcalendar/interaction`).
- **Persistence Architecture:** Asynchronous Supabase / PostgreSQL database backend with server actions (`createSessionAction`, `updateSessionAction`, `deleteSessionAction`).
- **State-Management & Event Loading:** Realtime Postgres subscription (`supabase.channel`), optimistic state updates, explicit revalidation (`refetchSessions`), and custom modal CRUD workflows.

## Validation Findings

1. **Framework Portability (Next.js vs Vite vs Remix vs React Router vs TanStack Start):**
   - **SSR Safety:** `useFullCalendarWebMCP` isolates all browser globals (`document.modelContext`, `window`) inside `useEffect`. Server rendering (`renderToString`) completes without throwing or attempting browser global access.
   - **FullCalendar React Version Neutrality:** In Phase 0, `calendarRef` was typed against FullCalendar v7's `CalendarRef`. In FullCalendar v6 (widely used in production apps), refs are typed as `FullCalendar` class instances. Introducing the structural `FullCalendarHandle` interface (`{ getApi(): { getOption(name: string): unknown; view: { type: string; activeStart: Date; activeEnd: Date; }; }; }`) enables seamless type compatibility across both v6 and v7 without version pinning.
   - **Strict Mode & Cleanup:** AbortController-driven lifecycle registration cleans up cleanly on unmount and effect replay with zero orphaned tool registrations.

2. **Persistence Agnosticism:**
   - The five-operation `CalendarEventRepository` contract (`list`, `get`, `create`, `update`, `delete`) maps directly onto remote asynchronous server actions and databases.
   - When remote persistence fails (e.g. database timeout or constraint violation), the WebMCP tool execution rejects cleanly, and `onEventsChanged` is skipped, preventing UI drift.
   - `AbortSignal` cancellation from WebMCP propagates through the repository methods directly into async server requests.

3. **State Management Neutrality:**
   - Updating `onEventsChanged` to return `unknown | Promise<unknown>` allows host callbacks returning data (e.g. SWR `mutate()`, React Query `refetch()`, or async handlers returning refreshed records) to be passed directly without wrapper friction.

4. **Shared-State Model:**
   - 15-step end-to-end automated verification proves that human UI interactions (e.g. modal editing) and agent WebMCP interactions converge on the single authoritative backend database.
   - Protocol Tooling maintains no secondary ledger.

## Integration Measurements

| Layer | Cost |
| --- | ---: |
| Hook wiring LOC | 4 lines (1 import, 2 setup lines, 1 ref prop) |
| Host adapter LOC | ~25–35 executable lines (mapping domain model to `CalendarEventRepository`) |
| Host architectural changes | **0** (no DB schema changes, no server action rewrites, no route changes) |
| Framework-specific packages required | **0** (`useFullCalendarWebMCP` works identically in Vite, Next.js, and other React environments) |

## Decision

> **Current API validated. Freeze for package extraction.**

