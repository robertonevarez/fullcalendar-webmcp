# Devpost submission draft

## Project name

Protocol Tooling

## One-sentence description

Agent-native web infrastructure whose first domain demo lets personal AI agents discover services, check real availability, and manage appointments directly through WebMCP.

## Why WebMCP is a strong fit

Service booking is full of brittle UI: calendars, service taxonomies, address forms, and eligibility rules. Agents that scrape those UIs are slow and error-prone. WebMCP lets the business publish the same capabilities as typed tools—executed as page JavaScript with the site’s origin and APIs—while the personal agent owns conversation and confirmation.

## Better user experience

People say what they need (“AC tomorrow after 4, upstairs, 78701”) instead of operating a funnel. The agent invokes Protocol Tooling tools, presents options, confirms, and books. Business rules (service area, resources, hours) stay deterministic.

## What people and agents can do together

- Discover the right service without guessing page structure
- Enforce postal eligibility before offering slots
- Book, retrieve, reschedule, and cancel with idempotent write tools
- Share one engine across HVAC, plumbing, salon, clinic, and auto archetypes

## How WebMCP was implemented

On each `/businesses/{slug}` page, Protocol Tooling registers eight tools via `document.modelContext.registerTool`. Tool `execute` callbacks POST to same-origin API routes that call a BookingService over a generic scheduler and SQLite. Consequential tools require agent-side human confirmation and `idempotency_key` values scoped by operation and business.

## Technical implementation (short)

- Next.js App Router + Node runtime
- Domain scheduler with multi-resource backtracking allocation
- SQLite (`better-sqlite3`) on a persistent disk for production
- Five seeded verticals sharing one model

## What was difficult

Chrome’s `executeTool` path currently invokes callbacks with only the input argument. Required `{ signal }` destructuring crashed every tool until the shared wrapper treated options as optional. Expected domain failures (e.g. `OUTSIDE_SERVICE_AREA`) also had to avoid `console.error` so they would not look like runtime crashes in development.

## Impact

Protocol Tooling is a prototype of agent-native infrastructure for local services: the website explains the product; the product is the capability surface agents call. Scheduling and booking are the first domain demonstrated.

## Future direction (not in scope for the challenge)

Auth, payments, notifications, admin configuration UI, and travel-time routing.

## Links

- Repository: https://github.com/robertonevarez/schedulemcp _(GitHub rename to `protocoltooling` is a manual follow-up)_
- Live URL: https://schedulemcp.onrender.com _(Render service rename is a manual follow-up)_
- Demo video: _add YouTube URL_
