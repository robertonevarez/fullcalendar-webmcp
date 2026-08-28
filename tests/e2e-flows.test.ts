import { describe, expect, it } from 'vitest';
import { bookingRepository } from '@/db/repository';
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
    expect(created.appointment_id).toBeTruthy();
    const appointmentId = created.appointment_id;

    const fetched = await bookingService.getAppointment('acme-hvac', appointmentId);
    expect(fetched.appointment_id).toBe(appointmentId);

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
    expect(rescheduled.starts_at).toBe(newSlot.starts_at);

    const cancelled = await bookingService.cancelAppointment({
      businessSlug: 'acme-hvac',
      appointment_id: appointmentId,
      idempotency_key: 'hvac-cancel-1',
      reason: 'customer_request',
    });
    expect(cancelled.status).toBe('cancelled');

    const cancelledAgain = await bookingService.cancelAppointment({
      businessSlug: 'acme-hvac',
      appointment_id: appointmentId,
      idempotency_key: 'hvac-cancel-2',
    });
    expect(cancelledAgain.status).toBe('cancelled');
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
    expect(created.appointment_id).toBeTruthy();
    expect(created.provider).toBeTruthy();
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
    expect(created.appointment_id).toBeTruthy();

    const fetched = await bookingService.getAppointment('mesa-auto-service', created.appointment_id);
    expect(fetched.appointment_id).toBe(created.appointment_id);
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

  it('returns the same appointment for concurrent creates with the same idempotency key', async () => {
    const availability = await bookingService.getAvailability('northline-salon', {
      service_id: 'svc_haircut',
      start_date: '2026-08-29',
      end_date: '2026-08-29',
    });
    const slot = availability.data.slots[0];
    const sharedKey = 'same-idempotency-concurrent-create';

    const [first, second] = await Promise.all([
      bookingService.createAppointment({
        businessSlug: 'northline-salon',
        service_id: 'svc_haircut',
        slot_id: slot.slot_id,
        idempotency_key: sharedKey,
        customer: { name: 'Idempotent A' },
      }),
      bookingService.createAppointment({
        businessSlug: 'northline-salon',
        service_id: 'svc_haircut',
        slot_id: slot.slot_id,
        idempotency_key: sharedKey,
        customer: { name: 'Idempotent B' },
      }),
    ]);

    expect(first.appointment_id).toBeTruthy();
    expect(second.appointment_id).toBeTruthy();
    expect(first.appointment_id).toBe(second.appointment_id);

    const appointments = await bookingRepository.listAppointments('biz_northline_salon');
    const matches = appointments.filter((item) => item.id === first.appointment_id);
    expect(matches).toHaveLength(1);
  });

  it('serializes cancel vs reschedule on the same appointment', async () => {
    const availability = await bookingService.getAvailability('northline-salon', {
      service_id: 'svc_haircut',
      start_date: '2026-08-29',
      end_date: '2026-08-29',
    });
    const created = await bookingService.createAppointment({
      businessSlug: 'northline-salon',
      service_id: 'svc_haircut',
      slot_id: availability.data.slots[0].slot_id,
      idempotency_key: 'lifecycle-create',
      customer: { name: 'Lifecycle Customer' },
    });
    const appointmentId = created.appointment_id;

    const laterAvailability = await bookingService.getAvailability('northline-salon', {
      service_id: 'svc_haircut',
      start_date: '2026-08-29',
      end_date: '2026-08-29',
    });
    const newSlot = laterAvailability.data.slots.find(
      (slot) => slot.slot_id !== availability.data.slots[0].slot_id,
    );
    expect(newSlot).toBeTruthy();

    const [rescheduleResult, cancelResult] = await Promise.allSettled([
      bookingService.rescheduleAppointment({
        businessSlug: 'northline-salon',
        appointment_id: appointmentId,
        new_slot_id: newSlot!.slot_id,
        idempotency_key: 'lifecycle-reschedule',
      }),
      bookingService.cancelAppointment({
        businessSlug: 'northline-salon',
        appointment_id: appointmentId,
        idempotency_key: 'lifecycle-cancel',
      }),
    ]);

    expect(cancelResult.status).toBe('fulfilled');
    const final = await bookingService.getAppointment('northline-salon', appointmentId);
    expect(final.status).toBe('cancelled');

    if (rescheduleResult.status === 'fulfilled') {
      expect(rescheduleResult.value.status).toBe('confirmed');
    } else {
      expect(rescheduleResult.reason).toBeInstanceOf(AppError);
      expect((rescheduleResult.reason as AppError).code).toBe('APPOINTMENT_NOT_RESCHEDULABLE');
    }

    const freshAvailability = await bookingService.getAvailability('northline-salon', {
      service_id: 'svc_haircut',
      start_date: '2026-08-29',
      end_date: '2026-08-29',
    });
    await expect(
      bookingService.rescheduleAppointment({
        businessSlug: 'northline-salon',
        appointment_id: appointmentId,
        new_slot_id: freshAvailability.data.slots[0].slot_id,
        idempotency_key: 'lifecycle-reschedule-after-cancel',
      }),
    ).rejects.toMatchObject({ code: 'APPOINTMENT_NOT_RESCHEDULABLE' });
  });

  it('serializes concurrent reschedules of the same appointment', async () => {
    const availability = await bookingService.getAvailability('northline-salon', {
      service_id: 'svc_haircut',
      start_date: '2026-08-29',
      end_date: '2026-08-29',
    });
    const created = await bookingService.createAppointment({
      businessSlug: 'northline-salon',
      service_id: 'svc_haircut',
      slot_id: availability.data.slots[0].slot_id,
      idempotency_key: 'dual-reschedule-create',
      customer: { name: 'Dual Reschedule Customer' },
    });
    const appointmentId = created.appointment_id;

    const later = await bookingService.getAvailability('northline-salon', {
      service_id: 'svc_haircut',
      start_date: '2026-08-29',
      end_date: '2026-08-29',
    });
    const slots = later.data.slots.filter((slot) => slot.slot_id !== availability.data.slots[0].slot_id);
    expect(slots.length).toBeGreaterThanOrEqual(2);

    const results = await Promise.allSettled([
      bookingService.rescheduleAppointment({
        businessSlug: 'northline-salon',
        appointment_id: appointmentId,
        new_slot_id: slots[0].slot_id,
        idempotency_key: 'dual-reschedule-a',
      }),
      bookingService.rescheduleAppointment({
        businessSlug: 'northline-salon',
        appointment_id: appointmentId,
        new_slot_id: slots[1].slot_id,
        idempotency_key: 'dual-reschedule-b',
      }),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    expect(fulfilled.length).toBeGreaterThanOrEqual(1);

    const final = await bookingService.getAppointment('northline-salon', appointmentId);
    expect(final.status).toBe('confirmed');
    expect([slots[0].starts_at, slots[1].starts_at]).toContain(final.starts_at);
  });
});
