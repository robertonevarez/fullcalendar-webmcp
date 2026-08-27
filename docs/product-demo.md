# Product demo (`/demo`)

## Experience

`/demo` is a **single side-by-side surface** — not a wizard or configurator.

- **Left:** read-only business truth from a curated preset
- **Right:** customer conversation visualization (personal agent, not a Protocol Tooling chatbot)
- **Presets:** Acme Heating & Air (field + ZIP area), Northline Salon (on-site), Mesa Auto Service (technician + bay)

Pick a preset, send the example prompt (or type your own), confirm a slot, and see the appointment appear on the business side.

## Isolation strategy

Anonymous demo state is **ephemeral and client-held**.

- The browser keeps the selected preset config and conversation appointments in React state.
- Each `/api/demo/turn` request is **stateless**: it receives the full config + appointments, runs real domain scheduling in memory, and returns the next conversation state.
- Nothing is written to Postgres.
- Seeded businesses (`acme-hvac`, etc.) are never mutated.
- Switching presets or **Reset demo** clears conversation state for that session.
- Sessions cannot leak across users because there is no shared demo store.

## Architecture

```
Demo preset (DemoConfig)
    → normalizeDemoConfig()
    → DemoBookingEngine
         → domain searchServices / checkServiceArea / findAvailability / revalidateSlot
    → conversation orchestration (deterministic intent)
    → appointment objects held only in the client session
```

Natural-language interpretation is simplified and deterministic.
Business truth (prices, hours, area, availability, bookings) always comes from the real Protocol Tooling domain layer.
