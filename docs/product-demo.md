# Product demo (`/demo`)

## Experience

`/demo` shows three surfaces:

- **Top left:** ordinary business website (human surface)
- **Bottom left:** Agent activity (structured capabilities / WebMCP operations)
- **Right:** the customer’s personal AI agent (native shadcn chat)

When the customer sends a request, an **agent cursor** travels:

conversation → storefront → agent activity (real operations) → conversation

After confirmation, a second trip appends **Create appointment**, and the storefront shows a small booking consequence.

Default story: **Acme Heating & Air**. Other presets remain in code/tests but are not primary UI switches.

## Human vs agent surface

| Surface | What you see |
| --- | --- |
| Human | Ordinary business website |
| Agent | Progressive Agent activity (`Search services`, `Check service area`, …) |
| Customer | Personal agent conversation |

Protocol Tooling enables the agent surface without turning the human website into an agent UI.

## Visual events

Visual steps come from the same `/api/demo/turn` orchestration that produces the reply (`activity[]` with `target` + `result`). There is no separate fake animation timeline.

## Isolation

Anonymous demo state is **ephemeral and client-held**.

- Config + appointments live in React state
- Each `/api/demo/turn` request is **stateless**
- Nothing is written to Postgres
- Seeded businesses are never mutated
- Reset clears session state

## Architecture

```
Demo preset (DemoConfig)
    → normalizeDemoConfig()
    → DemoBookingEngine
         → domain searchServices / checkServiceArea / findAvailability / revalidateSlot
    → conversation orchestration (deterministic intent)
    → activity steps (visual events) + reply
    → client visual sequence → then agent reply
```

## Real vs representative

**Real:** services, prices, eligibility, availability, scheduling, appointment creation, orchestration activity.

**Representative:** animated agent cursor, embedded personal-agent chat, email “would be sent”.

This browser demo visualizes the model. `/businesses/acme-hvac` exposes actual WebMCP tools.
