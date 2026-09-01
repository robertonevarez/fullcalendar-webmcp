# FullCalendar WebMCP

Add WebMCP calendar tools to an existing FullCalendar React app.

Created by Roberto Nevarez. FullCalendar WebMCP exposes structured browser tools without replacing your calendar UI, backend, database, or application state.

[Live demo](https://protocoltooling.com/demo) · [Documentation](https://protocoltooling.com/integrations/fullcalendar) · [WebMCP Challenge notes](./CHALLENGE.md)

## Install

```bash
npm install @protocoltooling/fullcalendar
```

```tsx
useFullCalendarWebMCP({
  calendarRef,
  events: repository,
  onEventsChanged: refreshEvents,
});
```

Your repository stays authoritative. FullCalendar WebMCP routes agent reads and writes through the same persistence layer your app already uses.

## Agent tools

| Tool | Purpose |
| --- | --- |
| `calendar_get_context` | Read time, timezone, view, and visible range |
| `calendar_list_events` | Search persisted events |
| `calendar_get_event` | Read one event by stable id |
| `calendar_create_event` | Create an event |
| `calendar_update_event` | Update an event |
| `calendar_delete_event` | Delete an event |

Tools return structured domain state. The consuming agent handles the conversation.

## Shared state

```text
Person ───────────────┐
                     ↓
              FullCalendar UI
                     ↓
             host repository
                     ↑
WebMCP agent → FullCalendar WebMCP
```

A person can drag or resize an event, then an agent can read the updated state. An agent can create or reschedule an event, and the same change appears in the human interface.

The demo uses browser-local persistence so every visitor gets an isolated, resettable workspace. Production apps can connect the same repository contract to their existing API and database.

## Security boundary

FullCalendar WebMCP does not authenticate users, store events, or authorize mutations. The host application remains responsible for authentication, authorization, and persistence.

Optional `capabilities` can limit which WebMCP tools are registered. This is defense in depth, not a replacement for server-side authorization.

Host-selected event `metadata` is JSON-safe and read-only through WebMCP writes. FullCalendar `extendedProps` are never exposed automatically.

## Development

```bash
npm run build:lib
npm test
npm run typecheck
npm run lint
npm run test:pack
npm run docs:build
```

Local example:

```bash
npm run dev
```

## License

MIT © 2026 Roberto Nevarez
