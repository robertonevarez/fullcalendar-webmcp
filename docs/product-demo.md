# Product demo (`/demo`)

## Purpose

`/demo` is a **self-driving, deterministic product walkthrough**.

It explains the Protocol Tooling interaction model to a passive viewer. The viewer does not participate in the conversation.

The live WebMCP-enabled business surface remains at `/businesses/{slug}` (for example `/businesses/acme-hvac`). That page is where compatible agents prove real access to exposed capabilities.

| Surface | Role |
| --- | --- |
| `/demo` | Explain the product with a controlled walkthrough |
| `/businesses/{slug}` | Prove real WebMCP agent integration |

## Experience

`/demo` shows three deliberately different surfaces:

- **Top left:** a believable, dated small-business website (human surface)
- **Bottom left:** a precise `protocol-tooling://agent` terminal (structured capabilities)
- **Right:** the customer's modern personal AI agent (native shadcn chat, playback only)

The contrast is intentional. The business website does not need to be designed for an agent. The agent crosses that surface briefly, then uses the structured capabilities underneath it instead of clicking through the human UI.

When business truth is required, the **agent cursor** travels:

conversation → business website → terminal (real operations) → conversation

## Self-driving walkthrough

After a short orientation pause (~0.5–1.2s), playback begins automatically. The viewer watches; they do not type.

A scripted simulated user feeds messages through the **same** `/api/demo/turn` interaction layer used previously:

1. `What's happening with my AC?`
2. `Yeah.`
3. `78701`
4. `Sure.`
5. `4:30`
6. `Yes.`

Agent replies, tool activity, prices, durations, eligibility, availability, and booking confirmation are produced by the existing orchestration and domain layers — not hardcoded movie frames.

There is **no editable chat composer** on `/demo`. The right-hand panel is a transcript/playback surface.

### Autoplay vs looping

- **Autoplay:** yes, once per page load / remount
- **Infinite loop:** no
- After completion, the booked state remains visible
- A restrained **Replay** control performs a clean reset and starts again

### Grouped website visits

Cursor motion happens only when business capabilities are accessed:

1. After ZIP — `search_services` + `check_service_area` (service, price, duration, eligibility)
2. After availability permission — `get_availability` (real slots)
3. After explicit booking confirmation — `create_appointment`

Purely conversational turns (guidance, consent, ZIP request, slot choice confirmation) do not move the cursor.

### Controls

- **Replay** — clean reset of transcript, terminal, appointment state, cursor, and playback
- No timeline scrubber, speed controls, step controls, or scenario editor

## Storefront mocks

The public walkthrough always uses **Acme Heating & Air**. Salon and Auto configurations remain in the codebase for architecture and tests; they are not alternate public autoplay scenarios.

Operational facts (services, prices, durations, hours, service area, staff) remain configuration-driven.

## Terminal

The terminal is a semantic live log with monospace text and no terminal dependency. It starts idle (`waiting for agent request...`) and renders `activity[]` returned by the same `/api/demo/turn` orchestration that produces the customer reply:

```text
protocol-tooling://agent

> search_services
  query: "AC cooling upstairs"
✓ AC Diagnostic Visit
  $89.00 · 90 min
```

Tool identifiers are intentionally prominent. Inputs and results are rendered only when present in the real activity event. Outside-area failures stop before availability, and create actions appear only after the confirmation gate.

## Isolation

Anonymous demo state is **ephemeral and client-held**.

- Config + appointments live in React state
- Each `/api/demo/turn` request is **stateless**
- Nothing is written to Postgres or shared server state
- Seeded businesses are never mutated
- Replay remounts the demo session and cancels pending playback work

## Architecture

```
Scripted simulated user (walkthrough driver)
    → same /api/demo/turn interaction layer
    → DemoBookingEngine → domain search / service area / availability / booking
    → real activity[] + conversational reply
    → client visual sequence → terminal + cursor + chat transcript
```

## Real vs representative

**Real:** services, prices, durations, eligibility, availability, scheduling, appointment creation, orchestration activity, and booking notice data.

**Representative:** scripted simulated user, self-driving playback, animated agent cursor, embedded personal-agent conversation UI, and email “would be sent”.

Production WebMCP behavior remains on `/businesses/{slug}` and is unchanged by the product demo presentation layer.
