# Protocol Tooling (Core Infrastructure)

> Agent-native scheduling infrastructure for service businesses, exposed through WebMCP.

This repository is the canonical core implementation of **Protocol Tooling**. It provides the deterministic domain logic, booking service, availability engine, multi-resource constraints, service-area boundaries, PostgreSQL persistence layer, REST API, and WebMCP tool registration lifecycle for personal AI agents.

Reference business pages at `/businesses/[slug]` are the challenge runtime: real WebMCP Site Tools for ChatGPT, plus a human-only “See how AI booking works” walkthrough for visitors without Site Tools.

Related marketing/showcase work lives in [robertonevarez/protocoltooling-demo](https://github.com/robertonevarez/protocoltooling-demo); it is not the agent booking surface.

For the accurate agent flow and tool semantics, see [docs/challenge-architecture.md](docs/challenge-architecture.md).

---

## Architecture

```text
Browser / Personal Agent (ChatGPT Site Tools / WebMCP)
        ↓  document.modelContext.registerTool()
/businesses/[slug] (dual-surface reference pages)
        ↓
Next.js API Routes (/api/businesses/[slug]/*)
        ↓
BookingService (Application Layer)
        ↓
Domain Scheduler & Multi-Resource Constraints (Pure TS Engine)
        ↓
PostgreSQL Persistence
```

---

## Capabilities & WebMCP Tools

Every business page (`/businesses/[slug]`) registers 8 standardized WebMCP tools into the browser agent runtime:

| Tool Name | Type | Purpose |
|-----------|------|---------|
| `get_business_info` | Read-only | Business profile, hours, timezone, and coverage |
| `get_services` | Read-only | Service catalog with pricing and constraints |
| `check_service_eligibility` | Read-only | Postal code / property eligibility against business rules |
| `check_availability` | Read-only | Viable appointment slots across resources and hours |
| `request_appointment` | Mutation | Creates a persisted appointment **request** (idempotent; not an auto-confirmed book) |
| `get_appointment` | Read-only | Retrieves booking details and status by appointment ID |
| `reschedule_appointment` | Mutation | Moves an appointment to a new slot |
| `cancel_appointment` | Mutation | Cancels an appointment and releases resources |

---

## Seeded Archetypes & Reference Endpoints

The repository includes pre-configured reference businesses representing diverse service scheduling archetypes:

- **Field Service / Cleaning (`marias-cleaning`):** Multi-cleaner residential dispatch with El Paso service-area eligibility (WebMCP challenge reference).
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

Visit [http://localhost:3000](http://localhost:3000) for the developer overview and [http://localhost:3000/businesses](http://localhost:3000/businesses) for seeded reference businesses.

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
│   ├── businesses/[slug]/        # Dual-surface reference business pages
│   ├── layout.tsx
│   └── page.tsx                  # Core developer overview
├── components/
│   ├── business-product-overview.tsx
│   ├── business-agent-actions.tsx    # Book with ChatGPT + human demo CTAs
│   ├── chatgpt-booking-guide.tsx
│   ├── ai-booking-demo.tsx
│   ├── webmcp-inspect-panel.tsx      # Opt-in technical diagnostics
│   ├── webmcp-business-provider.tsx
│   └── webmcp-registrar.tsx
├── db/
│   ├── client.ts
│   ├── repository.ts
│   ├── mappers.ts
│   ├── init.ts
│   └── seed.ts
├── domain/
│   ├── scheduler.ts
│   ├── search.ts
│   ├── types.ts
│   └── errors.ts
├── services/
│   └── booking-service.ts
└── webmcp/
    ├── tools.ts
    └── lifecycle.ts
docs/                             # Technical briefs and architecture documentation
db/migrations/
scripts/
tests/
```

---

## Related Repositories

- **Marketing / showcase:** [robertonevarez/protocoltooling-demo](https://github.com/robertonevarez/protocoltooling-demo) — Separate visual/marketing materials. This repository hosts the challenge runtime and dual-surface business pages.

---

## License

MIT — see [LICENSE](LICENSE).
