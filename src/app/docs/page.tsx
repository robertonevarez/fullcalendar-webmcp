import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeftIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'WebMCP Capability Specifications',
  description: 'Technical reference for Protocol Tooling native WebMCP tools, schemas, and capability contracts.',
};

const TOOLS = [
  {
    name: 'get_business_info',
    summary: 'Authoritative Business & Territory Profile',
    readOnly: true,
    description:
      'Returns authoritative business information including operational timezone, location, service territory postal codes, contact details, operating hours, and active capability IDs.',
    inputSchema: `{
  "type": "object",
  "properties": {}
}`,
    outputExample: `{
  "ok": true,
  "data": {
    "business_id": "marias-cleaning",
    "slug": "marias-cleaning",
    "name": "Maria's Cleaning Service",
    "category": "residential_cleaning",
    "timezone": "America/Denver",
    "location": {
      "city": "El Paso",
      "state": "TX",
      "postal_code": "79902"
    },
    "service_area": ["79901", "79902", "79905", "79912", "79925", "79936"],
    "capabilities": ["svc_standard_cleaning", "svc_deep_cleaning", "svc_move_out_cleaning"]
  }
}`,
  },
  {
    name: 'get_services',
    summary: 'Structured Catalog & Offerings',
    readOnly: true,
    description:
      'Returns the business service catalog with transparent pricing, duration, dispatch policies, and intake requirements. Accepts an optional keyword filter.',
    inputSchema: `{
  "type": "object",
  "properties": {
    "query": { "type": "string", "description": "Optional search text or service category" }
  }
}`,
    outputExample: `{
  "ok": true,
  "data": {
    "services": [
      {
        "id": "svc_deep_cleaning",
        "name": "Deep Cleaning",
        "description": "Thorough, top-to-bottom scrub covering baseboards, appliance exteriors, and sanitation.",
        "duration_minutes": 180,
        "price": { "type": "fixed", "amount": 18000, "currency": "USD" },
        "location_policy": "CUSTOMER",
        "service_area_required": true
      }
    ]
  }
}`,
  },
  {
    name: 'check_service_eligibility',
    summary: 'Territory & Job Constraints Validation',
    readOnly: true,
    description:
      'Evaluates customer location and property parameters (postal code, bedrooms, bathrooms) against business constraints before calendar availability is queried.',
    inputSchema: `{
  "type": "object",
  "properties": {
    "service_id": { "type": "string" },
    "postal_code": { "type": "string" },
    "property_type": { "type": "string" },
    "bedrooms": { "type": "number" },
    "bathrooms": { "type": "number" }
  },
  "required": ["service_id"]
}`,
    outputExample: `{
  "ok": true,
  "data": {
    "eligible": true,
    "service_id": "svc_deep_cleaning",
    "service_name": "Deep Cleaning",
    "requirements": ["Access to property with working water and electricity"],
    "reason": null,
    "zone_id": "zone_el_paso_metro"
  }
}`,
  },
  {
    name: 'check_availability',
    summary: 'Timezone-Aware Candidate Slot Generation',
    readOnly: true,
    description:
      'Calculates valid, unallocated appointment windows across staff schedules, working hours, and blocked times. Each slot includes an atomic tokenized slot_id.',
    inputSchema: `{
  "type": "object",
  "properties": {
    "service_id": { "type": "string" },
    "start_date": { "type": "string", "format": "date" },
    "end_date": { "type": "string", "format": "date" },
    "postal_code": { "type": "string" },
    "timezone": { "type": "string" },
    "time_preference": { "type": "string" }
  },
  "required": ["service_id"]
}`,
    outputExample: `{
  "ok": true,
  "data": {
    "service_id": "svc_deep_cleaning",
    "timezone": "America/Denver",
    "slots": [
      {
        "slot_id": "slot_e4d9b2...",
        "starts_at": "2026-09-01T15:00:00.000Z",
        "ends_at": "2026-09-01T18:00:00.000Z",
        "resources": [{ "resource_id": "res_cleaner_maria", "resource_name": "Maria Lopez" }]
      }
    ]
  }
}`,
  },
  {
    name: 'request_appointment',
    summary: 'Atomic Booking & Slot Confirmation',
    readOnly: false,
    description:
      'Creates a persisted appointment request after human confirmation. Re-validates resource allocation atomically and enforces idempotency.',
    inputSchema: `{
  "type": "object",
  "properties": {
    "service_id": { "type": "string" },
    "slot_id": { "type": "string" },
    "start": { "type": "string" },
    "idempotency_key": { "type": "string" },
    "postal_code": { "type": "string" },
    "customer": {
      "type": "object",
      "properties": {
        "name": { "type": "string" },
        "email": { "type": "string" },
        "phone": { "type": "string" }
      },
      "required": ["name"]
    },
    "notes": { "type": "object" }
  },
  "required": ["service_id", "customer", "idempotency_key"]
}`,
    outputExample: `{
  "ok": true,
  "data": {
    "appointment_id": "appt_3dea1a32...",
    "status": "confirmed",
    "service": "Deep Cleaning",
    "starts_at": "2026-09-01T15:00:00.000Z",
    "provider": "Maria Lopez",
    "next_steps": [
      "Service is scheduled for 2026-09-01T15:00:00.000Z.",
      "Assigned professional: Maria Lopez."
    ]
  }
}`,
  },
  {
    name: 'get_appointment',
    summary: 'Appointment Status Inspection',
    readOnly: true,
    description:
      'Retrieves full appointment details, assigned provider, schedule, and cancellation status by appointment_id scoped to the business.',
    inputSchema: `{
  "type": "object",
  "properties": {
    "appointment_id": { "type": "string" }
  },
  "required": ["appointment_id"]
}`,
    outputExample: `{
  "ok": true,
  "data": {
    "appointment_id": "appt_3dea1a32...",
    "status": "confirmed",
    "service": "Deep Cleaning"
  }
}`,
  },
  {
    name: 'reschedule_appointment',
    summary: 'Atomic Rescheduling & Re-allocation',
    readOnly: false,
    description:
      'Moves an existing appointment to a new slot_id, atomically releasing previous resource locks and securing new provider availability.',
    inputSchema: `{
  "type": "object",
  "properties": {
    "appointment_id": { "type": "string" },
    "new_slot_id": { "type": "string" },
    "idempotency_key": { "type": "string" }
  },
  "required": ["appointment_id", "new_slot_id", "idempotency_key"]
}`,
    outputExample: `{
  "ok": true,
  "data": {
    "appointment_id": "appt_3dea1a32...",
    "status": "confirmed",
    "starts_at": "2026-09-02T16:00:00.000Z"
  }
}`,
  },
  {
    name: 'cancel_appointment',
    summary: 'Cancellation & Resource Release',
    readOnly: false,
    description:
      'Cancels an existing appointment and releases all reserved resources back to the available pool.',
    inputSchema: `{
  "type": "object",
  "properties": {
    "appointment_id": { "type": "string" },
    "idempotency_key": { "type": "string" },
    "reason": { "type": "string" }
  },
  "required": ["appointment_id", "idempotency_key"]
}`,
    outputExample: `{
  "ok": true,
  "data": {
    "appointment_id": "appt_3dea1a32...",
    "status": "cancelled",
    "message": "Appointment cancelled."
  }
}`,
  },
];

export default function DocsPage() {
  return (
    <main className="container mx-auto flex-1 px-4 py-8 space-y-10 max-w-4xl">
      <div className="space-y-3">
        <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/" />} className="-ml-3 text-muted-foreground">
          <ArrowLeftIcon className="size-4" />
          Back to Overview
        </Button>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          WebMCP Capability Suite
        </h1>
        <p className="text-muted-foreground text-base leading-relaxed">
          Protocol Tooling exposes 8 native WebMCP tools registered directly into the browser agent context (<code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">document.modelContext.registerTool</code>) on each business endpoint. AI agents discover and execute these tools dynamically without DOM automation.
        </p>
      </div>

      <div className="space-y-8">
        {TOOLS.map((tool) => (
          <section key={tool.name} className="rounded-xl border border-border bg-card p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
              <div className="flex items-center gap-3">
                <code className="text-base font-semibold font-mono text-foreground">
                  {tool.name}
                </code>
                <span className="text-xs text-muted-foreground font-sans">
                  ({tool.summary})
                </span>
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  tool.readOnly
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                    : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                }`}
              >
                {tool.readOnly ? 'readOnlyHint: true' : 'Side Effect (Human Confirmation Required)'}
              </span>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed">
              {tool.description}
            </p>

            <div className="grid gap-4 sm:grid-cols-2 text-xs">
              <div className="space-y-1.5">
                <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[11px]">
                  Input Schema
                </span>
                <pre className="p-3 bg-muted/60 rounded-lg overflow-x-auto font-mono text-[11px] leading-snug">
                  {tool.inputSchema}
                </pre>
              </div>
              <div className="space-y-1.5">
                <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[11px]">
                  Example Response
                </span>
                <pre className="p-3 bg-muted/60 rounded-lg overflow-x-auto font-mono text-[11px] leading-snug">
                  {tool.outputExample}
                </pre>
              </div>
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
