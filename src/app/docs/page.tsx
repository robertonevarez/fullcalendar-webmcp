import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'WebMCP tools',
  description: 'ScheduleMCP WebMCP capability surface for agent-native booking.',
};

const TOOLS = [
  {
    id: 'search_services',
    readOnly: true,
    purpose: 'Rank services for the current business from a free-text query.',
    args: 'Optional `query`.',
    input: '{ "query": "AC not cooling" }',
    result: '{ "ok": true, "data": { "services": [{ "service_id": "svc_ac_diagnostic", "name": "AC Diagnostic Visit", "score": 9 }] } }',
    errors: '`BUSINESS_NOT_FOUND`',
  },
  {
    id: 'get_service_details',
    readOnly: true,
    purpose: 'Return duration, price, location policy, resources, and intake fields for a `service_id`.',
    args: 'Required `service_id` from search.',
    input: '{ "service_id": "svc_ac_diagnostic" }',
    result: '{ "ok": true, "data": { "duration_minutes": 90, "price": { "amount": 8900, "currency": "USD" }, "service_area_required": true } }',
    errors: '`SERVICE_NOT_FOUND`',
  },
  {
    id: 'check_service_area',
    readOnly: true,
    purpose:
      'Validate postal eligibility for field services. Call before availability when `service_area_required` is true.',
    args: '`postal_code`, optional `service_id`.',
    input: '{ "postal_code": "78701", "service_id": "svc_ac_diagnostic" }',
    result: '{ "ok": true, "data": { "status": "eligible", "zone_id": "austin-central" } }',
    errors: '`OUTSIDE_SERVICE_AREA`, `LOCATION_REQUIRED`',
  },
  {
    id: 'get_availability',
    readOnly: true,
    purpose:
      'Return short-lived `slot_id` proposals for a date range. For area-required services, call only after eligibility.',
    args: '`service_id`, `start_date`, `end_date`; optional `postal_code`, `time_preference`, `preferred_resource_id`.',
    input:
      '{ "service_id": "svc_ac_diagnostic", "start_date": "2026-08-26", "end_date": "2026-08-26", "postal_code": "78701", "time_preference": "after 16:00" }',
    result:
      '{ "ok": true, "data": { "slots": [{ "slot_id": "slot_…", "starts_at": "…", "resources": […], "price": {…} }] } }',
    errors: '`NO_AVAILABILITY`, `OUTSIDE_SERVICE_AREA`, `LOCATION_REQUIRED`, `INVALID_TIME_RANGE`',
  },
  {
    id: 'create_appointment',
    readOnly: false,
    purpose:
      'Persist a booking from a `slot_id` after human confirmation. Revalidates area, slot, and resources.',
    args: '`service_id`, `slot_id`, `customer`, `idempotency_key`; optional `postal_code`, `notes`.',
    input:
      '{ "service_id": "svc_ac_diagnostic", "slot_id": "slot_…", "idempotency_key": "uuid", "postal_code": "78701", "customer": { "name": "Alex Morgan" } }',
    result: '{ "ok": true, "data": { "appointment_id": "appt_…", "status": "confirmed", "starts_at": "…" } }',
    errors: '`SLOT_UNAVAILABLE`, `OUTSIDE_SERVICE_AREA`, `RESOURCE_UNAVAILABLE`, `LOCATION_REQUIRED`',
  },
  {
    id: 'get_appointment',
    readOnly: true,
    purpose: 'Fetch a compact appointment summary by `appointment_id` for this business.',
    args: 'Required `appointment_id`.',
    input: '{ "appointment_id": "appt_…" }',
    result: '{ "ok": true, "data": { "status": "confirmed", "provider": "James Carter", "price": {…} } }',
    errors: '`APPOINTMENT_NOT_FOUND`',
  },
  {
    id: 'reschedule_appointment',
    readOnly: false,
    purpose: 'Move an appointment to a new `slot_id` after human confirmation.',
    args: '`appointment_id`, `new_slot_id`, `idempotency_key`.',
    input: '{ "appointment_id": "appt_…", "new_slot_id": "slot_…", "idempotency_key": "uuid" }',
    result: '{ "ok": true, "data": { "appointment_id": "appt_…", "starts_at": "…" } }',
    errors: '`SLOT_UNAVAILABLE`, `APPOINTMENT_NOT_RESCHEDULABLE`, `RESOURCE_UNAVAILABLE`',
  },
  {
    id: 'cancel_appointment',
    readOnly: false,
    purpose: 'Cancel an appointment and release resource allocations after human confirmation.',
    args: '`appointment_id`, `idempotency_key`; optional `reason`.',
    input: '{ "appointment_id": "appt_…", "idempotency_key": "uuid", "reason": "customer_request" }',
    result: '{ "ok": true, "data": { "status": "cancelled", "appointment_id": "appt_…" } }',
    errors: '`APPOINTMENT_NOT_FOUND`',
  },
] as const;

export default function DocsPage() {
  return (
    <div className="docs-layout">
      <nav className="docs-nav" aria-label="Docs sections">
        <a href="#overview">Overview</a>
        <a href="#flow">Canonical flow</a>
        {TOOLS.map((tool) => (
          <a key={tool.id} href={`#${tool.id}`}>
            {tool.id}
          </a>
        ))}
        <Link href="/businesses/acme-hvac">Open HVAC demo</Link>
      </nav>

      <article className="docs-content">
        <h1 id="overview">WebMCP tools</h1>
        <p>
          Each business page registers eight tools on <code>document.modelContext</code>. Catalog and
          mutations are scoped to <code>/businesses/&#123;slug&#125;</code>. Write tools require an{' '}
          <code>idempotency_key</code> and should run only after the agent obtains human confirmation.
        </p>

        <h2 id="flow">Canonical HVAC flow</h2>
        <p>
          User: “I need someone to look at my AC tomorrow after 4. I&apos;m in 78701.”
        </p>
        <pre>{`search_services
  → get_service_details
  → check_service_area
  → get_availability
Agent: "4:30 PM is available. Diagnostic is $89. Book it?"
Human: "Yes."
  → create_appointment
Later: reschedule_appointment / cancel_appointment`}</pre>

        {TOOLS.map((tool) => (
          <section key={tool.id} id={tool.id}>
            <h2>
              <code>{tool.id}</code>{' '}
              <span className={`badge ${tool.readOnly ? 'badge-read' : 'badge-write'}`}>
                {tool.readOnly ? 'read-only' : 'consequential'}
              </span>
            </h2>
            <p>{tool.purpose}</p>
            <h3>Arguments</h3>
            <p>{tool.args}</p>
            <h3>Example input</h3>
            <pre>{tool.input}</pre>
            <h3>Example result</h3>
            <pre>{tool.result}</pre>
            <h3>Common errors</h3>
            <p>{tool.errors}</p>
          </section>
        ))}
      </article>
    </div>
  );
}
