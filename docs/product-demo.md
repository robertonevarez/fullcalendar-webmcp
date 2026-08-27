# Product demo (`/demo`)

## Experience

`/demo` shows three deliberately different surfaces:

- **Top left:** a believable, dated small-business website (human surface)
- **Bottom left:** a precise `protocol-tooling://agent` terminal (structured capabilities)
- **Right:** the customer's modern personal AI agent (native shadcn chat)

The contrast is intentional. The business website does not need to be designed for an agent. The agent crosses that surface briefly, then uses the structured capabilities underneath it instead of clicking through the human UI.

When the customer sends a request, the **agent cursor** travels:

conversation → business website → terminal (real operations) → conversation

After confirmation, a second trip appends `create_appointment`, and the human website shows a small booking consequence.

## Interaction model

The guided conversation starts with ambiguous intent rather than a pre-filled booking request. The agent offers a sensible next step, asks only for the missing ZIP when the selected service needs a customer location, and waits for permission before checking availability. Grouped read operations can search the configured services and verify eligibility in one website visit; availability is a separate read, and appointment creation requires a final confirmation after the customer chooses a slot.

The embedded conversation and its constrained natural-language interpretation are deterministic and representative. Services, pricing, durations, service-area results, availability, appointment creation, and scheduling rules remain real and configuration-driven. The cursor only moves when a business capability is being accessed.

## Storefront mocks

The demo includes three curated configurations. The default is **Acme Heating & Air**. The other mocks can be reviewed with URL deep links:

- `/demo` — Acme Heating & Air, deliberately dated HVAC site with Comic Sans/system fallback
- `/demo?preset=northline-salon` — Northline Salon, dated boutique salon site with pale pink styling and cursive headings
- `/demo?preset=mesa-auto` — Mesa Auto Service, dense black/red/yellow auto-service site

Each composition is archetype-specific rather than a profile-card template. Business names, service names, prices, durations, hours, service area, staff, and booking consequences come from the selected `DemoConfig` and real turn response. Presentational copy is generic and does not add unsupported operational claims.

## Terminal

The terminal is a semantic live log with monospace text and no terminal dependency. It renders the `activity[]` returned by the same `/api/demo/turn` orchestration that produces the customer reply:

```text
protocol-tooling://agent

> search_services
  query: "AC cooling upstairs"
✓ AC Diagnostic Visit
  $89.00 · 90 min
```

Tool identifiers are intentionally prominent in this surface. Inputs and results are still rendered only when present in the real activity event. Outside-area failures stop before availability, and create actions appear only after the confirmation gate.

## Isolation

Anonymous demo state is **ephemeral and client-held**.

- Config + appointments live in React state
- Each `/api/demo/turn` request is **stateless**
- Nothing is written to Postgres or shared server state
- Seeded businesses are never mutated
- Reset and preset changes remount the demo session

## Architecture

```
Demo preset (DemoConfig)
    → normalizeDemoConfig()
    → DemoBookingEngine
         → domain searchServices / checkServiceArea / findAvailability / revalidateSlot
    → conversation orchestration (deterministic intent)
    → activity steps (visual events) + reply
    → client visual sequence → terminal + chat reply
```

## Human vs agent surface

| Surface | What you see |
| --- | --- |
| Human | Dated external business website with ordinary human links/CTAs |
| Agent | Technical terminal with real tool names and structured results |
| Customer | Personal agent conversation |

Human CTAs are ordinary anchors for realism. They have no agent target and are never used by the cursor or orchestration.

## Real vs representative

**Real:** services, prices, durations, eligibility, availability, scheduling, appointment creation, orchestration activity, and booking notice data.

**Representative:** animated agent cursor, embedded personal-agent chat, and email “would be sent”.

Production WebMCP behavior remains on `/businesses/{slug}` and is unchanged by the product demo presentation layer.
