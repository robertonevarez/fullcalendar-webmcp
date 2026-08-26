# Protocol Tooling

Protocol Tooling is infrastructure for the agent-native web.

This repository demonstrates that concept through service-business scheduling and booking capabilities exposed to personal AI agents via WebMCP, built for the [OpenAI WebMCP Challenge](https://webmcp.devpost.com/).

Personal AI agents discover and invoke structured WebMCP tools on a per-business page. The scheduling engine is generic across field service, salon, clinic, and multi-resource auto workflows.

> Your customers have agents. Let them book you.

## Quick start

```bash
npm install
cp .env.example .env.local
# Set DATABASE_URL (PlanetScale :6432, or local Postgres for dev)
npm run db:migrate
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The landing page explains the product; each business page at `/businesses/{slug}` registers eight WebMCP tools.

```bash
npm test
npm run build
npm run db:seed   # intentional catalog / conflict reseed
```

## Seeded businesses

| Slug | Archetype |
|------|-----------|
| `acme-hvac` | HVAC / home services (field, service area) |
| `blue-pipe-plumbing` | Plumbing / field services |
| `northline-salon` | Salon / provider appointments |
| `harbor-physical-therapy` | Healthcare / wellness (provider + room) |
| `mesa-auto-service` | Auto service (technician + service bay) |

## WebMCP tools (per business page)

- `search_services`
- `get_service_details`
- `check_service_area`
- `get_availability`
- `create_appointment`
- `get_appointment`
- `reschedule_appointment`
- `cancel_appointment`

Business context is determined by the page URL: `/businesses/{slug}`.

## WebMCP verification status

| Path | Status |
|------|--------|
| Automated tests | Passing |
| Chrome `executeTool` lifecycle | Verified (create / get / reschedule / cancel) |
| Model Context Tool Inspector + NL agent | Verified (positive `78701`, negative `90210`) |
| ChatGPT in-app browser | Primary judge path — confirm on the deployed HTTPS URL |

### Manual testing

1. **Primary:** Open a business page in **ChatGPT's in-app browser**.
2. **Secondary:** Chrome with `chrome://flags/#enable-webmcp-testing` + Model Context Tool Inspector.
3. Visit `/businesses/acme-hvac` and try:

```text
I need someone to look at my AC tomorrow after 4.
The upstairs isn't cooling.
I'm in 78701.
Find the right service and tell me what's available.
```

Negative constraint check:

```text
I need an AC tune-up in 90210.
```

## Architecture

```
Browser / personal agent
        ↓ WebMCP
Vercel-hosted Next.js 16
        ↓
BookingService + deterministic scheduler
        ↓
PlanetScale Postgres (PgBouncer)
```

See [docs/deployment.md](docs/deployment.md), [docs/postgres-migration.md](docs/postgres-migration.md), and [docs/phase-1-vertical-slice.md](docs/phase-1-vertical-slice.md).

Developer tool reference: [/docs](/docs) when the app is running.

## Persistence & deployment

- **Canonical production:** Vercel + PlanetScale Postgres (no local filesystem dependency).
- **Live demo:** https://protocoltooling.com
- **Repository:** https://github.com/robertonevarez/protocoltooling
- **Local:** set `DATABASE_URL` to PlanetScale (preferred) or optional local Postgres for convenience; then `npm run db:migrate` and `npm run db:seed`.
- Details: [docs/deployment.md](docs/deployment.md).

## Project identity

| Surface | Canonical form |
|---------|----------------|
| Human-facing brand | **Protocol Tooling** |
| Technical identifier | `protocoltooling` |

## License

MIT — see [LICENSE](LICENSE).
