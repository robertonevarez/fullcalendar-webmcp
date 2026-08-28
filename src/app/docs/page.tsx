import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeftIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'WebMCP Tool Specifications',
  description: 'Technical reference for Protocol Tooling WebMCP tools, schemas, and API contracts.',
};

const TOOLS = [
  {
    name: 'search_services',
    summary: 'Catalog Search & Ranking',
    readOnly: true,
    description:
      'Discovers services offered by the business matching a natural language problem or keyword query. Returns matching services with service_id, price, and duration.',
    inputSchema: `{
  "type": "object",
  "properties": {
    "query": { "type": "string", "description": "Optional search text such as AC cooling or haircut." }
  }
}`,
    outputExample: `{
  "services": [
    {
      "id": "svc_ac_diagnostic",
      "name": "AC Diagnostic Visit",
      "price_cents": 8900,
      "currency": "USD",
      "duration_minutes": 90,
      "service_area_required": true
    }
  ]
}`,
  },
  {
    name: 'get_service_details',
    summary: 'Service Metadata & Requirements',
    readOnly: true,
    description:
      'Returns duration, price, location policy, required resources, and intake constraints for a specific service.',
    inputSchema: `{
  "type": "object",
  "properties": {
    "service_id": { "type": "string" }
  },
  "required": ["service_id"]
}`,
    outputExample: `{
  "service": {
    "id": "svc_ac_diagnostic",
    "name": "AC Diagnostic Visit",
    "price_cents": 8900,
    "duration_minutes": 90,
    "location_policy": "CUSTOMER",
    "service_area_required": true
  }
}`,
  },
  {
    name: 'check_service_area',
    summary: 'Geographic Eligibility Verification',
    readOnly: true,
    description:
      'Validates whether a customer postal code falls within the business service territory before checking slot availability for dispatch services.',
    inputSchema: `{
  "type": "object",
  "properties": {
    "postal_code": { "type": "string" },
    "service_id": { "type": "string" }
  }
}`,
    outputExample: `{
  "status": "eligible",
  "postal_code": "78701",
  "message": "Eligible for service"
}`,
  },
  {
    name: 'get_availability',
    summary: 'Viable Slot Generation',
    readOnly: true,
    description:
      'Calculates available appointment start and end windows matching service duration, business working hours, provider schedules, and resource constraints.',
    inputSchema: `{
  "type": "object",
  "properties": {
    "service_id": { "type": "string" },
    "start_date": { "type": "string", "format": "date" },
    "end_date": { "type": "string", "format": "date" },
    "postal_code": { "type": "string" },
    "time_preference": { "type": "string" }
  },
  "required": ["service_id", "start_date", "end_date"]
}`,
    outputExample: `{
  "slots": [
    {
      "slot_id": "slot_b4dcf0d9...",
      "starts_at": "2026-08-29T16:00:00.000Z",
      "ends_at": "2026-08-29T17:30:00.000Z",
      "resources": [{ "resource_id": "res_james", "resource_name": "James" }]
    }
  ]
}`,
  },
  {
    name: 'create_appointment',
    summary: 'Atomic Booking & Slot Confirmation',
    readOnly: false,
    description:
      'Creates a confirmed appointment using an explicit slot_id after user confirmation. Re-validates resource allocation atomically and supports idempotency.',
    inputSchema: `{
  "type": "object",
  "properties": {
    "service_id": { "type": "string" },
    "slot_id": { "type": "string" },
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
    }
  },
  "required": ["service_id", "slot_id", "customer", "idempotency_key"]
}`,
    outputExample: `{
  "appointment": {
    "id": "appt_3dea1a32...",
    "status": "confirmed",
    "starts_at": "2026-08-29T16:00:00.000Z",
    "ends_at": "2026-08-29T17:30:00.000Z"
  }
}`,
  },
  {
    name: 'get_appointment',
    summary: 'Appointment Inspection',
    readOnly: true,
    description:
      'Retrieves appointment details and status by appointment_id scoped to the business.',
    inputSchema: `{
  "type": "object",
  "properties": {
    "appointment_id": { "type": "string" }
  },
  "required": ["appointment_id"]
}`,
    outputExample: `{
  "appointment": {
    "id": "appt_3dea1a32...",
    "status": "confirmed",
    "service_name": "AC Diagnostic Visit"
  }
}`,
  },
  {
    name: 'reschedule_appointment',
    summary: 'Atomic Rescheduling',
    readOnly: false,
    description:
      'Moves an existing appointment to a new slot_id, releasing the old resource allocations and reserving the new slot atomically.',
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
  "appointment": {
    "id": "appt_3dea1a32...",
    "status": "confirmed",
    "starts_at": "2026-08-30T10:00:00.000Z"
  }
}`,
  },
  {
    name: 'cancel_appointment',
    summary: 'Cancellation & Release',
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
  "appointment": {
    "id": "appt_3dea1a32...",
    "status": "cancelled"
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
          WebMCP Tool Specification
        </h1>
        <p className="text-muted-foreground text-base leading-relaxed">
          Protocol Tooling exposes 8 WebMCP tools registered directly onto the browser agent context on each business endpoint. AI agents discover these tools dynamically through <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">document.modelContext.registerTool</code>.
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
                {tool.readOnly ? 'readOnlyHint: true' : 'Mutation (User Confirmation Required)'}
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
