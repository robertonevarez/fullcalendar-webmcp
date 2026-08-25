import {
  Appointment,
  BlockedTime,
  Business,
  BusinessAddress,
  Resource,
  Service,
  ServiceAreaZone,
  WorkingHours,
} from '@/domain/types';

export function parseJson<T>(value: string): T {
  return JSON.parse(value) as T;
}

export function toBusiness(row: Record<string, unknown>): Business {
  return {
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    timezone: String(row.timezone),
    location_mode: row.location_mode as Business['location_mode'],
    working_hours: parseJson<WorkingHours[]>(String(row.working_hours_json)),
    address: parseJson<BusinessAddress>(String(row.address_json)),
  };
}

export function toService(row: Record<string, unknown>): Service {
  return {
    id: String(row.id),
    business_id: String(row.business_id),
    name: String(row.name),
    description: String(row.description),
    duration_minutes: Number(row.duration_minutes),
    price_cents: Number(row.price_cents),
    currency: String(row.currency),
    keywords: parseJson<string[]>(String(row.keywords_json)),
    location_policy: row.location_policy as Service['location_policy'],
    service_area_required: Boolean(row.service_area_required),
    resource_requirements: parseJson<Service['resource_requirements']>(
      String(row.resource_requirements_json),
    ),
    intake_fields: parseJson<string[]>(String(row.intake_fields_json)),
  };
}

export function toResource(row: Record<string, unknown>): Resource {
  return {
    id: String(row.id),
    business_id: String(row.business_id),
    name: String(row.name),
    resource_type: String(row.resource_type),
    capabilities: parseJson<string[]>(String(row.capabilities_json)),
    working_hours: parseJson<WorkingHours[]>(String(row.working_hours_json)),
    is_human: Boolean(row.is_human),
  };
}

export function toBlockedTime(row: Record<string, unknown>): BlockedTime {
  return {
    id: String(row.id),
    resource_id: String(row.resource_id),
    starts_at: String(row.starts_at),
    ends_at: String(row.ends_at),
    reason: row.reason ? String(row.reason) : undefined,
  };
}

export function toServiceAreaZone(row: Record<string, unknown>): ServiceAreaZone {
  return {
    id: String(row.id),
    business_id: String(row.business_id),
    zone_id: String(row.zone_id),
    postal_codes: parseJson<string[]>(String(row.postal_codes_json)),
  };
}

export function toAppointment(
  row: Record<string, unknown>,
  resources: Appointment['resource_allocations'],
): Appointment {
  return {
    id: String(row.id),
    business_id: String(row.business_id),
    service_id: String(row.service_id),
    status: row.status as Appointment['status'],
    starts_at: String(row.starts_at),
    ends_at: String(row.ends_at),
    customer: {
      name: String(row.customer_name),
      email: row.customer_email ? String(row.customer_email) : undefined,
      phone: row.customer_phone ? String(row.customer_phone) : undefined,
      service_address: row.service_address_json
        ? parseJson<BusinessAddress>(String(row.service_address_json))
        : undefined,
    },
    notes: row.notes_json ? parseJson<Appointment['notes']>(String(row.notes_json)) : undefined,
    price_cents: Number(row.price_cents),
    currency: String(row.currency),
    idempotency_key: row.idempotency_key ? String(row.idempotency_key) : undefined,
    resource_allocations: resources,
  };
}
