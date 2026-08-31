# Protocol Tooling

Protocol Tooling makes existing web software agent-ready. This Phase 0 proof adds six [WebMCP](https://github.com/webmachinelearning/webmcp) tools to an ordinary persisted [FullCalendar React](https://fullcalendar.io/docs/react) application without replacing its UI, persistence, or mutation callbacks.

## Run the proof

```bash
npm install
npm run dev
```

Open the local URL in ChatGPT's in-app browser, where site tools are supported. The seeded calendar persists in `localStorage`; dragging or resizing an event uses the application's normal persistence callback.

Try the golden path:

1. “What do I have Wednesday?”
2. “Schedule Design Review Wednesday at 2 PM for one hour.”
3. “Move Design Review to Thursday morning.”
4. Reload, then ask “When is Design Review?”
5. Drag the event, then ask “When is Design Review now?”
6. Delete it through the agent, reload, and ask again.

## Integration

The existing app supplies the repository it already uses and its existing refresh function:

```tsx
import { useFullCalendarWebMCP } from "./protocol-tooling";

const calendarRef = useRef<CalendarRef>(null);
useFullCalendarWebMCP({ calendarRef, events: repository, onEventsChanged: reloadEvents });

<FullCalendar ref={calendarRef} {...existingOptions} />
```

That is one import, three integration statements, one existing repository object, and one existing refresh callback. No FullCalendar mutation callback changes and no persistence changes are required.

## Checks

```bash
npm test
npm run lint
npm run build
```

The implementation is intentionally stopped at the vertical slice. See [docs/architecture.md](docs/architecture.md) for the decision record, lifecycle behavior, actual integration cost, and limitations.
