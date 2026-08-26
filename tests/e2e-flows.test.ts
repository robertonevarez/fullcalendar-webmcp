import { describe, expect, it } from 'vitest';
import { bookingService } from '@/services/booking-service';
import { AppError } from '@/domain/errors';

describe('vertical compatibility flows', () => {
  it('Flow A — HVAC search to cancel', async () => {
    const search = await bookingService.searchServices('acme-hvac', 'AC not cooling');
    expect(search.ok).toBe(true);
    const serviceId = search.data.services[0].service_id;

    const details = await bookingService.getServiceDetails('acme-hvac', serviceId);
    expect(details.ok).toBe(true);
    expect(details.data.service_area_required).toBe(true);

    const area = await bookingService.checkServiceArea('acme-hvac', '78701', serviceId);
    expect(area.ok).toBe(true);

    const availability = await bookingService.getAvailability('acme-hvac', {
      service_id: serviceId,
      start_date: '2026-08-26',
      end_date: '2026-08-26',
      postal_code: '78701',
      time_preference: 'after 16:00',
    });
    expect(availability.ok).toBe(true);
    const slot = availability.data.slots[0];

    const created = await bookingService.createAppointment({
      businessSlug: 'acme-hvac',
      service_id: serviceId,
      slot_id: slot.slot_id,
      idempotency_key: 'hvac-flow-1',
      postal_code: '78701',
      customer: { name: 'Alex Morgan', email: 'alex@example.com' },
      notes: { description: 'Upstairs not cooling', location_detail: 'upstairs' },
    });
    expect(created.ok).toBe(true);
    const appointmentId = created.data.appointment_id;

    const fetched = await bookingService.getAppointment('acme-hvac', appointmentId);
    expect(fetched.ok).toBe(true);

    const newAvailability = await bookingService.getAvailability('acme-hvac', {
      service_id: serviceId,
      start_date: '2026-08-29',
      end_date: '2026-08-29',
      postal_code: '78701',
      time_preference: 'morning',
    });
    const newSlot = newAvailability.data.slots[0];
    const rescheduled = await bookingService.rescheduleAppointment({
      businessSlug: 'acme-hvac',
      appointment_id: appointmentId,
      new_slot_id: newSlot.slot_id,
      idempotency_key: 'hvac-reschedule-1',
    });
    expect(rescheduled.ok).toBe(true);

    const cancelled = await bookingService.cancelAppointment({
      businessSlug: 'acme-hvac',
      appointment_id: appointmentId,
      idempotency_key: 'hvac-cancel-1',
      reason: 'customer_request',
    });
    expect(cancelled.ok).toBe(true);
    expect(cancelled.data.status).toBe('cancelled');

    const cancelledAgain = await bookingService.cancelAppointment({
      businessSlug: 'acme-hvac',
      appointment_id: appointmentId,
      idempotency_key: 'hvac-cancel-2',
    });
    expect(cancelledAgain.ok).toBe(true);
  });

  it('Flow B — Salon haircut without service area', async () => {
    const search = await bookingService.searchServices('northline-salon', 'haircut');
    const serviceId = search.data.services[0].service_id;
    const details = await bookingService.getServiceDetails('northline-salon', serviceId);
    expect(details.data.service_area_required).toBe(false);

    const area = await bookingService.checkServiceArea('northline-salon');
    expect(area.data.status).toBe('not_required');

    const availability = await bookingService.getAvailability('northline-salon', {
      service_id: serviceId,
      start_date: '2026-08-29',
      end_date: '2026-08-29',
      time_preference: 'afternoon',
    });
    expect(availability.ok).toBe(true);

    const created = await bookingService.createAppointment({
      businessSlug: 'northline-salon',
      service_id: serviceId,
      slot_id: availability.data.slots[0].slot_id,
      idempotency_key: 'salon-flow-1',
      customer: { name: 'Jamie Lee' },
    });
    expect(created.ok).toBe(true);
    expect(created.data.provider).toBeTruthy();
  });

  it('Flow C — Auto oil change allocates technician and bay', async () => {
    const search = await bookingService.searchServices('mesa-auto-service', 'oil change');
    const serviceId = search.data.services[0].service_id;
    const availability = await bookingService.getAvailability('mesa-auto-service', {
      service_id: serviceId,
      start_date: '2026-08-29',
      end_date: '2026-08-29',
      time_preference: 'morning',
    });
    const slot = availability.data.slots[0];
    expect(slot.resources.map((r) => r.resource_type).sort()).toEqual([
      'automotive_technician',
      'service_bay',
    ]);

    const created = await bookingService.createAppointment({
      businessSlug: 'mesa-auto-service',
      service_id: serviceId,
      slot_id: slot.slot_id,
      idempotency_key: 'auto-flow-1',
      customer: { name: 'Taylor Kim' },
    });
    expect(created.ok).toBe(true);

    const fetched = await bookingService.getAppointment('mesa-auto-service', created.data.appointment_id);
    expect(fetched.ok).toBe(true);
  });

  it('prevents double booking on same slot', async () => {
    const availability = await bookingService.getAvailability('northline-salon', {
      service_id: 'svc_haircut',
      start_date: '2026-08-29',
      end_date: '2026-08-29',
    });
    const slot = availability.data.slots[0];
    await bookingService.createAppointment({
      businessSlug: 'northline-salon',
      service_id: 'svc_haircut',
      slot_id: slot.slot_id,
      idempotency_key: 'double-1',
      customer: { name: 'First Customer' },
    });

    await expect(
      bookingService.createAppointment({
        businessSlug: 'northline-salon',
        service_id: 'svc_haircut',
        slot_id: slot.slot_id,
        idempotency_key: 'double-2',
        customer: { name: 'Second Customer' },
      }),
    ).rejects.toThrow(AppError);
  });

  it('rejects concurrent double booking attempts on the same resources', async () => {
    const availability = await bookingService.getAvailability('northline-salon', {
      service_id: 'svc_haircut',
      start_date: '2026-08-29',
      end_date: '2026-08-29',
    });
    const slot = availability.data.slots[0];
    const results = await Promise.allSettled([
      bookingService.createAppointment({
        businessSlug: 'northline-salon',
        service_id: 'svc_haircut',
        slot_id: slot.slot_id,
        idempotency_key: 'concurrent-1',
        customer: { name: 'Concurrent A' },
      }),
      bookingService.createAppointment({
        businessSlug: 'northline-salon',
        service_id: 'svc_haircut',
        slot_id: slot.slot_id,
        idempotency_key: 'concurrent-2',
        customer: { name: 'Concurrent B' },
      }),
    ]);
    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');
    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);
  });
});
