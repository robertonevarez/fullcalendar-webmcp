import { describe, expect, it } from 'vitest';
import { bookingService } from '@/services/booking-service';
import { AppError, ErrorCodes } from '@/domain/errors';

describe("Maria's Cleaning Service — WebMCP Challenge Vertical Flow", () => {
  it('executes full agent-first workflow: info → services → eligibility → availability → request → get → reschedule → cancel', async () => {
    // 1. get_business_info
    const info = await bookingService.getBusinessInfo('marias-cleaning');
    expect(info.ok).toBe(true);
    expect(info.data.name).toBe("Maria's Cleaning Service");
    expect(info.data.category).toBe('residential_cleaning');
    expect(info.data.location.city).toBe('El Paso');
    expect(info.data.location.state).toBe('TX');
    expect(info.data.service_area).toContain('79901');

    // 2. get_services
    const services = await bookingService.getServices('marias-cleaning', 'deep');
    expect(services.ok).toBe(true);
    expect(services.data.services.length).toBeGreaterThanOrEqual(1);
    const deepClean = services.data.services.find((s) => s.id === 'svc_deep_cleaning')!;
    expect(deepClean).toBeDefined();
    expect(deepClean.name).toBe('Deep Cleaning');
    expect(deepClean.price.amount).toBe(18000);
    expect(deepClean.duration_minutes).toBe(180);
    expect(deepClean.service_area_required).toBe(true);

    // 3. check_service_eligibility (eligible El Paso ZIP)
    const eligibleCheck = await bookingService.checkServiceEligibility('marias-cleaning', {
      service_id: deepClean.id,
      postal_code: '79901',
      property_type: 'house',
      bedrooms: 3,
      bathrooms: 2,
    });
    expect(eligibleCheck.ok).toBe(true);
    expect(eligibleCheck.data.eligible).toBe(true);
    expect(eligibleCheck.data.requirements.length).toBeGreaterThan(0);
    expect(eligibleCheck.data.reason).toBeNull();

    // 3b. check_service_eligibility (ineligible out-of-territory ZIP)
    const outOfAreaCheck = await bookingService.checkServiceEligibility('marias-cleaning', {
      service_id: deepClean.id,
      postal_code: '90210',
    });
    expect(outOfAreaCheck.ok).toBe(true);
    expect(outOfAreaCheck.data.eligible).toBe(false);
    expect(outOfAreaCheck.data.reason).toMatch(/outside the service area/i);

    // 4. check_availability
    const avail = await bookingService.checkAvailability('marias-cleaning', {
      service_id: deepClean.id,
      start_date: '2026-08-31',
      end_date: '2026-08-31',
      postal_code: '79901',
      time_preference: 'afternoon',
    });
    expect(avail.ok).toBe(true);
    expect(avail.data.slots.length).toBeGreaterThan(0);
    expect(avail.data.timezone).toBe('America/Denver');
    const selectedSlot = avail.data.slots[0];
    expect(selectedSlot.slot_id).toBeTruthy();

    // 5. request_appointment
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

    expect(requestResult.ok).toBe(true);
    expect(requestResult.data.status).toBe('confirmed');
    expect(requestResult.data.service).toBe('Deep Cleaning');
    expect(requestResult.data.next_steps?.length).toBeGreaterThan(0);
    const appointmentId = requestResult.data.appointment_id;

    // 6. get_appointment
    const getResult = await bookingService.getAppointment('marias-cleaning', appointmentId);
    expect(getResult.ok).toBe(true);
    expect(getResult.data.appointment_id).toBe(appointmentId);
    expect(getResult.data.customer.name).toBe('Judge Demo User');

    // 7. reschedule_appointment
    const rescheduleAvail = await bookingService.checkAvailability('marias-cleaning', {
      service_id: deepClean.id,
      start_date: '2026-09-01',
      end_date: '2026-09-01',
      postal_code: '79901',
      time_preference: 'morning',
    });
    const newSlot = rescheduleAvail.data.slots[0];
    const rescheduleResult = await bookingService.rescheduleAppointment({
      businessSlug: 'marias-cleaning',
      appointment_id: appointmentId,
      new_slot_id: newSlot.slot_id,
      idempotency_key: 'marias-reschedule-1',
    });
    expect(rescheduleResult.ok).toBe(true);
    expect(rescheduleResult.data.starts_at).toBe(newSlot.starts_at);

    // 8. cancel_appointment
    const cancelResult = await bookingService.cancelAppointment({
      businessSlug: 'marias-cleaning',
      appointment_id: appointmentId,
      idempotency_key: 'marias-cancel-1',
      reason: 'Schedule conflict',
    });
    expect(cancelResult.ok).toBe(true);
    expect(cancelResult.data.status).toBe('cancelled');

    // 9. Verify cancelled status on get_appointment
    const afterCancel = await bookingService.getAppointment('marias-cleaning', appointmentId);
    expect(afterCancel.data.status).toBe('cancelled');
  });

  it('rejects appointments when postal code is outside Maria cleaning territory', async () => {
    const avail = await bookingService.checkAvailability('marias-cleaning', {
      service_id: 'svc_standard_cleaning',
      start_date: '2026-08-31',
      end_date: '2026-08-31',
      postal_code: '79901',
    });
    const slot = avail.data.slots[0];

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
});
