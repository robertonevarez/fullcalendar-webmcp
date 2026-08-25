import { getDb } from '@/db/client';
import {
  toAppointment,
  toBlockedTime,
  toBusiness,
  toResource,
  toService,
  toServiceAreaZone,
} from '@/db/mappers';
import { Appointment, AvailabilitySlot, Business, Resource, Service } from '@/domain/types';

export class BookingRepository {
  listBusinesses(): Business[] {
    const rows = getDb().prepare('SELECT * FROM businesses ORDER BY name').all();
    return rows.map((row) => toBusiness(row as Record<string, unknown>));
  }

  getBusinessBySlug(slug: string): Business | null {
    const row = getDb().prepare('SELECT * FROM businesses WHERE slug = ?').get(slug);
    return row ? toBusiness(row as Record<string, unknown>) : null;
  }

  getBusinessById(id: string): Business | null {
    const row = getDb().prepare('SELECT * FROM businesses WHERE id = ?').get(id);
    return row ? toBusiness(row as Record<string, unknown>) : null;
  }

  listServices(businessId: string): Service[] {
    const rows = getDb()
      .prepare('SELECT * FROM services WHERE business_id = ? ORDER BY name')
      .all(businessId);
    return rows.map((row) => toService(row as Record<string, unknown>));
  }

  getService(businessId: string, serviceId: string): Service | null {
    const row = getDb()
      .prepare('SELECT * FROM services WHERE business_id = ? AND id = ?')
      .get(businessId, serviceId);
    return row ? toService(row as Record<string, unknown>) : null;
  }

  listResources(businessId: string): Resource[] {
    const rows = getDb()
      .prepare('SELECT * FROM resources WHERE business_id = ? ORDER BY name')
      .all(businessId);
    return rows.map((row) => toResource(row as Record<string, unknown>));
  }

  listServiceAreaZones(businessId: string) {
    const rows = getDb()
      .prepare('SELECT * FROM service_area_zones WHERE business_id = ?')
      .all(businessId);
    return rows.map((row) => toServiceAreaZone(row as Record<string, unknown>));
  }

  listBlockedTimes(businessId: string) {
    const rows = getDb()
      .prepare(
        `SELECT bt.* FROM blocked_times bt
         JOIN resources r ON r.id = bt.resource_id
         WHERE r.business_id = ?`,
      )
      .all(businessId);
    return rows.map((row) => toBlockedTime(row as Record<string, unknown>));
  }

  listAppointments(businessId: string, statuses: string[] = ['confirmed']): Appointment[] {
    const placeholders = statuses.map(() => '?').join(',');
    const rows = getDb()
      .prepare(
        `SELECT * FROM appointments WHERE business_id = ? AND status IN (${placeholders})`,
      )
      .all(businessId, ...statuses);
    return rows.map((row) => this.hydrateAppointment(row as Record<string, unknown>));
  }

  getAppointment(appointmentId: string): Appointment | null {
    const row = getDb().prepare('SELECT * FROM appointments WHERE id = ?').get(appointmentId);
    return row ? this.hydrateAppointment(row as Record<string, unknown>) : null;
  }

  private hydrateAppointment(row: Record<string, unknown>): Appointment {
    const resources = getDb()
      .prepare(
        `SELECT ar.resource_id, ar.resource_type, r.name as resource_name
         FROM appointment_resources ar
         JOIN resources r ON r.id = ar.resource_id
         WHERE ar.appointment_id = ?`,
      )
      .all(String(row.id)) as Array<Record<string, unknown>>;
    return toAppointment(
      row,
      resources.map((resource) => ({
        resource_id: String(resource.resource_id),
        resource_type: String(resource.resource_type),
        resource_name: resource.resource_name ? String(resource.resource_name) : undefined,
      })),
    );
  }

  saveSlotToken(businessId: string, slot: AvailabilitySlot, expiresAt: string) {
    getDb()
      .prepare(
        `INSERT OR REPLACE INTO slot_tokens (slot_id, business_id, service_id, payload_json, expires_at)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(
        slot.slot_id,
        businessId,
        slot.service_id,
        JSON.stringify(slot),
        expiresAt,
      );
  }

  getSlotToken(slotId: string): AvailabilitySlot | null {
    const row = getDb().prepare('SELECT * FROM slot_tokens WHERE slot_id = ?').get(slotId) as
      | Record<string, unknown>
      | undefined;
    if (!row) return null;
    if (new Date(String(row.expires_at)) < new Date()) {
      getDb().prepare('DELETE FROM slot_tokens WHERE slot_id = ?').run(slotId);
      return null;
    }
    return JSON.parse(String(row.payload_json)) as AvailabilitySlot;
  }

  getIdempotencyResponse(key: string) {
    const row = getDb().prepare('SELECT response_json FROM idempotency_records WHERE key = ?').get(key) as
      | Record<string, unknown>
      | undefined;
    return row ? JSON.parse(String(row.response_json)) : null;
  }

  saveIdempotencyResponse(key: string, operation: string, response: unknown) {
    getDb()
      .prepare(
        `INSERT OR REPLACE INTO idempotency_records (key, operation, response_json, created_at)
         VALUES (?, ?, ?, ?)`,
      )
      .run(key, operation, JSON.stringify(response), new Date().toISOString());
  }

  insertAppointment(appointment: Appointment) {
    const db = getDb();
    db.prepare(
      `INSERT INTO appointments (
        id, business_id, service_id, status, starts_at, ends_at,
        customer_name, customer_email, customer_phone, service_address_json, notes_json,
        price_cents, currency, idempotency_key, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      appointment.id,
      appointment.business_id,
      appointment.service_id,
      appointment.status,
      appointment.starts_at,
      appointment.ends_at,
      appointment.customer.name,
      appointment.customer.email ?? null,
      appointment.customer.phone ?? null,
      appointment.customer.service_address
        ? JSON.stringify(appointment.customer.service_address)
        : null,
      appointment.notes ? JSON.stringify(appointment.notes) : null,
      appointment.price_cents,
      appointment.currency,
      appointment.idempotency_key ?? null,
      new Date().toISOString(),
      new Date().toISOString(),
    );

    const insertResource = db.prepare(
      `INSERT INTO appointment_resources (appointment_id, resource_id, resource_type)
       VALUES (?, ?, ?)`,
    );
    for (const allocation of appointment.resource_allocations) {
      insertResource.run(appointment.id, allocation.resource_id, allocation.resource_type);
    }
  }

  updateAppointmentTimes(appointmentId: string, startsAt: string, endsAt: string) {
    getDb()
      .prepare('UPDATE appointments SET starts_at = ?, ends_at = ?, updated_at = ? WHERE id = ?')
      .run(startsAt, endsAt, new Date().toISOString(), appointmentId);
  }

  replaceAppointmentResources(appointmentId: string, allocations: Appointment['resource_allocations']) {
    const db = getDb();
    db.prepare('DELETE FROM appointment_resources WHERE appointment_id = ?').run(appointmentId);
    const insert = db.prepare(
      `INSERT INTO appointment_resources (appointment_id, resource_id, resource_type)
       VALUES (?, ?, ?)`,
    );
    for (const allocation of allocations) {
      insert.run(appointmentId, allocation.resource_id, allocation.resource_type);
    }
  }

  cancelAppointment(appointmentId: string) {
    getDb()
      .prepare('UPDATE appointments SET status = ?, updated_at = ? WHERE id = ?')
      .run('cancelled', new Date().toISOString(), appointmentId);
  }
}

export const bookingRepository = new BookingRepository();
