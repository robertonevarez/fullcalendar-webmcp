# WebMCP Challenge

Protocol Tooling was developed during the WebMCP Challenge submission period, August 25–September 3, 2026.

This page keeps challenge-specific testing and provenance out of the main developer path.

## Try the project

Live demo: https://protocoltooling.com/demo

Use ChatGPT's in-app browser or Chrome 149+ with WebMCP enabled.

Good test prompts:

- “What do I have scheduled next Wednesday?”
- “Move the warehouse inspection to 3 PM.”
- “Create a 45-minute site inspection tomorrow at 2 PM.”
- “Delete the site inspection.”

For the strongest shared-state test, move an event manually in the calendar and then ask the agent when that event is scheduled. Both the human UI and WebMCP tools read and write through the same repository.

Reset the demo at any time:

```text
https://protocoltooling.com/demo?reset=1
```

## WebMCP implementation

`@protocoltooling/fullcalendar` registers six native browser tools through `document.modelContext.registerTool(...)`:

- `calendar_get_context`
- `calendar_list_events`
- `calendar_get_event`
- `calendar_create_event`
- `calendar_update_event`
- `calendar_delete_event`

Tool descriptions include usage guidance, stable-id rules, date semantics, ambiguity handling, and mutation boundaries. Read tools mark returned event content as untrusted. Mutation capabilities can be limited by the host.

The package remains an adapter layer: the host application owns authentication, authorization, persistence, and business rules.

## Submission-period work

Representative commits:

- [`58f5083`](https://github.com/robertonevarez/protocoltooling/commit/58f508361f4bb73c4b35cba7cfff3114cb0883a2) — WebMCP execute-callback compatibility and regression coverage
- [`0d45db4`](https://github.com/robertonevarez/protocoltooling/commit/0d45db4f537c1b59abdf9f0b38a88a5e9641f463) — six-tool acceptance and packed-artifact smoke tests
- [`8ce0d0e`](https://github.com/robertonevarez/protocoltooling/commit/8ce0d0edc0d32c4e0f3403821c4220e6d13a8bae) — read-only host-selected event metadata
- [`6028d94`](https://github.com/robertonevarez/protocoltooling/commit/6028d9482934e7d41e27d08db8f79c79d7e773ca) — security, capability registration, agent contracts, and result semantics
- [`24bfd38`](https://github.com/robertonevarez/protocoltooling/commit/24bfd38c7b3f08be37b2b1254d1278a5d13b7128) — `@protocoltooling/fullcalendar` 0.3.0 release
- [`3449609`](https://github.com/robertonevarez/protocoltooling/commit/3449609f31fb678ceda6278dac9af962ba0fc659) — live demo exposed at `protocoltooling.com/demo`

The companion demo repository contains the judge-facing FullCalendar surface and its human/agent mutation feedback:

https://github.com/robertonevarez/protocoltooling-demo

## Local verification

```bash
npm install
npm run build:lib
npm test
npm run typecheck
npm run lint
npm run test:pack
npm run docs:build
```

The package is MIT licensed. The challenge submission should use this repository as the primary public source repository because it contains the WebMCP registration and tool implementation.
