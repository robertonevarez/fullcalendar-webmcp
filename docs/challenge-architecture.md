# Protocol Tooling — WebMCP Challenge Architecture

## 1. Product Thesis

Protocol Tooling is **agent-native capability infrastructure** for real-world service businesses. It provides structured protocols and schemas enabling personal AI agents (such as ChatGPT with Site Tools / WebMCP) to interact directly with businesses.

### The Agent-First Flow

```
User: "I need a deep cleaning next Tuesday afternoon in 79901."
  ↓
ChatGPT Desktop Browser navigates to /businesses/marias-cleaning
  ↓
Browser discovers registered WebMCP tools (document.modelContext)
  ↓
Agent executes:
  1. get_services() → Discovers Deep Cleaning ($180, 180 min)
  2. check_service_eligibility({ service_id: 'svc_deep_cleaning', postal_code: '79901' }) → Validates El Paso service territory
  3. check_availability({ service_id: 'svc_deep_cleaning', start_date: '2026-09-01', end_date: '2026-09-01' }) → Retrieves available slots
  ↓
Agent reasons & informs user: "Maria has 1:00 PM and 3:30 PM available on Tuesday."
  ↓
User: "Request the 3:30 PM slot."
  ↓
Agent executes:
  4. request_appointment({ service_id: 'svc_deep_cleaning', slot_id: '...', customer: { ... }, idempotency_key: '...' })
  ↓
Persisted appointment created with assigned professional (Maria Lopez)
```

---

## 2. Architectural Separation

Protocol Tooling maintains strict boundaries between domain logic, capability abstractions, and transport adapters:

```
┌────────────────────────────────────────────────────────┐
│                  Protocol Tooling Core                 │
│  - Domain models (Business, Service, Resource, Slot)   │
│  - Scheduling Engine (Backtracking resource allocator) │
│  - Idempotency & Concurrency Locks (PostgreSQL / ACID) │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│                   Capability Layer                     │
│  - BusinessCapabilities interface                      │
│  - Structured Business & Service metadata              │
│  - Eligibility & Constraint evaluation                 │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│                    WebMCP Adapter                      │
│  - document.modelContext.registerTool()                │
│  - Strict JSON schemas & readOnlyHint annotations      │
│  - Document-scoped business identity protection        │
│  - AbortSignal lifecycle & unregistration              │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│              Hosted Reference Business App             │
│  - Understated structured business endpoints           │
│  - Maria's Cleaning Service (/businesses/marias-cleaning)
│  - Progressive enhancement (100% works without WebMCP) │
└────────────────────────────────────────────────────────┘
```

---

## 3. Why a Hosted Web App for the Challenge

- **Native WebMCP Standard**: Native WebMCP (`document.modelContext`) is document-scoped and executes client-side within the browser context of the active webpage.
- **OpenAI WebMCP Challenge Alignment**: The challenge expects a working, hosted web application that personal AI agents can navigate to and inspect.
- **Not a SaaS Destination**: The hosted reference web app serves as a reference implementation proving agent capabilities. Protocol Tooling's long-term capability layer is protocol-agnostic (supporting WebMCP, MCP, browser provider APIs, and platform integrations).

---

## 4. Native WebMCP Capability Suite

| Tool | Purpose | Annotations | Side Effects | Underlying Service |
|------|---------|-------------|--------------|--------------------|
| `get_business_info` | Returns business profile, operating hours, timezone, and coverage territory | `readOnlyHint: true` | None | `bookingService.getBusinessInfo` |
| `get_services` | Returns structured service catalog with transparent pricing and constraints | `readOnlyHint: true` | None | `bookingService.getServices` |
| `check_service_eligibility` | Evaluates customer postal code and property constraints against business rules | `readOnlyHint: true` | None | `bookingService.checkServiceEligibility` |
| `check_availability` | Computes viable appointment slots across staff availability and working hours | `readOnlyHint: true` | None | `bookingService.checkAvailability` |
| `request_appointment` | Atomically creates and persists an appointment request with idempotency protection | `readOnlyHint: false` | Mutation / Resource lock | `bookingService.requestAppointment` |
| `get_appointment` | Inspects status and details of an existing appointment | `readOnlyHint: true` | None | `bookingService.getAppointment` |
| `reschedule_appointment` | Re-allocates provider resources and updates appointment times | `readOnlyHint: false` | Mutation / Re-allocation | `bookingService.rescheduleAppointment` |
| `cancel_appointment` | Cancels appointment and releases allocated resources back to pool | `readOnlyHint: false` | Mutation / Release | `bookingService.cancelAppointment` |

---

## 5. Persistence & Duplicate Request Protection

All mutations (`request_appointment`, `reschedule_appointment`, `cancel_appointment`) enforce:
1. **Scoped Idempotency**: Keys are scoped to `(operation, businessSlug, idempotency_key)` preventing cross-business or cross-operation collisions.
2. **Transaction Isolation**: Row-level locking (`SELECT ... FOR UPDATE`) serializes concurrent booking, rescheduling, and cancellation attempts.
3. **Deterministic Slot Tokens**: Slot IDs are cryptographically hashed from `(serviceId, startUtc, resourceIds)` and validated on booking.

---

## 6. Ambient Bridge Research Preservation

Prior experiments exploring browser-extension based bridging (`experiments/ambient-webmcp-bridge/`) and zero-install client proxies (`experiments/ambient-zero-install-mcp/`) are preserved as research artifacts. They are isolated from the production challenge runtime, which relies exclusively on native `document.modelContext`.
