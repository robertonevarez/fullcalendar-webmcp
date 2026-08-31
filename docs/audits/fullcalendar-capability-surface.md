# FullCalendar WebMCP — Capability Surface & Extended Props Audit

**Status:** Research only — no API or implementation changes authorized.  
**Package audited:** `@protocoltooling/fullcalendar@0.1.1`  
**FullCalendar docs baseline:** Official v7 docs (`fullcalendar.io/docs/*`), peer range `@fullcalendar/react` `^6.0.0 || ^7.0.0` (dev pin `7.0.2`).  
**Date:** 2026-08-31  
**Audience:** Protocol Tooling internal architecture review (not consumer docs; excluded from Blume publish via `**/audits/**`).

---

## Executive Summary

- Today’s public model is deliberately minimal: `CalendarEvent` = `{ id, title, start, end, allDay }` and exactly six WebMCP tools.
- Event CRUD for agents goes through `CalendarEventRepository` only. Tools **never** read FullCalendar Event Objects (`getEventById` / `getEvents` are unused). FullCalendar is used for **viewport/timezone context** (`calendar_get_context`).
- FullCalendar does **not** define `location`, `attendees`, `organizer`, `description`, or similar as first-class event fields. Those concepts are host-domain (or mainstream calendar-product) metadata; in FullCalendar they land in `extendedProps` only if the host puts them there.
- **Do not expose raw `extendedProps` by default.** Hosts commonly stash internal IDs, billing codes, permissions, and PII there. Automatic exposure would be a privacy/security footgun and would not match the repository-authoritative architecture.
- **Recommended direction:** Optional, host-selected, **JSON-safe, read-only metadata projection at the repository / `CalendarEvent` boundary** (not by scraping FullCalendar’s in-memory Event Object). Keep write metadata out of v1 evolution.
- Treat resources, recurrence, and availability/business-hours **reasoning** as separate Layer-3 capabilities — not as `extendedProps` keys. Resources are FullCalendar **Premium**; do not fold them into the base package.
- Timezone context from `calendar_get_context` is **adequate for careful agents** (browser TZ + FC `timeZone` + ISO `now` + visible range) provided agents emit offset-bearing ISO datetimes. No urgent TZ defect found; optional clarity improvements are additive.
- Smallest next experiment: additive optional `metadata?: JsonObject` on read responses only, populated by the host repository (or an optional projection callback that receives the host entity the repository already has), with zero behavior change when omitted.

---

## Current Protocol Tooling Surface

### Public exports (`src/index.ts`)

- `useFullCalendarWebMCP`
- Types: `CalendarEvent`, `CalendarEventQuery`, `CalendarEventRepository`, `CreateCalendarEventInput`, `UpdateCalendarEventInput`, `FullCalendarHandle`, `FullCalendarWebMCPOptions`

### Exact current event model (`src/types.ts`)

```ts
interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string | null;
  allDay: boolean;
}

interface CreateCalendarEventInput {
  title: string;
  start: string;
  end?: string | null;
  allDay?: boolean;
}

interface UpdateCalendarEventInput {
  title?: string;
  start?: string;
  end?: string | null;
  allDay?: boolean;
}

interface CalendarEventQuery {
  start?: string;
  end?: string;
  text?: string; // title substring only
}

interface FullCalendarWebMCPOptions {
  calendarRef: RefObject<FullCalendarHandle | null>;
  events: CalendarEventRepository;
  onEventsChanged: () => unknown | Promise<unknown>;
  onRegistrationError?: (error: unknown) => void;
}
```

### Six WebMCP tools (`src/tool-definitions.ts`)

| Tool | Role | Data source |
|---|---|---|
| `calendar_get_context` | `now`, `browserTimeZone`, `fullCalendarTimeZone`, `view`, `visibleRange` | FullCalendar API + browser |
| `calendar_list_events` | Filtered list | `events.list` |
| `calendar_get_event` | Get by id | `events.get` |
| `calendar_create_event` | Create | `events.create` → `onEventsChanged` |
| `calendar_update_event` | Partial update | `events.update` → `onEventsChanged` |
| `calendar_delete_event` | Delete | `events.delete` → `onEventsChanged` |

Schemas use `additionalProperties: false` on inputs. Event payloads expose only the five `CalendarEvent` fields.

### Architectural boundary (validated)

```text
Agent ⇄ WebMCP tools ⇄ CalendarEventRepository (host) ⇄ host DB/API
                         ↑
              onEventsChanged() refreshes UI
                         ↑
              FullCalendar renders host-supplied events[]
```

Docs (`guides/custom-event-model.mdx`) already instruct hosts to **strip** domain fields (`clinicRoom`, notes, etc.) when mapping to `CalendarEvent`. That is intentional neutrality — and the primary reason agents cannot answer location/people queries today.

---

## FullCalendar Capability Matrix

Sources: [Event Object](https://fullcalendar.io/docs/event-object), [Event Parsing](https://fullcalendar.io/docs/event-parsing), [Recurring Events](https://fullcalendar.io/docs/recurring-events), [RRule Plugin](https://fullcalendar.io/docs/rrule-plugin), [timeZone](https://fullcalendar.io/docs/timeZone), [businessHours](https://fullcalendar.io/docs/businessHours), [eventConstraint](https://fullcalendar.io/docs/eventConstraint), [validRange](https://fullcalendar.io/docs/validRange), [eventAllow](https://fullcalendar.io/docs/eventAllow), [eventOverlap](https://fullcalendar.io/docs/eventOverlap), [Resource Object](https://fullcalendar.io/docs/resource-object), [Resource Parsing](https://fullcalendar.io/docs/resource-parsing), [Premium](https://fullcalendar.io/docs/premium), [Google Calendar](https://fullcalendar.io/docs/google-calendar), [iCalendar](https://fullcalendar.io/docs/icalendar).

| Capability | FullCalendar representation | Core / plugin | Read | Write | Agent value | Generic? | Currently exposed? | Proposed treatment |
|---|---|---|---|---|---|---|---|---|
| `id` | Event `id` | Core | Yes | Host assign | High | Yes | Yes | **A** Core |
| `title` | Event `title` | Core | Yes | `setProp` / input | High | Yes | Yes | **A** Core |
| `start` | `start` / `startStr` (inclusive) | Core | Yes | `setDates` / input | High | Yes | Yes | **A** Core |
| `end` | `end` / `endStr` (exclusive, nullable) | Core | Yes | `setDates` / input | High | Yes | Yes (`null` OK) | **A** Core |
| `allDay` | `allDay` | Core | Yes | input / inference | High | Yes | Yes | **A** Core |
| Timezone context | Calendar `timeZone` (`local` / `UTC` / named) | Core (+ Temporal guidance for named) | Yes | Calendar option | High | Yes | Partial via context | Keep in context; do not invent per-event TZ field unless host needs it |
| Duration | Derived from start/end or defaults | Core | Derived | Via end | High | Yes | Implicit | Keep derived; no separate field needed |
| `groupId` | Shared drag/resize / recurrence group | Core | Yes | input | Medium | FC-interaction-biased | No | **C** Advanced / optional later — not Layer 1 |
| `url` | Click navigation URL | Core | Yes | input | Low–Med | Presentation-adjacent | No | **D**/optional metadata if host wants meeting link |
| `extendedProps` | Arbitrary hash; non-standard fields moved here on parse | Core | Yes | `setExtendedProp` | High *if curated* | Escape hatch | No | **B** Host-selected projection — **never raw default** |
| description / location / attendees / organizer | **Not FC fields**; become `extendedProps` if supplied | Host / product convention | Host | Host | High for agents | Product-generic, FC-nonstandard | No | **B** Optional host metadata |
| Domain IDs (customerId, tenantId, …) | Typically `extendedProps` | Host | Host | Host | Mixed | Host-specific | No | **E** Private by default; expose only if host selects |
| `editable` / `startEditable` / `durationEditable` | Per-event UI permission overrides | Core | Yes | input | Low for agents | Interaction policy | No | **D**/host policy — do not expose unless agent needs capability hints |
| `resourceEditable` | Per-event resource drag | Premium resources | Yes | input | Med for resource UIs | Resource-coupled | No | **C** with resources module |
| `overlap` / `constraint` | Per-event drag limits | Core | Yes | input | Med | Scheduling policy | No | **C** / host; not agent-writable bag |
| `display` | `auto`/`block`/`background`/… | Core | Yes | input | Low | Presentation | No | **D** Invisible |
| Colors / `classNames` | `color`, `contrastColor`, `className` | Core | Yes | input | None–Low | Presentation | No | **D** Invisible |
| `source` | EventSource reference | Core | Yes | N/A | None | Implementation | No | **E** Invisible |
| Simple recurrence | `daysOfWeek`, `startTime`, `endTime`, `startRecur`, `endRecur` | Core | Expand locally | Fragile | High | Yes (limited) | No | **C** Separate abstraction; mutation deferred |
| RRule recurrence | `rrule`, `exdate`, `exrule`, `duration` | `@fullcalendar/rrule` | Expand | Fragile | High | Yes (RFC-ish) | No | **C** Separate; prefer host expansion |
| Recurrence edit (one vs series) | Weak / host-defined; FC expands for display | Core/plugin | Limited | Unsafe generically | High | Hard | No | Intentionally unsupported until explicit model |
| `businessHours` | Emphasize slots; usable as constraint target | Core | Calendar option | Calendar option | Med | Partial | No | **C** Context-only later; not availability search |
| `validRange` | Nav + drag bounds | Core | Option | Option | Med | Partial | No | **C** Context optional |
| `eventAllow` / `eventOverlap` | Functions / flags | Core | Runtime | Config | Med | Host logic | No | **E**/host — not serializable as data |
| Resources | Resource Object + `resourceId(s)` on events | **Premium** | API | API | High for ops calendars | Scheduling primitive | No | **C** Optional separate module |
| Resource business hours / constraints | Per-resource `businessHours`, `eventConstraint`, … | Premium | Yes | Config | High | Scheduling | No | With resources module |
| Multiple event sources / JSON feeds | Event Source | Core | Host | Host | Low | Implementation | No | **E** Host detail |
| Google Calendar plugin | External feed → events (+ GCal extended props → `extendedProps`) | Plugin | Display | Not PT persistence | Low | Interop | No | **E** Host; conflicts with repository authority if used as sole ledger |
| iCalendar feed | ICS source | Plugin | Display | Not PT persistence | Low | Interop | No | **E** Host |
| `eventDataTransform` | Host transform hook | Core | N/A | N/A | None | Implementation | No | **E** Host |

**Category key:** A Core · B Optional host metadata · C Advanced scheduling · D Presentation · E Host implementation detail

---

## Extended Props Findings

### What FullCalendar permits

From official Event Object / Event Parsing docs (v7):

1. `extendedProps` is a **plain object** holding miscellaneous properties.
2. Hosts may set `extendedProps: { … }` explicitly on input objects.
3. **Any non-standard top-level property** on an input event is **moved into** `extendedProps` during parsing (e.g. `description: 'Lecture'` → `event.extendedProps.description`).
4. Official guidance: prefer putting custom fields **inside** `extendedProps` explicitly.
5. Parsed Event Object properties are **read-only**; mutation uses methods such as `setExtendedProp(name, value)`.
6. Docs do **not** constrain value types beyond “plain object” / arbitrary property values. In practice values can be nested objects, arrays, Dates, etc., because this is in-process JavaScript — **not** a JSON schema boundary.
7. Nested objects are supported in the sense that JS object graphs are allowed; there is **no** FC guarantee of deep clone safety, serializability, or immutability beyond the read-only wrapper semantics of the Event Object itself.
8. Google Calendar plugin: Google “Extended Properties” appear in FC `extendedProps` — evidence that FC treats the hash as an interoperability dump, not a curated semantic model.

### How this relates to Protocol Tooling **today**

Critical architectural fact:

> WebMCP list/get/create/update/delete **do not read or write FullCalendar Event Objects**. They call `CalendarEventRepository`.

Therefore:

- “Expose `extendedProps`” is **not** “turn on a FullCalendar field we already pass through.”
- Metadata useful to agents lives in the **host domain model** (or in whatever the repository maps). Hosts *may* also mirror some of it into FC `extendedProps` for UI rendering, but that is optional and often incomplete.
- The package’s own custom-event-model guide currently **drops** host fields when producing `CalendarEvent`. Agents are blind by design unless we add an explicit, opt-in path.

### Survival across parsing / manipulation

- Survives FC parse into Event Object `extendedProps`.
- Mutable via `setExtendedProp`.
- **Does not automatically survive** Protocol Tooling’s repository contract, because `CalendarEvent` has no metadata field and demo/local repository clones only the five core fields.

### Serialization at the WebMCP boundary

WebMCP tool I/O is structured/JSON-like. `Record<string, unknown>` is **unsafe** as a public contract:

| Value | Risk |
|---|---|
| `Date` | Becomes string or fails depending on serializer |
| `undefined` | Often stripped; asymmetric round-trips |
| `function` / class instance | Not JSON |
| `Map` / `Set` / `BigInt` | Not JSON |
| Circular refs | Throws |
| Nested host entities | Accidental over-exposure |

**If metadata is introduced, Protocol Tooling should require a JSON-safe type** at the public WebMCP/repository boundary:

```ts
type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
type JsonObject = { [key: string]: JsonValue };
```

---

## Metadata Exposure Strategies

### Strategy A — Raw `extendedProps` on `CalendarEvent`

```ts
interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string | null;
  allDay: boolean;
  extendedProps?: Record<string, unknown>;
}
```

| Dimension | Assessment |
|---|---|
| Ergonomics | Easy for hosts who already mirror props into FC |
| Interoperability | Couples PT naming to FC’s dump bag |
| Privacy / security | **Poor** — defaults to “everything the host stuffed in” |
| Serialization | **Poor** unless narrowed to JSON-safe |
| Schema / agents | Opaque bag; agents guess keys |
| Write safety | Merge/replace ambiguity; easy to wipe unrelated keys |
| Repository adapters | Forces every adapter to invent an `extendedProps` shape or pass null |
| Architecture fit | **Weak** — PT does not currently read FC events |

**Verdict:** Reject as default. Acceptable only as an explicit, documented escape hatch with strong warnings — still inferior to host projection.

### Strategy B — Explicit metadata allowlist on the hook

```ts
useFullCalendarWebMCP({
  calendarRef,
  events,
  onEventsChanged,
  metadata: { expose: ["location", "attendees"] },
});
```

| Dimension | Assessment |
|---|---|
| Ergonomics | Familiar “pick fields” UX |
| Static vs dynamic | Allowlist is static; dynamic keys need updates |
| Nested values | Unclear (`attendees.0.name`?) |
| Collisions | Key names are host conventions, not FC standards |
| Write semantics | Still undefined |
| Where do values come from? | **Problem:** allowlist alone cannot invent values. Repository returns five fields today. Hook would need to read FC Event Objects **or** repository must already return those keys. |
| Coupling | Mild FC naming (`extendedProps`) if implemented by reading the calendar API |

**Verdict:** Incomplete by itself. An allowlist is a **filter**, not a **source**. Without a source of truth richer than today’s `CalendarEvent`, the hook would either (a) scrape FC (diverges from repository authority / stale risk) or (b) require the repository to return the fields anyway — at which point the allowlist is redundant filtering on top of host projection.

### Strategy C — Host-controlled mapper / projection

```ts
// Conceptual — not a committed API
eventMetadata: (hostEntity) => ({
  location: hostEntity.clinicRoom,
  attendees: hostEntity.participants.map((p) => p.name),
})
```

| Dimension | Assessment |
|---|---|
| Architecture fit | **Strong if placed where the host entity already exists** |
| Hook-level mapper on `CalendarEvent` only | **Weak** — by the time you have a `CalendarEvent`, domain fields were already stripped |
| Repository-level projection | **Strong** — repository already loads domain entities (see custom-event-model guide) |
| Privacy | Host chooses the projection; default empty |
| Serialization | Host returns JSON-safe object; PT can validate |
| Writes | Can remain unsupported initially |

**Where metadata actually exists today:**

| Layer | Has domain metadata? |
|---|---|
| Normalized `CalendarEvent` | No |
| Repository implementation | Yes (host closure / DB row) |
| FullCalendar Event Object | Only if host also put it in `events[]` / `extendedProps` |
| Host domain model | Yes — authoritative |

**Verdict:** Projection belongs at the **repository boundary** (host maps entity → `CalendarEvent` + optional metadata), optionally assisted by a thin package helper. A hook-level mapper that only sees stripped `CalendarEvent` cannot recover `clinicRoom` without a second fetch.

### Better alternative discovered: **Optional field on the shared read model, populated by the repository**

```ts
interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string | null;
  allDay: boolean;
  /** Host-selected, JSON-safe, agent-visible projection. Omitted = invisible. */
  metadata?: JsonObject;
}
```

- No FC `extendedProps` name in the PT public model (avoids implying PT standardizes FC’s bag).
- Hosts who already use FC `extendedProps` can copy a **subset** into `metadata` in their repository mapper.
- Additive: existing repositories omit `metadata`; tools keep working.
- Aligns with “host remains authoritative” and with the existing custom-event-model guidance.

This is Strategy C’s natural fit to the **current** architecture, without inventing a parallel fetch path.

---

## Read vs Write Recommendation

### Read-only metadata (recommended first evolution)

Enables high-value agent queries without mutation risk:

- “What’s scheduled at North Campus tomorrow?”
- “What meetings do I have with Sarah this week?”
- “Which events involve the facilities team?”

Agents can `calendar_list_events` then filter client-side on metadata, **or** (later) hosts may extend `CalendarEventQuery` — but query extensions are **not** required for the first experiment if lists are small / range-bounded.

### Writable metadata (defer)

Problems if agents can send `metadata` / `extendedProps` patches:

| Question | Finding |
|---|---|
| Replace or merge? | Ambiguous; either can destroy host state |
| Shallow vs deep merge? | Deep merge is complex and surprising |
| Validation? | Domain invariants live in host; PT cannot know them |
| Authorization? | Must remain host repository responsibility |
| Omitted fields? | Partial update vs wipe |
| Erase unrelated keys? | Easy with replace semantics |
| Who defines writable keys? | Host — implies allowlist **and** write schema |
| Arbitrary mutation? | **Should not exist** as a generic PT feature |

**Recommendation:** First evolution = **read-only metadata**. Writable metadata only after a separate design with host-declared writable keys and explicit merge rules — likely still repository-implemented, not a free-form bag.

---

## Privacy & Serialization

### Should Protocol Tooling ever expose all `extendedProps` by default?

**No.**

Safe default:

1. **No metadata in tool responses unless the host supplies it** on `CalendarEvent.metadata` (or equivalent).
2. Hosts treat FC `extendedProps` as **UI/internal** unless explicitly projected.
3. Distinguish:
   - **Agent-readable:** Host-selected semantic projection (location labels, public attendee names, room names, …).
   - **Agent-writable:** None initially; later only host-declared keys with host validation.
   - **Host-private:** `tenantId`, `billingCode`, `permissions`, `privateNotes`, raw emails, internal status machines — stay out of WebMCP unless the product intentionally opts in.

### Serialization contract

If introduced, metadata **must** be JSON-safe (`JsonObject`). Prefer rejecting non-JSON values at the repository adapter (host responsibility) rather than silent dropping inside PT.

---

## Timezone Findings

### What agents get today (`calendar_get_context`)

- `now` — `Date.toISOString()` (UTC `Z`)
- `browserTimeZone` — `Intl` IANA name
- `fullCalendarTimeZone` — FC option or `"local"`
- `view`, `visibleRange` — ISO strings from `Date.toISOString()`

### Is this enough for “9 AM” / “tomorrow morning” / “move to 2 PM”?

**Mostly yes, if the agent follows the tool description:** call context first; emit ISO 8601 **with explicit offsets**.

Caveats (documentation / agent discipline, not a broken API):

| Situation | Guidance |
|---|---|
| `fullCalendarTimeZone === "local"` | Interpret wall times in `browserTimeZone` |
| Named FC zone ≠ browser zone | Prefer `fullCalendarTimeZone` for wall-clock scheduling on that calendar |
| `visibleRange` as UTC ISO | Fine for range queries; convert using context TZs for display reasoning |
| All-day events | Date-only semantics remain subtle (FC exclusive end); already partly documented |

**Belonging:** Timezone stays primarily in **`calendar_get_context`**, not as a new required field on every event. Per-event timezones (Google-style `start.timeZone`) are uncommon in FC’s model when the calendar has a single `timeZone`; treat as host metadata if needed.

**Optional additive improvement (not required to unlock metadata):** when FC zone is `"local"`, also return a resolved IANA hint (already available as `browserTimeZone`) or rename fields for clarity — purely UX for agents.

---

## Recurrence Findings

### What FullCalendar supports

- **Simple recurrence** (core): `daysOfWeek`, `startTime`, `endTime`, `startRecur`, `endRecur`; implies recurring when present; normal `start`/`end` omitted.
- **RRule plugin:** richer RFC-like rules; `duration` for instance length; timezone parsing rules documented.
- **Interaction:** recurring instances move together if they share `groupId`.
- Official docs also note hosts may **expand on the server** before sending JSON — often the safest persistence model.

### What our `CalendarEvent` loses

Everything about recurrence. A recurring definition cannot be represented; only concrete instances (if the host expands them) fit `{ start, end, … }`.

### Mutation (“Move my weekly safety meeting to 9 AM”)

Unsafe to offer generically today:

- One occurrence vs entire series is a **product** semantic (Google/Outlook have explicit models; FC primarily expands for display).
- Instance IDs vs series IDs are host-defined.
- Editing via PT would require a recurrence-aware repository contract.

**Treatment:** Layer 3. Prefer **read** of expanded instances via existing list/get first. Do **not** recommend recurrence mutation until a dedicated model exists. Hosts that need agent-managed series should keep series logic in their backend and expose instances (and later series tools) explicitly.

---

## Resources Findings

### What FullCalendar knows

- Resource Object: `id`, `title`, `extendedProps`, styling, per-resource `businessHours`, `eventConstraint`, `eventOverlap`, `eventAllow`, hierarchy (`children` / `parentId`).
- Events associate via `resourceId` / `resourceIds` (**requires resource plugins**).
- APIs: `getResources`, `getResourceById`, etc.
- Docs repeatedly mark resources as **premium**.

### What remains host-specific

True availability (“which technician is free?”) needs: resource calendars, existing bookings, skills, travel time, labor rules — **not** provided as a FullCalendar “availability solver.”

### Licensing / package implications

Adding resource WebMCP tools to the **base** `@protocoltooling/fullcalendar` package would:

- Create expectations around Premium plugins / `schedulerLicenseKey`
- Pull support burden for views PT does not control
- Violate “do not assume Scheduler belongs in the base integration”

**Treatment:** Separate optional integration/module later (conceptually `calendar_list_resources`, maybe assignment update). **Do not** stuff `resourceId` into generic `extendedProps` as if it were ordinary metadata — it is a scheduling join key to a different primitive.

---

## Business Hours / Availability Findings

FullCalendar `businessHours`:

- Emphasizes time slots visually (default Mon–Fri 9–5 if `true`).
- Can feed `eventConstraint: "businessHours"` to **limit dragging/resizing**.
- Per-resource business hours exist (premium).

FullCalendar does **not** offer:

- “Next available appointment” search
- Free/busy aggregation across people
- Optimization under multi-constraint policies

`eventAllow` is a **function** — not serializable agent data.

**Agent availability reasoning** requires some combination of:

1. Optional business-hours **context** (if host exposes calendar options)
2. Event collision analysis over listed events
3. Resource availability (if applicable)
4. **Host-specific** availability APIs (often the real answer)

Do not overclaim FC as an availability engine.

---

## Typical Calendar Comparison

| Concept | Google Calendar API | Microsoft Graph | iCalendar / RFC 5545 | FullCalendar | PT today | Proposed home |
|---|---|---|---|---|---|---|
| Title / summary | `summary` | `subject` | `SUMMARY` | `title` | Core | **Core** |
| Start / end | `start`/`end` + TZ | `start`/`end` + TZ | `DTSTART`/`DTEND` | `start`/`end` exclusive end | Core | **Core** |
| All-day | date vs dateTime | `isAllDay` | VALUE=DATE | `allDay` | Core | **Core** |
| Timezone | per-event + calendar | per-event TZ | TZID | calendar `timeZone` | Context | **Context** (+ optional metadata) |
| Location | first-class | first-class | `LOCATION` | **not first-class** → often `extendedProps` | Absent | **Optional metadata** |
| Description | first-class | `body` | `DESCRIPTION` | non-standard → `extendedProps` | Absent | **Optional metadata** |
| Attendees | first-class | first-class | `ATTENDEE` | not first-class | Absent | **Optional metadata** (not invite protocol) |
| Organizer | first-class | first-class | `ORGANIZER` | not first-class | Absent | **Optional metadata** / often read-only |
| Recurrence | `recurrence[]` RRULE | `patternedRecurrence` | `RRULE` | simple + RRule plugin | Absent | **Advanced** |
| Status | `status` | response/sensitivity/… | `STATUS` | not standard | Absent | Metadata or unsupported |
| Conference URL | `hangoutLink` / conferenceData | `onlineMeeting` | often `URL` / X-props | `url` or metadata | Absent | Metadata / `url` optional |
| Reminders | `reminders` | reminder fields | `VALARM` | not FC core | Absent | **Host-specific** |
| Free/busy | separate APIs | schedule APIs | VFREEBUSY | not FC | Absent | **Host / advanced** |
| Resources (rooms/people as schedulable) | calendar resources | places / rooms | limited | **Premium resources** | Absent | **Advanced module** |
| Extended private props | `extendedProperties` | open extensions | X- props | `extendedProps` | Absent | Host-private unless projected |

**Takeaway:** Users expect location/people/description from Google/Outlook. FullCalendar WebMCP should enable hosts to **project** those concepts without PT standardizing a Google Calendar clone schema.

---

## Agent Workflow Gap Analysis

| Workflow | Possible today? | Missing info | Where FC/host stores it | Expose via PT? | Abstraction |
|---|---|---|---|---|---|
| “What do I have tomorrow afternoon?” | **Yes** | — | Core times | Already | Core + context |
| “Move the Project Review to 2 PM.” | **Yes** (title search + update) | TZ discipline | Core | Already | Core + context |
| “Make it 90 minutes.” | **Yes** (recompute end) | — | Core | Already | Core |
| “What’s scheduled at North Campus tomorrow?” | **No** | location | Host / `extendedProps` | Yes, read metadata | Layer 2 |
| “Move everything at North Campus to Thursday.” | **No** | location filter | Host | Read metadata + core update | Layer 2 + core writes |
| “Meetings with Sarah this week?” | **No** | attendees/people | Host | Read metadata | Layer 2 |
| “Move meeting with Sarah to Friday.” | **Partial** (if unique title) | people disambiguation | Host | Read metadata | Layer 2 + core |
| “Move all events in this deployment.” | **No** | grouping key | Host id **or** FC `groupId` | Prefer host metadata; `groupId` only if hosts use FC grouping | Layer 2 (or later `groupId`) |
| “Move weekly safety meeting to 9 AM.” | **Unsafe / No** | series vs instance | Recurrence def / expanded instances | Not as generic mutation | Layer 3 later |
| “Which technician available tomorrow afternoon?” | **No** | resources + availability logic | Premium resources + host | Separate module + host rules | Layer 3 |
| “Move appointment from Alex to Jordan.” | **No** | resource assignment | `resourceId(s)` | Resources module | Layer 3 |
| “Next available time during business hours.” | **No** | BH + collisions + policy | `businessHours` + events + host | Context + list + host API | Layer 3 / host |

---

## Proposed Capability Layers

```text
Layer 1 — Core event semantics (shipped)
  id, title, start, end (exclusive), allDay
  + calendar_get_context (now, browser TZ, FC TZ, view, visible range)
  + CRUD via CalendarEventRepository

Layer 2 — Optional host metadata (recommended next)
  Host-selected JSON-safe projection on reads
  Default: absent / empty
  Not named extendedProps in the public PT model
  Read-only initially
  Query/filter enhancements optional later

Layer 3 — Advanced scheduling primitives (future, separate)
  Resources (optional Premium-aware module)
  Recurrence (read expanded instances first; mutation later if ever)
  Business hours / validRange as agent context
  Availability solvers remain host-owned
```

**Falsification notes on the prompt’s plausible architecture:**

- **Raw `extendedProps` exposure:** Falsified as default — privacy + wrong data path (repository, not FC Event Object).
- **Metadata on `CalendarEvent`:** Valid *if optional and host-populated* — this matches where mapping already happens.
- **Metadata only at hook:** Falsified if the hook only sees stripped events — must be repository (or a callback with host entity).
- **Reading FC `extendedProps` from `calendarRef`:** Tempting but **wrong primary design** — diverges from persistence authority, can be stale vs DB, and misses events not mounted in the current FC event store.

---

## API Options (sketches only)

### Option 0 — Keep API unchanged

- **Pros:** Maximum safety; architecture already proven.
- **Cons:** Location/people/grouping workflows remain impossible without stuffing signals into `title` (anti-pattern).

### Option 2 — Host-selected read-only metadata on the read model (strongest)

```ts
type JsonObject = { [key: string]: JsonValue };

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string | null;
  allDay: boolean;
  metadata?: JsonObject; // omit or {} = nothing agent-visible
}

// Repository create/update inputs UNCHANGED (read-only metadata)
// Tool list/get responses include metadata when present
// inputSchema for writes stays additionalProperties: false without metadata
```

Host adapter (fits existing guide):

```ts
function appointmentToCalendarEvent(app: Appointment): CalendarEvent {
  return {
    id: app.appointmentId,
    title: app.patientName,
    start: app.startTime,
    end: app.endTime,
    allDay: false,
    metadata: {
      location: app.clinicRoom,
      // intentionally omit doctorNotes, tenantId, billingCode
    },
  };
}
```

### Option 1 — Raw `extendedProps` (weak)

Rejected as default; see Strategy A.

### Option 3 — Read/write metadata

Defer. Sketch only if revisited:

```ts
interface UpdateCalendarEventInput {
  title?: string;
  start?: string;
  end?: string | null;
  allDay?: boolean;
  metadata?: JsonObject; // host-defined merge semantics — too vague for v1
}
```

### Option 4 — Advanced scheduling as separate surfaces (later)

```ts
// Separate optional package or opt-in tool set — NOT extendedProps
// calendar_list_resources / calendar_get_resource
// calendar_get_scheduling_context → { businessHours, validRange, timeZone }
// recurrence: intentionally deferred
```

### Alternative considered: allowlist filter in hook

Only useful as a **second line of defense** on top of Option 2 if repositories are shared between UI (rich) and agents (narrow). Not sufficient alone.

---

## Decision Rubric

Scores 1–5. Weighted total = Σ(score × weight).

| Criterion | Weight | Opt 0 Unchanged | Opt 1 Raw extendedProps | Opt 2 Read-only metadata on CalendarEvent | Opt 3 R/W metadata |
|---|---:|---:|---:|---:|---:|
| Agent usefulness | 5 | 2 | 4 | 4 | 5 |
| Host-model neutrality | 5 | 5 | 2 | 5 | 3 |
| Privacy/safety | 5 | 5 | 1 | 5 | 2 |
| Developer ergonomics | 5 | 5 | 4 | 4 | 2 |
| Backward compatibility | 5 | 5 | 3 | 5 | 3 |
| FullCalendar alignment | 4 | 3 | 5 | 4 | 3 |
| WebMCP schema clarity | 4 | 5 | 2 | 4 | 2 |
| Serialization reliability | 4 | 5 | 1 | 5 | 3 |
| Write-semantics clarity | 4 | 5 | 2 | 5 | 1 |
| Future extensibility | 3 | 2 | 3 | 5 | 4 |
| **Weighted total** | | **189** | **118** | **206** | **126** |

**Tradeoffs (honest):**

- Opt 0 wins purity but loses mainstream agent workflows that users will ask for immediately after demoing title/time CRUD.
- Opt 1 looks “aligned with FullCalendar” but scores poorly on privacy and serialization, and misplaces the data plane.
- Opt 3 maximizes agent power but fails write-semantics and safety without a much larger design.
- Opt 2 slightly costs ergonomics (hosts must project) — that cost is **desirable** because it forces intentional disclosure.

---

## Recommended Direction

**Pick Option 2:** Additive, optional, **JSON-safe, read-only `metadata` on `CalendarEvent`**, populated by the host at the repository mapping boundary. Do **not** brand it `extendedProps` in the PT public API. Do **not** enable metadata writes. Do **not** put resources/recurrence/availability into that bag.

### Why

- Matches where domain data already lives (repository adapters).
- Preserves host-model neutrality (no standardized `attendees` type).
- Secure by default (omit = invisible).
- Additive: existing integrations unchanged if they ignore the new optional field.
- Unlocks the highest-frequency agent gaps (location / people / host tags) without Premium licensing or recurrence semantics.

### What becomes possible

- Filter/list reasoning over host-projected attributes.
- Disambiguate events beyond title.
- Progressive enhancement: demos can project `{ location }` with a few lines.

### What remains intentionally unsupported

- Raw dump of FC `extendedProps`
- Agent mutation of arbitrary metadata
- Recurrence series edit semantics
- Resource scheduling in the base package
- Availability optimization as a built-in tool
- Presentation fields (colors, classNames, display)
- Event sources / Google / ICS as PT persistence
- Becoming a calendar backend

### Compatibility impact

- **Source / runtime:** Additive optional property; old repositories valid.
- **Types:** Non-breaking optional field on interface.
- **WebMCP schemas:** Response payloads gain an optional object; write `inputSchema` unchanged.
- **Versioning:** Appropriate for a **minor** bump after experiment (0.2.0), not a major, if carefully optional.
- **Existing six tools:** Evolve additively; no new tools required for Layer 2 reads.

---

## Smallest Next Experiment

**Goal:** Validate Option 2 without committing write paths or new tools.

1. Add optional `metadata?: JsonObject` to `CalendarEvent` **in a branch** (implementation only after this audit is approved).
2. Ensure `calendar_list_events` / `calendar_get_event` return it when present; create/update ignore unknown keys still (`additionalProperties: false`).
3. Extend the example repository / one fixture to project `{ location, attendees: string[] }` for 2–3 seed events.
4. Manually run agent workflows: location filter + “meetings with X”.
5. Attempt a negative test: put `privateNotes` only in host DB / FC `extendedProps`, **omit** from `metadata` — confirm agent cannot see it.
6. Measure: lines of host code to project (target: ≤10 lines in mapper).

**Success criteria:** Location/people questions work; privacy omission works; zero changes required for hosts that do not set `metadata`.

---

## Answers to Final Questions

1. **Important FC concepts invisible today?** Timezone is partially visible via context; missing for agents: host metadata (location/people/etc.), `groupId`, recurrence definitions, resources, businessHours/validRange/constraints, presentation fields, event sources. Also missing: any non-title query dimension.
2. **Which are genuinely generic calendar semantics?** Core five fields + calendar timezone/context. Location/description/attendees are generic *product* concepts but **not** FC first-class fields. Recurrence and resources are generic scheduling primitives but deserve Layer 3.
3. **Should PT expose `extendedProps`?** Not as a raw default dump. Optionally allow hosts to project a subset into a PT `metadata` field.
4. **Raw or host-selected?** **Host-selected** only.
5. **Metadata initially read-only?** **Yes.**
6. **Where should projection occur?** At the **repository / domain→CalendarEvent mapper** (where host entities exist). Not primarily by reading FC Event Objects in the hook.
7. **JSON/serialization contract?** JSON-safe object (`JsonValue` / `JsonObject`), not `Record<string, unknown>`.
8. **Does `calendar_get_context` expose enough timezone info?** **Yes for careful agents** (browser TZ + FC TZ + now + range). Optional clarity polish only.
9. **Should `groupId` enter the core model?** **Not in Layer 1.** Revisit as optional advanced field if hosts widely use FC joint drag grouping; prefer host metadata for “deployment” style grouping.
10. **How should recurrence be treated?** Layer 3; prefer expanded instances via existing CRUD; **no** generic series mutation until explicit semantics exist.
11. **How should Resources be treated?** Separate optional Premium-aware module; not `extendedProps`; not base package default.
12. **Can FC alone power availability reasoning?** **No.** It can constrain UI and emphasize hours; availability search needs events + host rules (+ resources if used).
13. **What should remain invisible?** Colors, classNames, display modes, event source internals, `eventAllow` functions, caches, private extended props, Google/ICS feed plumbing, scheduler license details.
14. **Impossible Google/Outlook-style workflows today?** Location queries, attendee queries, description-aware search, conference-link awareness, reminder management, free/busy, recurrence series edits, resource/room assignment.
15. **Smallest additive evolution with most usefulness?** Optional read-only JSON-safe `metadata` on `CalendarEvent` returned by list/get.
16. **Preserve existing integrations unchanged?** **Yes** — omit the field and behavior matches 0.1.x.

---

## Unexpected FullCalendar Facts That Materially Shaped the Recommendation

1. **Non-standard fields are auto-moved into `extendedProps`** — reinforcing that FC’s bag is an untyped dump, dangerous to expose wholesale to agents.
2. **Resources are explicitly Premium** — blocks treating `resourceId` as casual metadata in the base package.
3. **`businessHours` is emphasis + drag constraint, not an availability API** — prevents overbuilding “smart schedule” tools on FC alone.
4. **Protocol Tooling’s tools never touch FC event APIs** — falsifies “just surface whatever FullCalendar already has on the Event Object” as the primary metadata design; the repository boundary is the true control plane.
5. **Google Calendar plugin maps GCal extended properties into FC `extendedProps`** — further evidence the hash mixes product metadata with arbitrary private keys.

---

## Urgent Defects

None identified that require stopping for a security hotfix in the current 0.1.1 surface. The main risk is **future** accidental exposure if raw `extendedProps` were added without an allowlist/projection — documented here rather than “fixed,” per audit scope.

---

## Stop Condition

Audit complete. **No implementation of the recommendation in this pass.** Await review before any API evolution.
