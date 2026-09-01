# FullCalendar WebMCP

Add WebMCP calendar tools to an existing FullCalendar React application. Keep your backend, database, and FullCalendar setup.

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

Docs: [protocoltooling.com](https://protocoltooling.com/integrations/fullcalendar)

## Peer dependencies

- `react`: `>=17 <20`
- `@fullcalendar/react`: `^6.0.0 || ^7.0.0`

## Tools

`calendar_get_context` · `calendar_list_events` · `calendar_get_event` · `calendar_create_event` · `calendar_update_event` · `calendar_delete_event`

## Persistence

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

## License

MIT
