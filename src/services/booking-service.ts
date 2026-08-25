import { runInTransaction } from '@/db/client';
import { bookingRepository } from '@/db/repository';
import { AppError, ErrorCodes, ok, toErrorResponse } from '@/domain/errors';
import { searchServices } from '@/domain/search';
import {
  checkServiceArea,
  findAvailability,
  newAppointmentId,
  revalidateSlot,
  requirementSummary,
} from '@/domain/scheduler';
import {
  Appointment,
  AvailabilityQuery,
  AvailabilitySlot,
  CustomerInput,
  AppointmentNotes,
} from '@/domain/types';
import { log } from '@/lib/logging';
import { addMinutes } from '@/lib/time';

const SLOT_TTL_MINUTES = 30;

function buildSchedulerContext(businessId: string, serviceId: string) {
  const business = bookingRepository.getBusinessById(businessId);
  if (!business) {
    throw new AppError(ErrorCodes.BUSINESS_NOT_FOUND, `Business ${businessId} was not found.`);
  }
  const service = bookingRepository.getService(businessId, serviceId);
  if (!service) {
    throw new AppError(ErrorCodes.SERVICE_NOT_FOUND, `Service ${serviceId} was not found.`, false, 'service_id');
  }
  return {
    business,
    service,
    resources: bookingRepository.listResources(businessId),
    appointments: bookingRepository.listAppointments(businessId),
    blockedTimes: bookingRepository.listBlockedTimes(businessId),
  };
}

function serviceAreaMap(businessId: string) {
  const zones = bookingRepository.listServiceAreaZones(businessId);
  const map = new Map<string, string[]>();
  for (const zone of zones) {
    map.set(zone.zone_id, zone.postal_codes);
  }
  return map;
}

export class BookingService {
  searchServices(businessSlug: string, query?: string) {
    const business = bookingRepository.getBusinessBySlug(businessSlug);
    if (!business) throw new AppError(ErrorCodes.BUSINESS_NOT_FOUND, `Business ${businessSlug} was not found.`);
    const services = bookingRepository.listServices(business.id);
    const results = searchServices(services, query);
    log('info', { business_id: business.id, operation: 'search_services', query, count: results.length });
    return ok({
      business: { id: business.id, slug: business.slug, name: business.name },
      services: results,
    });
  }

  getServiceDetails(businessSlug: string, serviceId: string) {
    const business = bookingRepository.getBusinessBySlug(businessSlug);
    if (!business) throw new AppError(ErrorCodes.BUSINESS_NOT_FOUND, `Business ${businessSlug} was not found.`);
    const service = bookingRepository.getService(business.id, serviceId);
    if (!service) throw new AppError(ErrorCodes.SERVICE_NOT_FOUND, `Service ${serviceId} was not found.`);

    return ok({
      service_id: service.id,
      name: service.name,
      description: service.description,
      duration_minutes: service.duration_minutes,
      price: { amount: service.price_cents, currency: service.currency },
      location_policy: service.location_policy,
      service_area_required: service.service_area_required,
      required_resources: requirementSummary(service.resource_requirements),
      intake_fields: service.intake_fields,
      keywords: service.keywords,
    });
  }

  checkServiceArea(businessSlug: string, postalCode?: string, serviceId?: string) {
    const business = bookingRepository.getBusinessBySlug(businessSlug);
    if (!business) throw new AppError(ErrorCodes.BUSINESS_NOT_FOUND, `Business ${businessSlug} was not found.`);

    const service =
      serviceId != null
        ? bookingRepository.getService(business.id, serviceId)
        : bookingRepository.listServices(business.id)[0];
    if (!service) throw new AppError(ErrorCodes.SERVICE_NOT_FOUND, 'No services configured for this business.');

    const result = checkServiceArea(
      business.id,
      service,
      serviceAreaMap(business.id),
      postalCode,
    );

    if (result.status === 'ineligible') {
      throw new AppError(ErrorCodes.OUTSIDE_SERVICE_AREA, result.message, false, 'postal_code');
    }

    return ok({
      status: result.status,
      zone_id: result.zone_id ?? null,
      message: result.message,
    });
  }

  getAvailability(businessSlug: string, query: AvailabilityQuery) {
    const business = bookingRepository.getBusinessBySlug(businessSlug);
    if (!business) throw new AppError(ErrorCodes.BUSINESS_NOT_FOUND, `Business ${businessSlug} was not found.`);

    const ctx = buildSchedulerContext(business.id, query.service_id);

    if (ctx.service.service_area_required && !query.postal_code) {
      throw new AppError(ErrorCodes.LOCATION_REQUIRED, 'Postal code is required for this service.', false, 'postal_code');
    }

    if (ctx.service.service_area_required && query.postal_code) {
      const area = checkServiceArea(business.id, ctx.service, serviceAreaMap(business.id), query.postal_code);
      if (area.status === 'ineligible') {
        throw new AppError(ErrorCodes.OUTSIDE_SERVICE_AREA, area.message, false, 'postal_code');
      }
    }

    const slots = findAvailability(ctx, query);
    const expiresAt = addMinutes(new Date(), SLOT_TTL_MINUTES).toISOString();
    for (const slot of slots) {
      bookingRepository.saveSlotToken(business.id, slot, expiresAt);
    }

    log('info', {
      business_id: business.id,
      operation: 'get_availability',
      service_id: query.service_id,
      slot_count: slots.length,
    });

    if (!slots.length) {
      throw new AppError(ErrorCodes.NO_AVAILABILITY, 'No availability found for the requested range.', true);
    }

    return ok({ slots });
  }

  createAppointment(input: {
    businessSlug: string;
    service_id: string;
    slot_id: string;
    customer: CustomerInput;
    notes?: AppointmentNotes;
    idempotency_key: string;
    postal_code?: string;
  }) {
    const cached = bookingRepository.getIdempotencyResponse(input.idempotency_key);
    if (cached) return cached;

    const business = bookingRepository.getBusinessBySlug(input.businessSlug);
    if (!business) throw new AppError(ErrorCodes.BUSINESS_NOT_FOUND, `Business ${input.businessSlug} was not found.`);

    const slot = bookingRepository.getSlotToken(input.slot_id);
    if (!slot) {
      throw new AppError(ErrorCodes.SLOT_UNAVAILABLE, 'Slot is expired or invalid. Query availability again.', true);
    }

    const ctx = buildSchedulerContext(business.id, input.service_id);
    if (slot.service_id !== input.service_id) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'slot_id does not match service_id.', false, 'slot_id');
    }

    if (ctx.service.location_policy === 'CUSTOMER' && !input.customer.service_address && !input.postal_code) {
      throw new AppError(ErrorCodes.LOCATION_REQUIRED, 'Customer service address or postal code is required.', false);
    }

    const query: AvailabilityQuery = {
      service_id: input.service_id,
      start_date: slot.starts_at.slice(0, 10),
      end_date: slot.ends_at.slice(0, 10),
      postal_code: input.postal_code ?? input.customer.service_address?.postal_code,
    };

    if (!revalidateSlot(ctx, slot, query)) {
      throw new AppError(ErrorCodes.SLOT_UNAVAILABLE, 'Slot is no longer available.', true);
    }

    const appointment: Appointment = {
      id: newAppointmentId(),
      business_id: business.id,
      service_id: input.service_id,
      status: 'confirmed',
      starts_at: slot.starts_at,
      ends_at: slot.ends_at,
      customer: {
        ...input.customer,
        service_address:
          input.customer.service_address ??
          (input.postal_code
            ? {
                line1: 'Customer location',
                city: 'Unknown',
                region: 'TX',
                postal_code: input.postal_code,
              }
            : undefined),
      },
      notes: input.notes,
      price_cents: slot.price.amount,
      currency: slot.price.currency,
      idempotency_key: input.idempotency_key,
      resource_allocations: slot.resources,
    };

    try {
      runInTransaction(() => {
        this.assertResourcesFree(business.id, appointment, appointment.id);
        bookingRepository.insertAppointment(appointment);
      });
    } catch {
      throw new AppError(ErrorCodes.RESOURCE_UNAVAILABLE, 'Required resources are no longer available.', true);
    }

    const response = ok(this.toPublicAppointment(appointment, ctx.service.name, business.name));
    bookingRepository.saveIdempotencyResponse(input.idempotency_key, 'create_appointment', response);
    log('info', { business_id: business.id, operation: 'create_appointment', appointment_id: appointment.id });
    return response;
  }

  getAppointment(appointmentId: string) {
    const appointment = bookingRepository.getAppointment(appointmentId);
    if (!appointment) {
      throw new AppError(ErrorCodes.APPOINTMENT_NOT_FOUND, `Appointment ${appointmentId} was not found.`);
    }
    const business = bookingRepository.getBusinessById(appointment.business_id);
    const service = bookingRepository.getService(appointment.business_id, appointment.service_id);
    return ok(this.toPublicAppointment(appointment, service?.name ?? appointment.service_id, business?.name ?? ''));
  }

  rescheduleAppointment(input: {
    appointment_id: string;
    new_slot_id: string;
    idempotency_key: string;
  }) {
    const cached = bookingRepository.getIdempotencyResponse(input.idempotency_key);
    if (cached) return cached;

    const appointment = bookingRepository.getAppointment(input.appointment_id);
    if (!appointment) {
      throw new AppError(ErrorCodes.APPOINTMENT_NOT_FOUND, `Appointment ${input.appointment_id} was not found.`);
    }
    if (appointment.status === 'cancelled') {
      throw new AppError(
        ErrorCodes.APPOINTMENT_NOT_RESCHEDULABLE,
        'Cancelled appointments cannot be rescheduled.',
      );
    }

    const slot = bookingRepository.getSlotToken(input.new_slot_id);
    if (!slot) {
      throw new AppError(ErrorCodes.SLOT_UNAVAILABLE, 'New slot is expired or invalid.', true);
    }

    const ctx = buildSchedulerContext(appointment.business_id, appointment.service_id);
    const query: AvailabilityQuery = {
      service_id: appointment.service_id,
      start_date: slot.starts_at.slice(0, 10),
      end_date: slot.ends_at.slice(0, 10),
    };

    if (!revalidateSlot(ctx, slot, query)) {
      throw new AppError(ErrorCodes.SLOT_UNAVAILABLE, 'New slot is no longer available.', true);
    }

    const updated: Appointment = {
      ...appointment,
      starts_at: slot.starts_at,
      ends_at: slot.ends_at,
      resource_allocations: slot.resources,
    };

    try {
      runInTransaction(() => {
        this.assertResourcesFree(appointment.business_id, updated, appointment.id);
        bookingRepository.updateAppointmentTimes(appointment.id, slot.starts_at, slot.ends_at);
        bookingRepository.replaceAppointmentResources(appointment.id, slot.resources);
      });
    } catch {
      throw new AppError(ErrorCodes.RESOURCE_UNAVAILABLE, 'Required resources are unavailable for reschedule.', true);
    }

    const response = ok(
      this.toPublicAppointment(updated, ctx.service.name, ctx.business.name),
    );
    bookingRepository.saveIdempotencyResponse(input.idempotency_key, 'reschedule_appointment', response);
    log('info', {
      business_id: appointment.business_id,
      operation: 'reschedule_appointment',
      appointment_id: appointment.id,
    });
    return response;
  }

  cancelAppointment(input: { appointment_id: string; idempotency_key: string; reason?: string }) {
    const cached = bookingRepository.getIdempotencyResponse(input.idempotency_key);
    if (cached) return cached;

    const appointment = bookingRepository.getAppointment(input.appointment_id);
    if (!appointment) {
      throw new AppError(ErrorCodes.APPOINTMENT_NOT_FOUND, `Appointment ${input.appointment_id} was not found.`);
    }

    if (appointment.status === 'cancelled') {
      const business = bookingRepository.getBusinessById(appointment.business_id);
      const service = bookingRepository.getService(appointment.business_id, appointment.service_id);
      const response = ok({
        appointment_id: appointment.id,
        status: 'cancelled',
        message: 'Appointment was already cancelled.',
        appointment: this.toPublicAppointment(
          appointment,
          service?.name ?? appointment.service_id,
          business?.name ?? '',
        ),
      });
      bookingRepository.saveIdempotencyResponse(input.idempotency_key, 'cancel_appointment', response);
      return response;
    }

    bookingRepository.cancelAppointment(appointment.id);
    appointment.status = 'cancelled';
    const business = bookingRepository.getBusinessById(appointment.business_id);
    const service = bookingRepository.getService(appointment.business_id, appointment.service_id);
    const response = ok({
      appointment_id: appointment.id,
      status: 'cancelled',
      message: input.reason ? `Cancelled: ${input.reason}` : 'Appointment cancelled.',
      appointment: this.toPublicAppointment(
        appointment,
        service?.name ?? appointment.service_id,
        business?.name ?? '',
      ),
    });
    bookingRepository.saveIdempotencyResponse(input.idempotency_key, 'cancel_appointment', response);
    log('info', {
      business_id: appointment.business_id,
      operation: 'cancel_appointment',
      appointment_id: appointment.id,
    });
    return response;
  }

  private assertResourcesFree(businessId: string, appointment: Appointment, excludeAppointmentId?: string) {
    const appointments = bookingRepository
      .listAppointments(businessId)
      .filter((item) => item.id !== excludeAppointmentId);
    const blocked = bookingRepository.listBlockedTimes(businessId);
    const start = new Date(appointment.starts_at);
    const end = new Date(appointment.ends_at);

    for (const allocation of appointment.resource_allocations) {
      for (const existing of appointments) {
        if (existing.status !== 'confirmed') continue;
        const uses = existing.resource_allocations.some((r) => r.resource_id === allocation.resource_id);
        if (!uses) continue;
        if (start < new Date(existing.ends_at) && new Date(existing.starts_at) < end) {
          throw new AppError(ErrorCodes.RESOURCE_UNAVAILABLE, `Resource ${allocation.resource_id} is busy.`, true);
        }
      }
      for (const block of blocked) {
        if (block.resource_id !== allocation.resource_id) continue;
        if (start < new Date(block.ends_at) && new Date(block.starts_at) < end) {
          throw new AppError(ErrorCodes.RESOURCE_UNAVAILABLE, `Resource ${allocation.resource_id} is blocked.`, true);
        }
      }
    }
  }

  private toPublicAppointment(appointment: Appointment, serviceName: string, businessName: string) {
    const human = appointment.resource_allocations.find((r) =>
      ['hvac_technician', 'plumber', 'stylist', 'therapist', 'automotive_technician'].includes(r.resource_type),
    );
    return {
      appointment_id: appointment.id,
      business: businessName,
      service: serviceName,
      status: appointment.status,
      starts_at: appointment.starts_at,
      ends_at: appointment.ends_at,
      location:
        appointment.customer.service_address ??
        (appointment.resource_allocations.length ? 'At business location' : null),
      provider: human?.resource_name ?? null,
      price: { amount: appointment.price_cents, currency: appointment.currency },
      customer: {
        name: appointment.customer.name,
        email: appointment.customer.email ?? null,
        phone: appointment.customer.phone ?? null,
      },
      notes: appointment.notes ?? null,
      cancellable: appointment.status === 'confirmed',
    };
  }
}

export const bookingService = new BookingService();

export function handleServiceError(error: unknown) {
  return toErrorResponse(error);
}

export type BookingServiceResult<T> = ReturnType<typeof ok<T>> | ReturnType<typeof toErrorResponse>;
