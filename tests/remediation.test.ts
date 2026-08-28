import { describe, expect, it } from 'vitest';
import { bookingService } from '@/services/booking-service';
import { AppError, ErrorCodes } from '@/domain/errors';
import { allocateResources, findAvailability, newAppointmentId } from '@/domain/scheduler';
import { Business, Resource, Service } from '@/domain/types';

describe('business isolation and domain regressions', () => {
  it('rejects create_appointment when postal code is outside service area', async () => {
    const search = await bookingService.searchServices('acme-hvac', 'AC');
    const serviceId = search.data.services[0].service_id;

    const availability = await bookingService.getAvailability('acme-hvac', {
      service_id: serviceId,
      start_date: '2026-08-26',
      end_date: '2026-08-26',
      postal_code: '78701',
      time_preference: 'after 16:00',
    });
    const slot = availability.data.slots[0];

    await expect(
      bookingService.createAppointment({
        businessSlug: 'acme-hvac',
        service_id: serviceId,
        slot_id: slot.slot_id,
        idempotency_key: 'service-area-regression',
        postal_code: '73301',
        customer: { name: 'Out of Area Customer' },
      }),
    ).rejects.toMatchObject({
      code: ErrorCodes.OUTSIDE_SERVICE_AREA,
    });
  });

  it('allows the same raw idempotency_key across different businesses', async () => {
    const sharedKey = 'cross-business-idempotency-key';

    const salonAvailability = await bookingService.getAvailability('northline-salon', {
      service_id: 'svc_haircut',
      start_date: '2026-08-29',
      end_date: '2026-08-29',
    });
    const salonCreated = await bookingService.createAppointment({
      businessSlug: 'northline-salon',
      service_id: 'svc_haircut',
      slot_id: salonAvailability.data.slots[0].slot_id,
      idempotency_key: sharedKey,
      customer: { name: 'Salon Idempotency Customer' },
    });
    expect(salonCreated.ok).toBe(true);

    const autoAvailability = await bookingService.getAvailability('mesa-auto-service', {
      service_id: 'svc_oil_change',
      start_date: '2026-08-29',
      end_date: '2026-08-29',
      time_preference: 'morning',
    });
    const autoCreated = await bookingService.createAppointment({
      businessSlug: 'mesa-auto-service',
      service_id: 'svc_oil_change',
      slot_id: autoAvailability.data.slots[0].slot_id,
      idempotency_key: sharedKey,
      customer: { name: 'Auto Idempotency Customer' },
    });
    expect(autoCreated.ok).toBe(true);
    expect(autoCreated.data.appointment_id).not.toBe(salonCreated.data.appointment_id);
  });

  it('does not return create_appointment response when reusing idempotency key for cancel', async () => {
    const availability = await bookingService.getAvailability('northline-salon', {
      service_id: 'svc_haircut',
      start_date: '2026-08-29',
      end_date: '2026-08-29',
    });
    const slot = availability.data.slots[0];
    const sharedKey = 'shared-idempotency-key';

    const created = await bookingService.createAppointment({
      businessSlug: 'northline-salon',
      service_id: 'svc_haircut',
      slot_id: slot.slot_id,
      idempotency_key: sharedKey,
      customer: { name: 'Idempotency Test Customer' },
    });
    expect(created.ok).toBe(true);

    const cancelled = await bookingService.cancelAppointment({
      businessSlug: 'northline-salon',
      appointment_id: created.data.appointment_id,
      idempotency_key: sharedKey,
    });
    expect(cancelled.ok).toBe(true);
    expect(cancelled.data.status).toBe('cancelled');
    expect(cancelled.data.appointment_id).toBe(created.data.appointment_id);
    expect(cancelled.data).not.toEqual(created.data);
  });

  it('uses full UUID entropy for appointment IDs', () => {
    const id = newAppointmentId();
    expect(id).toMatch(/^appt_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it('scopes get/reschedule/cancel to the current business', async () => {
    const salonAvailability = await bookingService.getAvailability('northline-salon', {
      service_id: 'svc_haircut',
      start_date: '2026-08-29',
      end_date: '2026-08-29',
    });
    const salonAppointment = await bookingService.createAppointment({
      businessSlug: 'northline-salon',
      service_id: 'svc_haircut',
      slot_id: salonAvailability.data.slots[0].slot_id,
      idempotency_key: 'business-scope-salon',
      customer: { name: 'Salon Customer' },
    });

    await expect(
      bookingService.getAppointment('acme-hvac', salonAppointment.data.appointment_id),
    ).rejects.toThrow(AppError);

    await expect(
      bookingService.cancelAppointment({
        businessSlug: 'acme-hvac',
        appointment_id: salonAppointment.data.appointment_id,
        idempotency_key: 'business-scope-cancel',
      }),
    ).rejects.toThrow(AppError);

    expect(
      (await bookingService.getAppointment('northline-salon', salonAppointment.data.appointment_id)).ok,
    ).toBe(true);
  });

  it('allocates overlapping stylist requirements via backtracking', () => {
    const business: Business = {
      id: 'biz_overlap_test',
      slug: 'overlap-test',
      name: 'Overlap Test Salon',
      timezone: 'America/Chicago',
      location_mode: 'BUSINESS_LOCATION',
      working_hours: [{ day: 1, open: '09:00', close: '17:00' }],
      address: {
        line1: '1 Test St',
        city: 'Austin',
        region: 'TX',
        postal_code: '78701',
      },
    };

    const service: Service = {
      id: 'svc_color_combo',
      business_id: business.id,
      name: 'Cut and Color',
      description: 'Requires generic stylist plus color specialist',
      duration_minutes: 60,
      price_cents: 12000,
      currency: 'USD',
      location_policy: 'BUSINESS',
      service_area_required: false,
      resource_requirements: [
        { resource_type: 'stylist', quantity: 1 },
        { resource_type: 'stylist', quantity: 1, capability: 'hair_color' },
      ],
      intake_fields: [],
      keywords: ['color'],
    };

    const resources: Resource[] = [
      {
        id: 'res_sarah',
        business_id: business.id,
        name: 'Sarah',
        resource_type: 'stylist',
        is_human: true,
        capabilities: ['haircut', 'hair_color'],
        working_hours: [{ day: 1, open: '09:00', close: '17:00' }],
      },
      {
        id: 'res_emma',
        business_id: business.id,
        name: 'Emma',
        resource_type: 'stylist',
        is_human: true,
        capabilities: ['haircut'],
        working_hours: [{ day: 1, open: '09:00', close: '17:00' }],
      },
    ];

    const ctx = {
      business,
      service,
      resources,
      appointments: [],
      blockedTimes: [],
    };

    const start = new Date('2026-08-24T15:00:00.000Z');
    const end = new Date('2026-08-24T16:00:00.000Z');
    const allocation = allocateResources(ctx, { service_id: service.id, start_date: '2026-08-24', end_date: '2026-08-24' }, start, end);

    expect(allocation).not.toBeNull();
    const ids = allocation!.map((item) => item.resource_id).sort();
    expect(ids).toEqual(['res_emma', 'res_sarah']);

    const slots = findAvailability(ctx, {
      service_id: service.id,
      start_date: '2026-08-24',
      end_date: '2026-08-24',
      limit: 1,
    });
    expect(slots).toHaveLength(1);
    expect(slots[0].resources.map((item) => item.resource_id).sort()).toEqual(['res_emma', 'res_sarah']);
  });
});
