export const WEBMCP_TOOL_NAMES = [
  'search_services',
  'get_service_details',
  'check_service_area',
  'get_availability',
  'create_appointment',
  'get_appointment',
  'reschedule_appointment',
  'cancel_appointment',
] as const;

export type WebMCPToolName = (typeof WEBMCP_TOOL_NAMES)[number];

async function postJson<T>(url: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  return response.json() as Promise<T>;
}

export function createBusinessTools(businessSlug: string, businessName: string) {
  const base = `/api/businesses/${businessSlug}`;

  return [
    {
      name: 'search_services',
      description: `Search the ${businessName} service catalog using deterministic keyword matching. Returns ranked services for the current business.`,
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Optional search text such as AC cooling or haircut.' },
        },
      },
      annotations: { readOnlyHint: true },
      execute: async (input: { query?: string }, { signal }: { signal: AbortSignal }) =>
        postJson(`${base}/search-services`, input, signal),
    },
    {
      name: 'get_service_details',
      description: `Return duration, price, location policy, required resources, and intake fields for a ${businessName} service.`,
      inputSchema: {
        type: 'object',
        properties: {
          service_id: { type: 'string', description: 'Service identifier from search_services.' },
        },
        required: ['service_id'],
      },
      annotations: { readOnlyHint: true },
      execute: async (input: { service_id: string }, { signal }: { signal: AbortSignal }) =>
        postJson(`${base}/get-service-details`, input, signal),
    },
    {
      name: 'check_service_area',
      description: `Check whether a postal code is eligible for field services at ${businessName}. Returns not_required for in-location services.`,
      inputSchema: {
        type: 'object',
        properties: {
          postal_code: { type: 'string', description: 'Customer postal code when service area applies.' },
          service_id: { type: 'string', description: 'Optional service identifier.' },
        },
      },
      annotations: { readOnlyHint: true },
      execute: async (
        input: { postal_code?: string; service_id?: string },
        { signal }: { signal: AbortSignal },
      ) => postJson(`${base}/check-service-area`, input, signal),
    },
    {
      name: 'get_availability',
      description: `Return viable appointment slots for a ${businessName} service within a date range.`,
      inputSchema: {
        type: 'object',
        properties: {
          service_id: { type: 'string' },
          start_date: { type: 'string', format: 'date' },
          end_date: { type: 'string', format: 'date' },
          postal_code: { type: 'string', description: 'Required for field services with service-area rules.' },
          time_preference: { type: 'string', description: 'Examples: after 16:00, morning, afternoon.' },
          preferred_resource_id: { type: 'string', description: 'Optional provider/resource preference.' },
        },
        required: ['service_id', 'start_date', 'end_date'],
      },
      annotations: { readOnlyHint: true },
      execute: async (input: Record<string, unknown>, { signal }: { signal: AbortSignal }) =>
        postJson(`${base}/get-availability`, input, signal),
    },
    {
      name: 'create_appointment',
      description: `Create a confirmed ${businessName} appointment after human confirmation. Revalidates slot and resources atomically.`,
      inputSchema: {
        type: 'object',
        properties: {
          service_id: { type: 'string' },
          slot_id: { type: 'string' },
          idempotency_key: { type: 'string' },
          postal_code: { type: 'string' },
          customer: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              email: { type: 'string' },
              phone: { type: 'string' },
              service_address: {
                type: 'object',
                properties: {
                  line1: { type: 'string' },
                  city: { type: 'string' },
                  region: { type: 'string' },
                  postal_code: { type: 'string' },
                },
              },
            },
            required: ['name'],
          },
          notes: {
            type: 'object',
            properties: {
              description: { type: 'string' },
              location_detail: { type: 'string' },
            },
          },
        },
        required: ['service_id', 'slot_id', 'customer', 'idempotency_key'],
      },
      annotations: { readOnlyHint: false },
      execute: async (input: Record<string, unknown>, { signal }: { signal: AbortSignal }) =>
        postJson(`${base}/create-appointment`, input, signal),
    },
    {
      name: 'get_appointment',
      description: 'Retrieve a compact appointment summary by appointment_id.',
      inputSchema: {
        type: 'object',
        properties: {
          appointment_id: { type: 'string' },
        },
        required: ['appointment_id'],
      },
      annotations: { readOnlyHint: true },
      execute: async (input: { appointment_id: string }, { signal }: { signal: AbortSignal }) =>
        postJson('/api/appointments/get', input, signal),
    },
    {
      name: 'reschedule_appointment',
      description: 'Reschedule an appointment to a new slot_id after human confirmation.',
      inputSchema: {
        type: 'object',
        properties: {
          appointment_id: { type: 'string' },
          new_slot_id: { type: 'string' },
          idempotency_key: { type: 'string' },
        },
        required: ['appointment_id', 'new_slot_id', 'idempotency_key'],
      },
      annotations: { readOnlyHint: false },
      execute: async (input: Record<string, unknown>, { signal }: { signal: AbortSignal }) =>
        postJson('/api/appointments/reschedule', input, signal),
    },
    {
      name: 'cancel_appointment',
      description: 'Cancel an appointment and release all resource allocations.',
      inputSchema: {
        type: 'object',
        properties: {
          appointment_id: { type: 'string' },
          idempotency_key: { type: 'string' },
          reason: { type: 'string' },
        },
        required: ['appointment_id', 'idempotency_key'],
      },
      annotations: { readOnlyHint: false },
      execute: async (input: Record<string, unknown>, { signal }: { signal: AbortSignal }) =>
        postJson('/api/appointments/cancel', input, signal),
    },
  ];
}

export function getModelContext(): { registerTool?: Function } | undefined {
  if (typeof document === 'undefined') return undefined;
  const doc = document as Document & { modelContext?: { registerTool?: Function } };
  const nav = navigator as Navigator & { modelContext?: { registerTool?: Function } };
  return doc.modelContext ?? nav.modelContext;
}

export async function registerBusinessTools(businessSlug: string, businessName: string, signal: AbortSignal) {
  const modelContext = getModelContext();
  if (!modelContext?.registerTool) {
    return { supported: false, registered: [] as string[] };
  }

  const tools = createBusinessTools(businessSlug, businessName);
  for (const tool of tools) {
    await modelContext.registerTool(tool, { signal });
  }

  return { supported: true, registered: tools.map((tool) => tool.name) };
}
