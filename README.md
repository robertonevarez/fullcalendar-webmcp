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

The hook wiring is four executable lines: one import, two setup statements, and one `ref` addition. That measurement starts **after a host adapter implementing `CalendarEventRepository` exists**.

If an application's persistence API exposes separate functions, the adapter is additional glue and should be counted separately:

```ts
const events: CalendarEventRepository = {
  list: (query, options) => api.events.list(query, options),
  get: (id, options) => api.events.get(id, options),
  create: (input, options) => api.events.create(input, options),
  update: (id, input, options) => api.events.update(id, input, options),
  delete: (id, options) => api.events.delete(id, options),
};
```

That representative adapter is seven executable lines. Hosts whose existing repository already matches the five-operation contract need no glue; other applications may need more mapping. The demo's local persistence implementation is deliberately kept separate from the hook integration cost.

## Checks

```bash
npm test
npm run lint
npm run build
```

The implementation is intentionally stopped at the vertical slice. See [docs/architecture.md](docs/architecture.md) for the decision record, lifecycle behavior, actual integration cost, and limitations.
