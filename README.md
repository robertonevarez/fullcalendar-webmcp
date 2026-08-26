# ScheduleMCP

Agent-native scheduling infrastructure for service businesses, built for the [OpenAI WebMCP Challenge](https://webmcp.devpost.com/).

Personal AI agents discover and invoke structured WebMCP tools on a per-business page. The scheduling engine is generic across field service, salon, clinic, and multi-resource auto workflows.

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and choose a seeded business. Each business page registers eight WebMCP tools scoped to that business.

```bash
npm test
npm run build
npm run seed   # reset SQLite seed data
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

## Manual WebMCP testing

1. **Primary:** Open a business page in **ChatGPT's in-app browser** (WebMCP supported out of the box).
2. **Secondary:** Chrome with `chrome://flags/#enable-webmcp-testing` enabled.
3. Use the **Model Context Tool Inspector** extension to list and invoke tools.

Example HVAC demo path:

1. Visit `/businesses/acme-hvac`
2. `search_services` → `"AC not cooling"`
3. `get_service_details` → selected `service_id`
4. `check_service_area` → `78701`
5. `get_availability` → `2026-08-26`, `time_preference: "after 16:00"`
6. `create_appointment` with `slot_id`, customer, and `idempotency_key`

## Architecture

```
WebMCP registration (browser)
        ↓ fetch
Application service (BookingService)
        ↓
Scheduling domain (scheduler, search)
        ↓
SQLite persistence
```

See [docs/phase-1-vertical-slice.md](docs/phase-1-vertical-slice.md) for full design notes.

## Persistence

SQLite database at `data/schedulemcp.db` (created on first run). Appointments store multiple resources via `appointment_resources`.

## License

MIT — see [LICENSE](LICENSE).
