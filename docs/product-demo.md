# Product demo (`/demo`)

## Isolation strategy

Anonymous demo state is **ephemeral and client-held**.

- The browser keeps the demo business configuration and conversation appointments in React state.
- Each `/api/demo/turn` request is **stateless**: it receives the full config + appointments, runs real domain scheduling in memory, and returns the next conversation state.
- Nothing is written to Postgres.
- Seeded businesses (`acme-hvac`, etc.) are never mutated.
- Sessions cannot leak across users because there is no shared demo store.
- Refresh or **Reset demo** clears local state and starts over.

## Architecture

```
Demo form config
    → normalizeDemoConfig()
    → DemoBookingEngine
         → domain searchServices / checkServiceArea / findAvailability / revalidateSlot
    → conversation orchestration (deterministic intent)
    → appointment objects held only in the client session
```

Natural-language interpretation is simplified and deterministic.
Business truth (prices, hours, area, availability, bookings) always comes from the real Protocol Tooling domain layer.
