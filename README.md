# FullCalendar WebMCP

Add WebMCP calendar tools to an existing FullCalendar React application. Keep your backend, database, and FullCalendar setup.

Protocol Tooling is an **adapter layer** — it registers browser WebMCP tools and routes agent reads and writes through your `CalendarEventRepository`. It does not authenticate users, store events, or authorize mutations. Your backend remains authoritative.

```bash
npm install @protocoltooling/fullcalendar
```

## Minimal integration

```tsx
useFullCalendarWebMCP({
  calendarRef,
  events: repository, // list / get / create / update / delete
  onEventsChanged: refreshEvents,
});
```

```tsx
import FullCalendar from "@fullcalendar/react";
import { useCallback, useRef, useState } from "react";
import {
  useFullCalendarWebMCP,
  type CalendarEvent,
  type CalendarEventRepository,
} from "@protocoltooling/fullcalendar";

const repository: CalendarEventRepository = {
  /* wire to your API */
};

export function MyCalendar() {
  const calendarRef = useRef<FullCalendar>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  const refreshEvents = useCallback(async () => {
    setEvents(await repository.list());
  }, []);

  useFullCalendarWebMCP({
    calendarRef,
    events: repository,
    onEventsChanged: refreshEvents,
  });

  return (
    <FullCalendar
      ref={calendarRef}
      events={events.map((event) => ({
        ...event,
        end: event.end ?? undefined,
      }))}
    />
  );
}
```

## WebMCP tools

Six tools agents can call:

| Tool | Purpose |
|---|---|
| `calendar_get_context` | Anchor relative dates; read viewport/timezones |
| `calendar_list_events` | Search/discover persisted events |
| `calendar_get_event` | Fetch one event by stable id |
| `calendar_create_event` | Create a persisted event |
| `calendar_update_event` | Partial update of one event |
| `calendar_delete_event` | Permanently delete one event |

Tools return **structured domain state** (events, ids, time context) — not conversational messages. The consuming agent phrases results for the user.

Optional `capabilities` limits which tools register (defense in depth; not a substitute for server-side authorization).

## Documentation

Full docs: [protocoltooling.com/integrations/fullcalendar](https://protocoltooling.com/integrations/fullcalendar)

- [Quickstart](https://protocoltooling.com/integrations/fullcalendar/quickstart)
- [Security model](https://protocoltooling.com/integrations/fullcalendar/concepts/security)
- [Agent workflows](https://protocoltooling.com/integrations/fullcalendar/concepts/agent-tools)
- [WebMCP tools reference](https://protocoltooling.com/integrations/fullcalendar/concepts/webmcp)

## Peer dependencies

- `react`: `>=17 <20`
- `@fullcalendar/react`: `^6.0.0 || ^7.0.0`

## Persistence and metadata

Your repository is authoritative. FullCalendar WebMCP does not store events.

Optional `metadata` on `CalendarEvent` is host-selected, JSON-safe, and read-only through WebMCP writes. FullCalendar `extendedProps` are never exposed automatically.

## Package migration

Previous package: `protocoltooling` (deprecated)  
Current package: `@protocoltooling/fullcalendar`

## Development

```bash
npm run build:lib
npm test
npm run typecheck
npm run lint
npm run test:pack
npm run docs:dev
```

Local example: `npm run dev` (Vite demo in `example/`).

## License

MIT
