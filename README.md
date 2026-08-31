# FullCalendar WebMCP

**FullCalendar WebMCP** is published by **Protocol Tooling**.

It exposes standard WebMCP calendar tools (`calendar_get_context`, `calendar_list_events`, `calendar_get_event`, `calendar_create_event`, `calendar_update_event`, `calendar_delete_event`) over existing FullCalendar React instances and host persistence without altering the application's UI, mutation workflows, or database architecture.

## Installation

```bash
npm install @protocoltooling/fullcalendar
```

### Local / Tarball Installation (Development)

```bash
npm pack
npm install /path/to/protocoltooling-fullcalendar-0.1.0.tgz
```

### Peer Dependencies

Ensure host peer dependencies are installed:

- `react`: `>=17 <20`
- `@fullcalendar/react`: `^6.0.0 || ^7.0.0`

---

## Minimal Integration

```tsx
import FullCalendar from "@fullcalendar/react"; // v6 or v7
import { useCallback, useRef, useState } from "react";
import {
  useFullCalendarWebMCP,
  type CalendarEvent,
  type CalendarEventRepository,
} from "@protocoltooling/fullcalendar";

export function MyCalendar() {
  const calendarRef = useRef<FullCalendar>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  const reloadEvents = useCallback(async () => {
    const data = await eventRepository.list();
    setEvents(data);
    return data;
  }, []);

  useFullCalendarWebMCP({
    calendarRef,
    events: eventRepository,
    onEventsChanged: reloadEvents,
  });

  return (
    <FullCalendar
      ref={calendarRef}
      events={events}
      /* ... other FullCalendar options */
    />
  );
}
```

---

## Repository Contract

The host provides an object implementing `CalendarEventRepository` mapped to its existing database or API:

```ts
import type {
  CalendarEvent,
  CalendarEventQuery,
  CalendarEventRepository,
  CreateCalendarEventInput,
  UpdateCalendarEventInput,
} from "@protocoltooling/fullcalendar";

export const eventRepository: CalendarEventRepository = {
  async list(query?: CalendarEventQuery, options?: { signal?: AbortSignal }): Promise<CalendarEvent[]> {
    return api.events.list(query, options);
  },
  async get(id: string, options?: { signal?: AbortSignal }): Promise<CalendarEvent | null> {
    return api.events.get(id, options);
  },
  async create(input: CreateCalendarEventInput, options?: { signal?: AbortSignal }): Promise<CalendarEvent> {
    return api.events.create(input, options);
  },
  async update(id: string, input: UpdateCalendarEventInput, options?: { signal?: AbortSignal }): Promise<CalendarEvent> {
    return api.events.update(id, input, options);
  },
  async delete(id: string, options?: { signal?: AbortSignal }): Promise<void> {
    return api.events.delete(id, options);
  },
};
```

---

## Persistence Model

> **FullCalendar WebMCP does not persist calendar events itself. The host application's persistence remains authoritative.**

Agent mutations and human interactions (e.g. dragging, resizing, modal editing) converge on the host application's authoritative persistence. The integration maintains no secondary event ledger.

---

## Supported Architecture

- **React:** React 17, 18, and 19.
- **FullCalendar React:** FullCalendar React v6 class instances (`RefObject<FullCalendar | null>`) and FullCalendar React v7 handles (`RefObject<CalendarRef | null>`).
- **Runtime:** WebMCP runtime required for tool registration (`document.modelContext.registerTool`).
- **Framework Agnostic:** Compatible with Next.js (App Router & Pages Router), Vite, Remix / React Router, TanStack Start, or pure client SPAs.
- **Backend Agnostic:** Works with Server Actions, REST, GraphQL, Supabase / PostgreSQL, ORMs, or custom APIs.

---

## Server-Side Rendering (SSR) & Lifecycle

- **SSR-Safe:** The package contains no top-level browser global (`window`, `document`) access. Server rendering completes without error.
- **Client Lifecycle:** Tool registration occurs inside `useEffect` via an `AbortController`. React Strict Mode replay and unmount cleanup properly unregister tools with zero orphaned state.
- **Delayed Runtime:** Automatically waits for late-injected WebMCP runtime if not immediately present at mount time.
- **React Server Components (RSC):** The package entry includes the `'use client';` directive for seamless import into Next.js App Router client components.

---

## Package migration

Previous package: `protocoltooling`  
Current package: `@protocoltooling/fullcalendar`  
The old package is deprecated.

---

## Development & Verification

```bash
# Build library package (dist/index.js, dist/index.d.ts)
npm run build:lib

# Run unit, integration, public type, and SSR tests
npm test

# Run typecheck & linter
npm run typecheck
npm run lint

# Build package tarball and test in external Vite and Next.js consumers
npm run test:pack

# Run interactive dev example
npm run dev
```

## License

MIT
