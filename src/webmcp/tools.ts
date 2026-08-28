export const WEBMCP_TOOL_NAMES = [
  'get_business_info',
  'get_services',
  'check_service_eligibility',
  'check_availability',
  'request_appointment',
  'get_appointment',
  'reschedule_appointment',
  'cancel_appointment',
] as const;

export type WebMCPToolName = (typeof WEBMCP_TOOL_NAMES)[number];

export type ToolExecuteOptions = {
  signal?: AbortSignal;
};

export interface CreateBusinessToolsOptions {
  businessSlug: string;
  businessName: string;
  apiBaseUrl?: string;
}

export function normalizeApiBaseUrl(url?: string): string {
  if (!url) return '';
  return url.trim().replace(/\/+$/, '');
}

/** Structured `{ ok: false, error: { code } }` payloads from booking APIs. */
export function isStructuredDomainError(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object') return false;
  const record = payload as { ok?: unknown; error?: unknown };
  if (record.ok !== false || !record.error || typeof record.error !== 'object') return false;
  const code = (record.error as { code?: unknown }).code;
  return typeof code === 'string' && code.length > 0;
}

function logUnexpectedWebmcpFailure(details: Record<string, unknown>) {
  if (process.env.NODE_ENV !== 'production') {
    console.error('[webmcp]', details);
  }
}

/**
 * Shared WebMCP execute wrapper.
 *
 * Chrome's executeTool path invokes callbacks with only the input
 * object (argc === 1). Spec/docs also allow a second options bag with
 * `signal`. Never require that second argument — destructuring it from
 * undefined throws before fetch and surfaces as a generic inspector error.
 *
 * Expected domain rejections (e.g. OUTSIDE_SERVICE_AREA) are successful tool
 * executions that return structured `{ ok: false, error }` — do not console.error them.
 */
export async function postJson<T>(
  url: string,
  body: unknown,
  options?: ToolExecuteOptions,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
      signal: options?.signal,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Network request failed';
    logUnexpectedWebmcpFailure({ url, message });
    return {
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Tool request failed before a response was received.',
        retryable: true,
      },
    } as T;
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to parse JSON response';
    logUnexpectedWebmcpFailure({ url, status: response.status, message });
    return {
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Tool HTTP response was not JSON (status ${response.status}).`,
        retryable: true,
      },
    } as T;
  }

  // Structured domain outcomes (4xx with { ok:false, error.code }) are not runtime failures.
  if (!response.ok && !isStructuredDomainError(payload)) {
    logUnexpectedWebmcpFailure({ url, status: response.status, payload });
  }

  return payload as T;
}

function toolExecute<TInput extends object>(url: string) {
  return async (input: TInput, options?: ToolExecuteOptions) => postJson(url, input ?? {}, options);
}

export function createBusinessTools(
  optionsOrSlug: CreateBusinessToolsOptions | string,
  maybeBusinessName?: string,
  maybeApiBaseUrl?: string,
) {
  const options: CreateBusinessToolsOptions =
    typeof optionsOrSlug === 'string'
      ? {
          businessSlug: optionsOrSlug,
          businessName: maybeBusinessName ?? optionsOrSlug,
          apiBaseUrl: maybeApiBaseUrl,
        }
      : optionsOrSlug;

  const { businessSlug, businessName, apiBaseUrl } = options;
  const normalizedBase = normalizeApiBaseUrl(apiBaseUrl);
  const base = normalizedBase
    ? `${normalizedBase}/api/businesses/${encodeURIComponent(businessSlug)}`
    : `/api/businesses/${encodeURIComponent(businessSlug)}`;

  return [
    {
      name: 'get_business_info',
      description: `Return authoritative business information (location, service area, operating hours, contact, and capabilities) for ${businessName}.`,
      inputSchema: {
        type: 'object',
        properties: {},
      },
      annotations: { readOnlyHint: true },
      execute: toolExecute<Record<string, unknown>>(`${base}/get-business-info`),
    },
    {
      name: 'get_services',
      description: `Return available service offerings with pricing, duration, and constraints for ${businessName}. Optionally filter by keyword or query.`,
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Optional search text or service category.' },
        },
      },
      annotations: { readOnlyHint: true },
      execute: toolExecute<{ query?: string }>(`${base}/get-services`),
    },
    {
      name: 'check_service_eligibility',
      description: `Determine whether a requested service is eligible for the customer and property context at ${businessName}. Validates service area postal code, property constraints, and eligibility requirements before checking availability.`,
      inputSchema: {
        type: 'object',
        properties: {
          service_id: { type: 'string', description: 'Service identifier from get_services.' },
          postal_code: { type: 'string', description: 'Customer postal code.' },
          property_type: { type: 'string', description: 'Property type such as house, apartment, or condo.' },
          bedrooms: { type: 'number', description: 'Number of bedrooms if applicable.' },
          bathrooms: { type: 'number', description: 'Number of bathrooms if applicable.' },
          square_footage: { type: 'number', description: 'Approximate square footage if applicable.' },
        },
        required: ['service_id'],
      },
      annotations: { readOnlyHint: true },
      execute: toolExecute<{ service_id: string; postal_code?: string }>(`${base}/check-service-eligibility`),
    },
    {
      name: 'check_availability',
      description: `Return viable appointment availability slots for a service at ${businessName} within a date range. Times are returned in the business's authoritative timezone. Call after verifying service eligibility. Each slot includes a reusable slot_id.`,
      inputSchema: {
        type: 'object',
        properties: {
          service_id: { type: 'string', description: 'Service identifier from get_services.' },
          date_from: { type: 'string', format: 'date', description: 'Start date in YYYY-MM-DD format.' },
          date_to: { type: 'string', format: 'date', description: 'End date in YYYY-MM-DD format.' },
          postal_code: { type: 'string', description: 'Customer postal code for territory validation.' },
          time_preference: { type: 'string', description: 'Time preference (e.g. morning, afternoon, after 16:00).' },
          preferred_resource_id: { type: 'string', description: 'Optional provider identifier.' },
        },
        required: ['service_id', 'date_from', 'date_to'],
      },
      annotations: { readOnlyHint: true },
      execute: toolExecute<Record<string, unknown>>(`${base}/check-availability`),
    },
    {
      name: 'request_appointment',
      description: `Submit an appointment request to ${businessName} for review and scheduling after user confirmation. Requires service_id, slot_id (or start date/time), customer information, and idempotency_key. Creates an appointment in 'requested' status.`,
      inputSchema: {
        type: 'object',
        properties: {
          service_id: { type: 'string', description: 'Service identifier.' },
          slot_id: { type: 'string', description: 'Slot ID from check_availability.' },
          start: { type: 'string', description: 'ISO 8601 start timestamp matching an available slot.' },
          idempotency_key: { type: 'string', description: 'Unique idempotency key to protect against duplicate requests.' },
          postal_code: { type: 'string', description: 'Service address postal code.' },
          customer: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Customer full name.' },
              email: { type: 'string', description: 'Customer email.' },
              phone: { type: 'string', description: 'Customer phone number.' },
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
              description: { type: 'string', description: 'Special instructions or job notes.' },
              location_detail: { type: 'string', description: 'Access or parking notes.' },
            },
          },
        },
        required: ['service_id', 'customer', 'idempotency_key'],
      },
      annotations: { readOnlyHint: false },
      execute: toolExecute<Record<string, unknown>>(`${base}/request-appointment`),
    },
    {
      name: 'get_appointment',
      description: `Retrieve a compact appointment summary by appointment_id for ${businessName}.`,
      inputSchema: {
        type: 'object',
        properties: {
          appointment_id: { type: 'string', description: 'The appointment_id returned by request_appointment.' },
        },
        required: ['appointment_id'],
      },
      annotations: { readOnlyHint: true },
      execute: toolExecute<{ appointment_id: string }>(`${base}/appointments/get`),
    },
    {
      name: 'reschedule_appointment',
      description: `Reschedule an existing appointment to a new slot_id after human confirmation at ${businessName}. Use a fresh slot_id from check_availability.`,
      inputSchema: {
        type: 'object',
        properties: {
          appointment_id: { type: 'string', description: 'The existing appointment ID.' },
          new_slot_id: { type: 'string', description: 'The new slot_id from check_availability.' },
          idempotency_key: { type: 'string', description: 'Unique idempotency key for this reschedule request.' },
        },
        required: ['appointment_id', 'new_slot_id', 'idempotency_key'],
      },
      annotations: { readOnlyHint: false },
      execute: toolExecute<Record<string, unknown>>(`${base}/appointments/reschedule`),
    },
    {
      name: 'cancel_appointment',
      description: `Cancel an appointment after human confirmation and release all resource allocations at ${businessName}.`,
      inputSchema: {
        type: 'object',
        properties: {
          appointment_id: { type: 'string', description: 'The appointment ID to cancel.' },
          idempotency_key: { type: 'string', description: 'Unique idempotency key for this cancel request.' },
          reason: { type: 'string', description: 'Optional cancellation reason.' },
        },
        required: ['appointment_id', 'idempotency_key'],
      },
      annotations: { readOnlyHint: false },
      execute: toolExecute<Record<string, unknown>>(`${base}/appointments/cancel`),
    },
  ];
}

export type RegistrationError = {
  tool?: string;
  message: string;
};

export type RegistrationResult = {
  supported: boolean;
  attempted: boolean;
  registered: string[];
  errors: RegistrationError[];
  businessSlug: string;
};

export interface RegisterBusinessToolsOptions {
  businessSlug: string;
  businessName: string;
  signal?: AbortSignal;
  apiBaseUrl?: string;
}

export function getModelContext(): { registerTool?: Function } | undefined {
  if (typeof document === 'undefined') return undefined;
  const doc = document as Document & { modelContext?: { registerTool?: Function } };
  const nav = navigator as Navigator & { modelContext?: { registerTool?: Function } };
  return doc.modelContext ?? nav.modelContext;
}

export function isWebMCPSupported(): boolean {
  const modelContext = getModelContext();
  return typeof modelContext?.registerTool === 'function';
}

function registrationErrorMessage(error: unknown): string {
  if (error instanceof DOMException) return `${error.name}: ${error.message}`;
  if (error instanceof Error) return error.message;
  return String(error);
}

export { registrationErrorMessage };

export async function registerBusinessTools(
  optionsOrSlug: RegisterBusinessToolsOptions | string,
  maybeBusinessName?: string,
  maybeSignal?: AbortSignal,
  maybeApiBaseUrl?: string,
): Promise<RegistrationResult> {
  const options: RegisterBusinessToolsOptions =
    typeof optionsOrSlug === 'string'
      ? {
          businessSlug: optionsOrSlug,
          businessName: maybeBusinessName ?? optionsOrSlug,
          signal: maybeSignal,
          apiBaseUrl: maybeApiBaseUrl,
        }
      : optionsOrSlug;

  const { businessSlug, businessName, signal, apiBaseUrl } = options;
  const modelContext = getModelContext();
  if (!modelContext?.registerTool) {
    return {
      supported: false,
      attempted: false,
      registered: [],
      errors: [],
      businessSlug,
    };
  }

  const tools = createBusinessTools({ businessSlug, businessName, apiBaseUrl });
  const registered: string[] = [];
  const errors: RegistrationError[] = [];

  for (const tool of tools) {
    if (signal?.aborted) break;
    try {
      await modelContext.registerTool(tool, { signal });
      registered.push(tool.name);
    } catch (error) {
      errors.push({ tool: tool.name, message: registrationErrorMessage(error) });
    }
  }

  return {
    supported: true,
    attempted: true,
    registered,
    errors,
    businessSlug,
  };
}
