import { describe, expect, it } from 'vitest';
import { bookingService } from '@/services/booking-service';
import { ErrorCodes } from '@/domain/errors';
import { isAppointmentActive } from '@/domain/scheduler';
import { Appointment } from '@/domain/types';

describe("Maria's Cleaning Service — WebMCP Challenge Vertical Flow", () => {
  it('executes full agent-first workflow: info → services → eligibility → availability → request → get → reschedule → cancel', async () => {
    // 1. get_business_info
    const info = await bookingService.getBusinessInfo('marias-cleaning');
    expect(info.name).toBe("Maria's Cleaning Service");
    expect(info.category).toBe('residential_cleaning');
    expect(info.location.city).toBe('El Paso');
    expect(info.location.state).toBe('TX');
    expect(info.service_area).toContain('79901');
    expect(info.capabilities).toContain('appointment_request');
    expect(info.service_ids).toContain('svc_deep_cleaning');

    // 2. get_services
    const services = await bookingService.getServices('marias-cleaning', 'deep');
    expect(services.services.length).toBeGreaterThanOrEqual(1);
    const deepClean = services.services.find((s) => s.id === 'svc_deep_cleaning')!;
    expect(deepClean).toBeDefined();
    expect(deepClean.name).toBe('Deep Cleaning');
    expect(deepClean.price.amount).toBe(180); // $180 USD normal currency units
    expect(deepClean.price.currency).toBe('USD');
    expect(deepClean.duration_minutes).toBe(180);
    expect(deepClean.service_area_required).toBe(true);

    // 3. check_service_eligibility (eligible El Paso ZIP & standard residential specs)
    const eligibleCheck = await bookingService.checkServiceEligibility('marias-cleaning', {
      service_id: deepClean.id,
      postal_code: '79901',
      property_type: 'house',
      bedrooms: 3,
      bathrooms: 2,
      square_footage: 2400,
    });
    expect(eligibleCheck.eligible).toBe(true);
    expect(eligibleCheck.requirements.length).toBeGreaterThan(0);
    expect(eligibleCheck.reason).toBeNull();

    // 3b. check_service_eligibility (ineligible out-of-territory ZIP)
    const outOfAreaCheck = await bookingService.checkServiceEligibility('marias-cleaning', {
      service_id: deepClean.id,
      postal_code: '90210',
    });
    expect(outOfAreaCheck.eligible).toBe(false);
    expect(outOfAreaCheck.reason).toMatch(/outside the service area/i);

    // 3c. check_service_eligibility (ineligible unsupported property type)
    const warehouseCheck = await bookingService.checkServiceEligibility('marias-cleaning', {
      service_id: deepClean.id,
      postal_code: '79901',
      property_type: 'industrial_warehouse',
    });
    expect(warehouseCheck.eligible).toBe(false);
    expect(warehouseCheck.reason).toMatch(/not supported/i);

    // 3d. check_service_eligibility (ineligible exceeding declarative bedroom limit)
    const largeEstateCheck = await bookingService.checkServiceEligibility('marias-cleaning', {
      service_id: deepClean.id,
      postal_code: '79901',
      bedrooms: 10,
    });
    expect(largeEstateCheck.eligible).toBe(false);
    expect(largeEstateCheck.reason).toMatch(/more than 8 bedrooms/i);

    // 3e. check_service_eligibility (ineligible exceeding declarative bathroom limit on standard clean)
    const excessBathCheck = await bookingService.checkServiceEligibility('marias-cleaning', {
      service_id: 'svc_standard_cleaning',
      postal_code: '79901',
      bathrooms: 6,
    });
    expect(excessBathCheck.eligible).toBe(false);
    expect(excessBathCheck.reason).toMatch(/more than 4 bathrooms/i);

    // 3f. check_service_eligibility (ineligible exceeding declarative square footage limit on standard clean)
    const excessSqftCheck = await bookingService.checkServiceEligibility('marias-cleaning', {
      service_id: 'svc_standard_cleaning',
      postal_code: '79901',
      square_footage: 4500,
    });
    expect(excessSqftCheck.eligible).toBe(false);
    expect(excessSqftCheck.reason).toMatch(/3500 sq ft/i);

    // 4. check_availability (canonical date_from / date_to)
    const avail = await bookingService.checkAvailability('marias-cleaning', {
      service_id: deepClean.id,
      date_from: '2026-08-31',
      date_to: '2026-08-31',
      postal_code: '79901',
      time_preference: 'afternoon',
    });
    expect(avail.slots.length).toBeGreaterThan(0);
    expect(avail.timezone).toBe('America/Denver');
    const selectedSlot = avail.slots[0];
    expect(selectedSlot.slot_id).toBeTruthy();
    expect(selectedSlot.price.amount).toBe(180); // $180 USD

    // 5. request_appointment (honest 'requested' status)
    const requestResult = await bookingService.requestAppointment({
      businessSlug: 'marias-cleaning',
      service_id: deepClean.id,
      slot_id: selectedSlot.slot_id,
      idempotency_key: 'marias-demo-flow-req-1',
      postal_code: '79901',
      customer: {
        name: 'Judge Demo User',
        email: 'judge@openai-challenge.com',
        phone: '915-555-0123',
        service_address: {
          line1: '100 North Mesa St',
          city: 'El Paso',
          region: 'TX',
          postal_code: '79901',
        },
      },
      notes: {
        description: 'Deep clean 3-bedroom residential home before family arrival.',
        location_detail: 'Side gate entrance unlocked.',
      },
    });

    expect(requestResult.status).toBe('requested');
    expect(requestResult.service).toBe('Deep Cleaning');
    expect(requestResult.price.amount).toBe(180);
    expect(requestResult.next_steps?.length).toBeGreaterThan(0);
    const appointmentId = requestResult.appointment_id;

    // A live requested appointment is a temporary capacity reservation. The
    // exact slot must not be offered again while the hold is active.
    const availabilityWithRequestedHold = await bookingService.checkAvailability('marias-cleaning', {
      service_id: deepClean.id,
      date_from: '2026-08-31',
      date_to: '2026-08-31',
      postal_code: '79901',
      time_preference: 'afternoon',
    });
    expect(availabilityWithRequestedHold.slots.map((slot) => slot.slot_id)).not.toContain(selectedSlot.slot_id);

    // 6. get_appointment
    const getResult = await bookingService.getAppointment('marias-cleaning', appointmentId);
    expect(getResult.appointment_id).toBe(appointmentId);
    expect(getResult.status).toBe('requested');
    expect(getResult.customer.name).toBe('Judge Demo User');

    // 7. reschedule_appointment
    const rescheduleAvail = await bookingService.checkAvailability('marias-cleaning', {
      service_id: deepClean.id,
      date_from: '2026-09-01',
      date_to: '2026-09-01',
      postal_code: '79901',
      time_preference: 'morning',
    });
    const newSlot = rescheduleAvail.slots[0];
    const rescheduleResult = await bookingService.rescheduleAppointment({
      businessSlug: 'marias-cleaning',
      appointment_id: appointmentId,
      new_slot_id: newSlot.slot_id,
      idempotency_key: 'marias-reschedule-1',
    });
    expect(rescheduleResult.starts_at).toBe(newSlot.starts_at);

    // 8. cancel_appointment
    const cancelResult = await bookingService.cancelAppointment({
      businessSlug: 'marias-cleaning',
      appointment_id: appointmentId,
      idempotency_key: 'marias-cancel-1',
      reason: 'Schedule conflict',
    });
    expect(cancelResult.status).toBe('cancelled');

    // 9. Verify cancelled status on get_appointment
    const afterCancel = await bookingService.getAppointment('marias-cleaning', appointmentId);
    expect(afterCancel.status).toBe('cancelled');
  });

  it('rejects appointments when postal code is outside Maria cleaning territory', async () => {
    const avail = await bookingService.checkAvailability('marias-cleaning', {
      service_id: 'svc_standard_cleaning',
      date_from: '2026-08-31',
      date_to: '2026-08-31',
      postal_code: '79901',
    });
    const slot = avail.slots[0];

    await expect(
      bookingService.requestAppointment({
        businessSlug: 'marias-cleaning',
        service_id: 'svc_standard_cleaning',
        slot_id: slot.slot_id,
        idempotency_key: 'marias-out-of-area-key',
        postal_code: '78701', // Austin ZIP, not in El Paso
        customer: { name: 'Out of Area User' },
      }),
    ).rejects.toMatchObject({
      code: ErrorCodes.OUTSIDE_SERVICE_AREA,
    });
  });

  it('expires requested appointment capacity reservations past the hold TTL', () => {
    const now = Date.now();
    const activeRequest: Appointment = {
      id: 'appt_recent_req',
      business_id: 'biz_marias_cleaning',
      service_id: 'svc_standard_cleaning',
      status: 'requested',
      starts_at: new Date(now + 86400000).toISOString(),
      ends_at: new Date(now + 93600000).toISOString(),
      customer: { name: 'Recent Client' },
      price_cents: 12000,
      currency: 'USD',
      resource_allocations: [{ resource_id: 'res_cleaner_elena', resource_type: 'cleaner' }],
      created_at: new Date(now - 2 * 3600000).toISOString(), // 2 hours ago (< 24h)
    };

    const staleRequest: Appointment = {
      id: 'appt_stale_req',
      business_id: 'biz_marias_cleaning',
      service_id: 'svc_standard_cleaning',
      status: 'requested',
      starts_at: new Date(now + 86400000).toISOString(),
      ends_at: new Date(now + 93600000).toISOString(),
      customer: { name: 'Stale Client' },
      price_cents: 12000,
      currency: 'USD',
      resource_allocations: [{ resource_id: 'res_cleaner_elena', resource_type: 'cleaner' }],
      created_at: new Date(now - 30 * 3600000).toISOString(), // 30 hours ago (> 24h)
    };

    expect(isAppointmentActive(activeRequest, now)).toBe(true);
    expect(isAppointmentActive(staleRequest, now)).toBe(false);
  });
});
