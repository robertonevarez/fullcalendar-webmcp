# Product demo (`/demo`)

## Experience

`/demo` shows two surfaces with space between them:

- **Left:** a simple business website (human surface)
- **Right:** the customer’s personal AI agent (native shadcn chat)

When the customer sends a request, an **agent cursor** travels from the conversation into the website. The website briefly reveals a contextual **agent capability layer** driven by real demo orchestration. After the operations complete, the cursor returns and the agent replies with the same truth.

Default story: **Acme Heating & Air**. Salon / Auto remain subtle secondary examples.

## Human vs agent surface

| Surface | What you see |
| --- | --- |
| Human | Ordinary business website |
| Agent | Structured capabilities (`Search services`, `Check service area`, …) revealed only while the agent is accessing the site |
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
- Reset / switching examples clears session state

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
