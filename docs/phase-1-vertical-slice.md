# Phase 1 Vertical Slice

## Architecture

```
/businesses/{slug}  →  WebMCPStatus (client)
                     →  registerBusinessTools()
                     →  fetch /api/... 
                     →  BookingService
                     →  scheduler + search (domain)
                     →  SQLite (better-sqlite3)
```

WebMCP callbacks are thin: they POST to same-origin API routes. Domain logic lives in `src/domain/` and is tested without a browser.

## Business context scoping

**Decision:** Each business exposes tools on its own page at `/businesses/{slug}`. Tool descriptions include the business name, and API routes are namespaced under `/api/businesses/{slug}/...`, including appointment retrieval, reschedule, and cancel at `/api/businesses/{slug}/appointments/...`.

This avoids forcing `business_id` on every tool call while keeping catalog and availability operations unambiguous.

## Generic domain model

| Entity | Role |
|--------|------|
| `Business` | Timezone, location mode, hours, address |
| `Service` | Duration, price, keywords, location/service-area flags, resource requirements |
| `Resource` | Human or physical asset with capabilities and hours |
| `ServiceAreaZone` | Postal codes for field-service eligibility |
| `BlockedTime` | Resource unavailability |
| `Appointment` | Confirmed/cancelled booking |
| `AppointmentResource` | Many-to-many allocation (technician + bay + room) |
| `SlotToken` | Short-lived serialized slot for revalidation |

No vertical-specific scheduler branches exist. Differences are expressed through seed configuration:

- `service_area_required` and `location_policy`
- `resource_requirements` (count, type, capability)
- Resource capabilities and hours

## Multi-resource allocation

Services declare `resource_requirements` as an ordered list of `{ resource_type, quantity, capability? }`.

The scheduler:

1. Iterates candidate start times in 15-minute steps within business hours.
2. For each requirement, selects available resources matching type/capability.
3. Verifies no overlap with appointments or blocked periods for the full service duration.
4. Emits a deterministic `slot_id` hash from service, start time, and resource IDs.

`create_appointment` and `reschedule_appointment` revalidate the slot token and assert resources remain free inside a SQLite transaction before writing.

## Scheduling algorithm

```
candidate start time
  → business open for full duration?
  → time_preference match?
  → all resource roles satisfiable?
  → each resource free?
  → emit slot + persist slot_token (30 min TTL)
```

## Five seeded businesses

| Business | Validates |
|----------|-----------|
| Acme Heating & Air | Field service, HVAC capabilities, service area, after-4 PM slots |
| Blue Pipe Plumbing | Different capability set, separate service area |
| Northline Salon | Provider-only, no service area, stylist hours |
| Harbor Physical Therapy | Provider + treatment room |
| Mesa Auto Service | Technician + service bay compound allocation |

## WebMCP tool surface

Exact names match Phase 1 spec (aligned with Phase 0 semantics):

| Tool | readOnlyHint |
|------|----------------|
| `search_services` | true |
| `get_service_details` | true |
| `check_service_area` | true |
| `get_availability` | true |
| `create_appointment` | false |
| `get_appointment` | true |
| `reschedule_appointment` | false |
| `cancel_appointment` | false |

## Idempotency

Write tools require `idempotency_key`. Keys are scoped as `operation:businessSlug:idempotency_key` so the same client key can safely be reused across create, reschedule, and cancel without returning a stale response from a different operation.

No `requestUserInteraction()` — agent-side confirmation is expected per Phase 0.

## Error taxonomy

`BUSINESS_NOT_FOUND`, `SERVICE_NOT_FOUND`, `OUTSIDE_SERVICE_AREA`, `LOCATION_REQUIRED`, `INVALID_TIME_RANGE`, `NO_AVAILABILITY`, `SLOT_UNAVAILABLE`, `RESOURCE_UNAVAILABLE`, `APPOINTMENT_NOT_FOUND`, `APPOINTMENT_NOT_RESCHEDULABLE`, `APPOINTMENT_ALREADY_CANCELLED`, `VALIDATION_ERROR`, `INTERNAL_ERROR`

Retryable: `NO_AVAILABILITY`, `SLOT_UNAVAILABLE`, `RESOURCE_UNAVAILABLE`, `INTERNAL_ERROR`

## Persistence

- **Store:** SQLite via `better-sqlite3`
- **Path:** `data/schedulemcp.db`
- **Why:** Smallest persistent datastore with transactional guarantees and no external service for challenge demo

## Local development

```bash
npm install
npm run dev
npm test
```

Reset seed data: `npm run seed`

## Manual WebMCP verification

**Not performed in CI/automation environment** (no ChatGPT in-app browser or flagged Chrome in this build agent).

Recommended manual steps:

1. Enable WebMCP in Chrome or use ChatGPT in-app browser.
2. Open `/businesses/acme-hvac`.
3. Confirm eight tools appear in Model Context Tool Inspector.
4. Run HVAC flow (search → area → availability → create).
5. Repeat on `/businesses/northline-salon` or `/businesses/mesa-auto-service`.

Document results in submission demo video.

## Could a sixth business be added via seed/config only?

**Yes**, for businesses that fit the same primitives:

- Single or multi resource requirements by type + capability
- Optional service-area postal lists
- Business/provider hours and blocked time
- Customer-location vs business-location services

You would **not** need scheduler changes unless the new business introduced a constraint outside this model (e.g. travel-time routing, recurring series, or capacity pools beyond per-resource calendars). Overlapping resource requirements (e.g. generic stylist + color-specialist stylist from the same pool) are handled by deterministic backtracking in the allocator.

## Known limitations

- Slot tokens expire after 30 minutes; no separate `hold_slot` tool
- Time preference parsing is heuristic (`morning`, `afternoon`, `after HH:MM`)
- No authentication (anonymous demo)
- No payments, notifications, or admin UI
- `zonedDateTimeToUtc` uses offset probing — adequate for demo timezones

## Phase 2 recommendations

- Deploy to HTTPS (Vercel/Render) for judge testing
- Record demo video with ChatGPT in-app browser
- Optional in-page confirmation modal for consequential tools
- Pagination for large slot lists
- Judge test account if auth added
