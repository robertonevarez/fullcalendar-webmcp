# Product demo (`/demo`)

## Experience

`/demo` is a **single product demonstration** with two surfaces — not a wizard, configurator, or playground.

- **Left (~40%): Protocol Tooling** — business truth, agent capabilities, live operations, and booking consequence in a shadcn `Card`
- **Right (~60%): Customer’s agent** — conversation in a matching shadcn `Card` (`MessageScroller` / `Message` / `Bubble` / `Empty` / `InputGroup`), installed from source

Default story is **Acme Heating & Air**. Salon and Auto examples are available as a small secondary control under the demo frame.

Send the example prompt (or type your own), confirm a slot, and watch live operations plus the new appointment appear on the Protocol Tooling side.

## UI notes

- Native shadcn conversation appearance is retained (no custom bubble/message CSS).
- Surrounding page chrome follows Protocol Tooling’s existing design system.
- This browser demo visualizes the experience; `/businesses/acme-hvac` exposes the real WebMCP tools.

## Isolation strategy

Anonymous demo state is **ephemeral and client-held**.

- The browser keeps the selected preset config and conversation appointments in React state.
- Each `/api/demo/turn` request is **stateless**: it receives the full config + appointments, runs real domain scheduling in memory, and returns the next conversation state plus concise live-operation activity.
- Nothing is written to Postgres.
- Seeded businesses (`acme-hvac`, etc.) are never mutated.
- Switching examples or **Reset** clears conversation state for that session.
- Sessions cannot leak across users because there is no shared demo store.

## Architecture

```
Demo preset (DemoConfig)
    → normalizeDemoConfig()
    → DemoBookingEngine
         → domain searchServices / checkServiceArea / findAvailability / revalidateSlot
    → conversation orchestration (deterministic intent)
    → activity steps + appointment objects held only in the client session
```

Natural-language interpretation is simplified and deterministic.
Business truth (prices, hours, area, availability, bookings) always comes from the real Protocol Tooling domain layer.
