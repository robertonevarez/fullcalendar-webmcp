# Protocol Tooling (Core Infrastructure)

> Agent-native scheduling infrastructure for service businesses, exposed through WebMCP.

This repository is the canonical core implementation of **Protocol Tooling**. It provides the deterministic domain logic, booking service, availability engine, multi-resource constraints, service-area boundaries, PostgreSQL persistence layer, REST API, and WebMCP tool registration lifecycle for personal AI agents.

Looking for the interactive product showcase and visual demo? See [robertonevarez/protocoltooling-demo](https://github.com/robertonevarez/protocoltooling-demo).

---

## Architecture

```text
Browser / Personal Agent (ChatGPT / Chrome WebMCP)
        ↓  WebMCP document.modelContext.registerTool()
Vercel-hosted Next.js API Routes (/api/businesses/[slug]/*)
        ↓
BookingService (Application Layer)
        ↓
Domain Scheduler & Multi-Resource Constraints (Pure TS Engine)
        ↓
PostgreSQL Persistence (PlanetScale PgBouncer / Transaction Isolation)
```

---

## Capabilities & WebMCP Tools

Every business endpoint (`/businesses/[slug]`) registers 8 standardized WebMCP tools directly into the browser agent runtime:

| Tool Name | Type | Purpose |
|-----------|------|---------|
| `search_services` | Read-only | Deterministic keyword and semantic service discovery |
| `get_service_details` | Read-only | Returns service metadata, duration, price, and location policy |
| `check_service_area` | Read-only | Validates postal code eligibility against service area rules |
| `get_availability` | Read-only | Generates conflict-free viable appointment slots |
| `create_appointment` | Mutation | Atomically books appointment with idempotency & re-validation |
| `get_appointment` | Read-only | Retrieves booking details and status by appointment ID |
| `reschedule_appointment` | Mutation | Atomically moves an appointment to a new slot |
| `cancel_appointment` | Mutation | Cancels an appointment and releases resource allocations |

---

## Seeded Archetypes & Reference Endpoints

The repository includes pre-configured reference businesses representing diverse service scheduling archetypes:

- **Field Service / HVAC (`acme-hvac`):** Single resource dispatch with geographic postal code validation (Austin TX 78701 eligible, 90210 outside service area).
- **Field Service / Plumbing (`blue-pipe-plumbing`):** Residential service dispatch with emergency routing.
- **Salon / Provider (`northline-salon`):** Provider-centric booking with no geographic restriction.
- **Healthcare / Physical Therapy (`harbor-physical-therapy`):** Multi-resource scheduling (Licensed Physical Therapist + Private Treatment Room).
- **Auto Service (`mesa-auto-service`):** Multi-resource co-allocation (Certified Technician + Hydraulic Service Bay).

---

## Quick Start

### 1. Installation

```bash
npm install
```

### 2. Environment Setup

```bash
cp .env.example .env.local
# Set DATABASE_URL to your PostgreSQL connection string (PlanetScale or local)
```

### 3. Database Migration & Seeding

```bash
npm run db:migrate
npm run db:seed
```

### 4. Start Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) for the developer overview and [http://localhost:3000/docs](http://localhost:3000/docs) for the full WebMCP tool specifications.

---

## Testing & Verification

Run the comprehensive domain and integration test suite:

```bash
npm test
```

### Test Coverage

- **Domain Schedulers:** Resource allocation, multi-resource constraints, slot generation, buffer times, timezone handling.
- **Service Area & Search:** Negative postal code rejections, keyword relevance, prefix matching.
- **WebMCP Tool Contract:** Schema compliance, execution wrappers, error serialization.
- **Concurrency & Idempotency:** Concurrent creates/cancels/reschedules, duplicate idempotency key reuse across businesses.
- **Remediation:** Business isolation, cross-tenant scoping, error propagation.

---

## Repository Structure

```text
src/
├── app/
│   ├── api/businesses/[slug]/    # REST API endpoints for WebMCP tools
│   ├── businesses/[slug]/        # Minimal reference WebMCP integration page
│   ├── docs/                     # WebMCP tool specifications
│   ├── layout.tsx
│   └── page.tsx                  # Core developer overview
├── components/
│   ├── webmcp-business-provider.tsx # React Context provider for WebMCP
│   ├── webmcp-registrar.tsx         # Page lifecycle registration hook
│   └── webmcp-status.tsx            # Developer diagnostics panel
├── db/
│   ├── client.ts                 # PostgreSQL connection pool (pg)
│   ├── repository.ts             # Atomic queries, advisory locking, transactions
│   ├── mappers.ts                # Database row to domain type mappers
│   ├── init.ts                   # Schema initialization
│   └── seed.ts                   # Seed data loader
├── domain/
│   ├── scheduler.ts              # Pure scheduling algorithms & slot generation
│   ├── search.ts                 # Service search and ranking
│   ├── types.ts                  # Pure domain types (Business, Service, Resource, Slot)
│   └── errors.ts                 # Structured error codes and AppError class
├── services/
│   └── booking-service.ts        # Application service layer
└── webmcp/
    ├── tools.ts                  # WebMCP tool definitions and execution handlers
    └── lifecycle.ts              # Browser registration and polling lifecycle
docs/                             # Technical briefs and architecture documentation
db/migrations/                    # SQL schema migrations
scripts/                          # Migration and seeding CLI scripts
tests/                            # Vitest domain, contract, and e2e tests
```

---

## Related Repositories

- **Demo & Frontend Showcase:** [robertonevarez/protocoltooling-demo](https://github.com/robertonevarez/protocoltooling-demo) — Interactive walkthrough, animated AI agent simulation, visual overlay, and marketing landing page.

---

## License

MIT — see [LICENSE](LICENSE).
