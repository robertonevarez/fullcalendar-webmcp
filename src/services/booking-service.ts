import { AppError, ErrorCodes, ok, toErrorResponse } from '@/domain/errors';
import {
  allocateResources,
  buildSlotId,
  checkServiceArea,
  findAvailability,
  isAppointmentActive,
  revalidateSlot,
  SchedulerContext,
} from '@/domain/scheduler';
import { searchServices } from '@/domain/search';
import {
  Appointment,
  AppointmentNotes,
  AppointmentStatus,
  AvailabilityQuery,
  AvailabilitySlot,
  BusinessInfo,
  CustomerInput,
  ResourceRequirement,
  Service,
  ServiceEligibilityQuery,
  ServiceEligibilityResult,
  AppointmentRequestInput,
} from '@/domain/types';
import {
  BusinessCapabilities,
  PublicAppointment,
  PublicService,
} from '@/domain/capabilities';
import { bookingRepository } from '@/db/repository';
import { runInTransaction } from '@/db/client';

const SLOT_TTL_MINUTES = 30;

function inferBusinessCategory(slug: string, name: string): string {
  const text = `${slug} ${name}`.toLowerCase();
  if (text.includes('clean') || text.includes('maid')) return 'residential_cleaning';
  if (text.includes('hvac') || text.includes('heat') || text.includes('air')) return 'hvac_service';
  if (text.includes('plumb')) return 'plumbing_service';
  if (text.includes('salon') || text.includes('hair') || text.includes('barber')) return 'salon_personal_care';
  if (text.includes('physio') || text.includes('therapy') || text.includes('pt')) return 'physical_therapy';
  if (text.includes('auto') || text.includes('repair') || text.includes('garage')) return 'automotive_repair';
  return 'local_service';
}

function requirementSummary(
  reqs: ResourceRequirement[],
): Array<{ resource_type: string; quantity: number; capability?: string | null }> {
  return reqs.map((r) => ({
    resource_type: r.resource_type,
    quantity: r.quantity,
    capability: r.capability ?? null,
  }));
}

function newAppointmentId(): string {
  return `appt_${crypto.randomUUID()}`;
}

function buildIdempotencyScope(operation: string, businessSlug: string, rawKey: string): string {
  return `${operation}:${businessSlug}:${rawKey.trim()}`;
}

function assertAppointmentInBusiness(
  businessSlug: string,
  businessId: string,
  appointment: Appointment | null,
  appointmentId: string,
): asserts appointment is Appointment {
  if (!appointment || appointment.business_id !== businessId) {
    throw new AppError(
      ErrorCodes.APPOINTMENT_NOT_FOUND,
      `Appointment ${appointmentId} was not found for business ${businessSlug}.`,
    );
  }
}

function log(level: 'info' | 'warn' | 'error', payload: Record<string, unknown>) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), level, ...payload }));
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

async function serviceAreaMap(businessId: string): Promise<Record<string, string[]>> {
  const zones = await bookingRepository.listServiceAreaZones(businessId);
  const map: Record<string, string[]> = {};
  for (const zone of zones) {
    map[zone.zone_id] = zone.postal_codes;
  }
  return map;
}

async function assertServiceAreaEligible(
  businessId: string,
  service: Service,
  postalCode?: string,
): Promise<void> {
  if (!service.service_area_required) return;
  const area = checkServiceArea(businessId, service, await serviceAreaMap(businessId), postalCode);
  if (area.status === 'ineligible') {
    throw new AppError(ErrorCodes.OUTSIDE_SERVICE_AREA, area.message, false, 'postal_code');
  }
}

async function buildSchedulerContext(businessId: string, serviceId: string): Promise<SchedulerContext> {
  const business = await bookingRepository.getBusinessById(businessId);
  if (!business) {
    throw new AppError(ErrorCodes.BUSINESS_NOT_FOUND, `Business ${businessId} was not found.`);
  }

  const service = await bookingRepository.getService(businessId, serviceId);
  if (!service) {
    throw new AppError(ErrorCodes.SERVICE_NOT_FOUND, `Service ${serviceId} was not found.`, false, 'service_id');
  }

  const [resources, appointments, blocked] = await Promise.all([
    bookingRepository.listResources(businessId),
    bookingRepository.listAppointments(businessId),
    bookingRepository.listBlockedTimes(businessId),
  ]);

  return {
    business,
    service,
    resources,
    appointments,
    blockedTimes: blocked,
  };
}

function resolveEffectivePostalCode(input: {
  postal_code?: string;
  customer: CustomerInput;
}): string | undefined {
  return input.postal_code?.trim() || input.customer.service_address?.postal_code?.trim();
}

export class BookingService implements BusinessCapabilities {
  async getBusinessInfo(businessSlug: string): Promise<BusinessInfo> {
    const business = await bookingRepository.getBusinessBySlug(businessSlug);
    if (!business) throw new AppError(ErrorCodes.BUSINESS_NOT_FOUND, `Business ${businessSlug} was not found.`);
    const services = await bookingRepository.listServices(business.id);
    const zones = await bookingRepository.listServiceAreaZones(business.id);
    const postalCodes = Array.from(new Set(zones.flatMap((z) => z.postal_codes)));

    return {
      business_id: business.slug,
      slug: business.slug,
      name: business.name,
      category: inferBusinessCategory(business.slug, business.name),
      timezone: business.timezone,
      location: {
        address: business.address.line1,
        city: business.address.city,
        state: business.address.region,
        postal_code: business.address.postal_code,
      },
      service_area: postalCodes,
      contact: {
        phone: business.slug === 'marias-cleaning' ? '915-555-0199' : '512-555-0100',
        email: `contact@${business.slug}.com`,
      },
      working_hours: business.working_hours,
      capabilities: [
        'service_discovery',
        'eligibility_check',
        'availability_check',
        'appointment_request',
        'appointment_management',
      ],
      service_ids: services.map((s) => s.id),
    };
  }

  async getServices(businessSlug: string, query?: string): Promise<{ services: PublicService[] }> {
    const business = await bookingRepository.getBusinessBySlug(businessSlug);
    if (!business) throw new AppError(ErrorCodes.BUSINESS_NOT_FOUND, `Business ${businessSlug} was not found.`);
    const allServices = await bookingRepository.listServices(business.id);
    const matched = query ? searchServices(allServices, query) : null;
    const servicesToReturn = matched
      ? matched
          .map((r) => allServices.find((s) => s.id === r.service_id))
          .filter((s): s is Service => Boolean(s))
      : allServices;

    const services: PublicService[] = servicesToReturn.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      duration_minutes: s.duration_minutes,
      price: {
        type: 'fixed',
        amount: s.price_cents / 100,
        currency: s.currency,
      },
      location_policy: s.location_policy,
      service_area_required: s.service_area_required,
      required_resources: requirementSummary(s.resource_requirements),
      intake_fields: s.intake_fields,
      keywords: s.keywords,
    }));

    return { services };
  }

  async checkServiceEligibility(
    businessSlug: string,
    input: ServiceEligibilityQuery,
  ): Promise<ServiceEligibilityResult> {
    const business = await bookingRepository.getBusinessBySlug(businessSlug);
    if (!business) throw new AppError(ErrorCodes.BUSINESS_NOT_FOUND, `Business ${businessSlug} was not found.`);

    const service = await bookingRepository.getService(business.id, input.service_id);
    if (!service) {
      throw new AppError(ErrorCodes.SERVICE_NOT_FOUND, `Service ${input.service_id} was not found.`, false, 'service_id');
    }

    const rules = service.eligibility_rules;
    const requirements: string[] = rules?.general_requirements ? [...rules.general_requirements] : [];

    if (rules?.requires_water_and_power && !requirements.some((r) => r.toLowerCase().includes('water'))) {
      requirements.push('Access to property with active water and electricity utilities');
    }

    // 1. Property type constraint
    if (rules?.property_types_supported?.length && input.property_type) {
      const normalizedInputType = input.property_type.trim().toLowerCase();
      const isSupported = rules.property_types_supported.some(
        (t) => t.trim().toLowerCase() === normalizedInputType,
      );
      if (!isSupported) {
        return {
          eligible: false,
          service_id: service.id,
          service_name: service.name,
          requirements,
          reason: `Property type '${input.property_type}' is not supported for ${service.name}. Supported types: ${rules.property_types_supported.join(', ')}.`,
          zone_id: null,
        };
      }
    }

    // 2. Bedroom count constraint
    if (rules?.max_bedrooms != null && input.bedrooms != null && input.bedrooms > rules.max_bedrooms) {
      return {
        eligible: false,
        service_id: service.id,
        service_name: service.name,
        requirements,
        reason: `Properties with more than ${rules.max_bedrooms} bedrooms exceed standard ${service.name} capacity (received ${input.bedrooms} bedrooms). Custom commercial quoting required.`,
        zone_id: null,
      };
    }

    // 3. Bathroom count constraint
    if (rules?.max_bathrooms != null && input.bathrooms != null && input.bathrooms > rules.max_bathrooms) {
      return {
        eligible: false,
        service_id: service.id,
        service_name: service.name,
        requirements,
        reason: `Properties with more than ${rules.max_bathrooms} bathrooms exceed standard ${service.name} capacity (received ${input.bathrooms} bathrooms). Custom commercial quoting required.`,
        zone_id: null,
      };
    }

    // 4. Square footage constraint
    if (rules?.max_square_footage != null && input.square_footage != null && input.square_footage > rules.max_square_footage) {
      return {
        eligible: false,
        service_id: service.id,
        service_name: service.name,
        requirements,
        reason: `Properties exceeding ${rules.max_square_footage} sq ft exceed standard ${service.name} capacity (received ${input.square_footage} sq ft). Custom commercial quoting required.`,
        zone_id: null,
      };
    }

    // 5. Service area territory constraint
    if (service.service_area_required) {
      if (!input.postal_code) {
        return {
          eligible: false,
          service_id: service.id,
          service_name: service.name,
          requirements,
          reason: 'Postal code is required to verify service territory eligibility.',
          zone_id: null,
        };
      }
      const area = checkServiceArea(business.id, service, await serviceAreaMap(business.id), input.postal_code);
      if (area.status === 'ineligible') {
        return {
          eligible: false,
          service_id: service.id,
          service_name: service.name,
          requirements,
          reason: area.message,
          zone_id: null,
        };
      }
      return {
        eligible: true,
        service_id: service.id,
        service_name: service.name,
        requirements,
        reason: null,
        zone_id: area.zone_id ?? null,
      };
    }

    return {
      eligible: true,
      service_id: service.id,
      service_name: service.name,
      requirements,
      reason: null,
      zone_id: null,
    };
  }

  async checkAvailability(
    businessSlug: string,
    query: AvailabilityQuery,
  ): Promise<{ service_id: string; timezone: string; slots: AvailabilitySlot[] }> {
    const business = await bookingRepository.getBusinessBySlug(businessSlug);
    if (!business) throw new AppError(ErrorCodes.BUSINESS_NOT_FOUND, `Business ${businessSlug} was not found.`);

    const avail = await this.getAvailability(businessSlug, query);
    return {
      service_id: query.service_id,
      timezone: business.timezone,
      slots: avail.data.slots,
    };
  }

  async requestAppointment(
    input: { businessSlug: string } & AppointmentRequestInput,
  ): Promise<PublicAppointment> {
    let slotId = input.slot_id;

    if (!slotId && input.start) {
      const dateStr = input.start.slice(0, 10);
      const avail = await this.getAvailability(input.businessSlug, {
        service_id: input.service_id,
        date_from: dateStr,
        date_to: dateStr,
        postal_code: input.postal_code ?? input.service_address?.postal_code,
      });
      const matchingSlot = avail.data.slots.find(
        (s) => s.starts_at === input.start || s.starts_at.startsWith(input.start!),
      );
      if (matchingSlot) {
        slotId = matchingSlot.slot_id;
      }
    }

    if (!slotId) {
      throw new AppError(
        ErrorCodes.VALIDATION_ERROR,
        'slot_id (or a valid matching start time) is required to request an appointment.',
        false,
        'slot_id',
      );
    }

    const customerInput: CustomerInput = {
      name: input.customer.name,
      email: input.customer.email,
      phone: input.customer.phone,
      service_address: input.customer.service_address ?? input.service_address,
    };

    return this.createAppointment({
      businessSlug: input.businessSlug,
      service_id: input.service_id,
      slot_id: slotId,
      customer: customerInput,
      notes: input.notes,
      idempotency_key: input.idempotency_key,
      postal_code: input.postal_code ?? customerInput.service_address?.postal_code,
      status: 'requested',
    });
  }

  async searchServices(businessSlug: string, query?: string) {
    const business = await bookingRepository.getBusinessBySlug(businessSlug);
    if (!business) throw new AppError(ErrorCodes.BUSINESS_NOT_FOUND, `Business ${businessSlug} was not found.`);
    const services = await bookingRepository.listServices(business.id);
    const results = searchServices(services, query);
    log('info', { business_id: business.id, operation: 'search_services', query, count: results.length });
    return ok({
      business: { id: business.id, slug: business.slug, name: business.name },
      services: results,
    });
  }

  async getServiceDetails(businessSlug: string, serviceId: string) {
    const business = await bookingRepository.getBusinessBySlug(businessSlug);
    if (!business) throw new AppError(ErrorCodes.BUSINESS_NOT_FOUND, `Business ${businessSlug} was not found.`);
    const service = await bookingRepository.getService(business.id, serviceId);
    if (!service) throw new AppError(ErrorCodes.SERVICE_NOT_FOUND, `Service ${serviceId} was not found.`);

    return ok({
      service_id: service.id,
      name: service.name,
      description: service.description,
      duration_minutes: service.duration_minutes,
      price: { amount: service.price_cents / 100, currency: service.currency },
      location_policy: service.location_policy,
      service_area_required: service.service_area_required,
      required_resources: requirementSummary(service.resource_requirements),
      intake_fields: service.intake_fields,
      keywords: service.keywords,
    });
  }

  async checkServiceArea(businessSlug: string, postalCode?: string, serviceId?: string) {
    const business = await bookingRepository.getBusinessBySlug(businessSlug);
    if (!business) throw new AppError(ErrorCodes.BUSINESS_NOT_FOUND, `Business ${businessSlug} was not found.`);

    const service =
      serviceId != null
        ? await bookingRepository.getService(business.id, serviceId)
        : (await bookingRepository.listServices(business.id))[0];
    if (!service) throw new AppError(ErrorCodes.SERVICE_NOT_FOUND, 'No services configured for this business.');

    const result = checkServiceArea(
      business.id,
      service,
      await serviceAreaMap(business.id),
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

  async getAvailability(businessSlug: string, query: AvailabilityQuery) {
    const business = await bookingRepository.getBusinessBySlug(businessSlug);
    if (!business) throw new AppError(ErrorCodes.BUSINESS_NOT_FOUND, `Business ${businessSlug} was not found.`);

    const ctx = await buildSchedulerContext(business.id, query.service_id);

    await assertServiceAreaEligible(business.id, ctx.service, query.postal_code);

    const slots = findAvailability(ctx, query);
    const expiresAt = addMinutes(new Date(), SLOT_TTL_MINUTES).toISOString();
    for (const slot of slots) {
      await bookingRepository.saveSlotToken(business.id, slot, expiresAt);
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

  async createAppointment(input: {
    businessSlug: string;
    service_id: string;
    slot_id: string;
    customer: CustomerInput;
    notes?: AppointmentNotes;
    idempotency_key: string;
    postal_code?: string;
    status?: AppointmentStatus;
  }): Promise<PublicAppointment> {
    const scopeKey = buildIdempotencyScope('create_appointment', input.businessSlug, input.idempotency_key);
    const cached = await bookingRepository.getIdempotencyResponse(scopeKey);
    if (cached) {
      const payload = cached as { data?: PublicAppointment } | PublicAppointment;
      return 'data' in payload && payload.data ? payload.data : (payload as PublicAppointment);
    }

    const business = await bookingRepository.getBusinessBySlug(input.businessSlug);
    if (!business) throw new AppError(ErrorCodes.BUSINESS_NOT_FOUND, `Business ${input.businessSlug} was not found.`);

    const slot = await bookingRepository.getSlotTokenForBusiness(business.id, input.slot_id);
    if (!slot) {
      throw new AppError(ErrorCodes.SLOT_UNAVAILABLE, 'Slot is expired or invalid. Query availability again.', true);
    }

    const ctx = await buildSchedulerContext(business.id, input.service_id);
    if (slot.service_id !== input.service_id) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'slot_id does not match service_id.', false, 'slot_id');
    }

    const effectivePostalCode = resolveEffectivePostalCode(input);

    if (ctx.service.location_policy === 'CUSTOMER' && !input.customer.service_address && !effectivePostalCode) {
      throw new AppError(ErrorCodes.LOCATION_REQUIRED, 'Customer service address or postal code is required.', false);
    }

    await assertServiceAreaEligible(business.id, ctx.service, effectivePostalCode);

    const query: AvailabilityQuery = {
      service_id: input.service_id,
      date_from: slot.starts_at.slice(0, 10),
      date_to: slot.ends_at.slice(0, 10),
      postal_code: effectivePostalCode,
    };

    if (!revalidateSlot(ctx, slot, query)) {
      throw new AppError(ErrorCodes.SLOT_UNAVAILABLE, 'Slot is no longer available.', true);
    }

    const initialStatus: AppointmentStatus = input.status ?? 'confirmed';

    const appointment: Appointment = {
      id: newAppointmentId(),
      business_id: business.id,
      service_id: input.service_id,
      status: initialStatus,
      starts_at: slot.starts_at,
      ends_at: slot.ends_at,
      customer: {
        ...input.customer,
        service_address:
          input.customer.service_address ??
          (effectivePostalCode
            ? {
                line1: 'Customer location',
                city: 'Unknown',
                region: 'TX',
                postal_code: effectivePostalCode,
              }
            : undefined),
      },
      notes: input.notes,
      price_cents: Math.round(slot.price.amount * 100),
      currency: slot.price.currency,
      idempotency_key: scopeKey,
      resource_allocations: slot.resources,
    };

    try {
      const response = await runInTransaction(async () => {
        await this.lockResourcesForAppointment(appointment);
        const raced = await bookingRepository.getIdempotencyResponse(scopeKey);
        if (raced) {
          const payload = raced as { data?: PublicAppointment } | PublicAppointment;
          return 'data' in payload && payload.data ? payload.data : (payload as PublicAppointment);
        }

        await this.assertResourcesFree(business.id, appointment, appointment.id, { alreadyLocked: true });
        await bookingRepository.insertAppointment(appointment);
        const created = this.toPublicAppointment(appointment, ctx.service.name, business.name);
        await bookingRepository.saveIdempotencyResponse(scopeKey, 'create_appointment', ok(created));
        return created;
      });
      log('info', { business_id: business.id, operation: 'create_appointment', appointment_id: appointment.id });
      return response;
    } catch (error) {
      const raced = await bookingRepository.getIdempotencyResponse(scopeKey);
      if (raced) {
        const payload = raced as { data?: PublicAppointment } | PublicAppointment;
        return 'data' in payload && payload.data ? payload.data : (payload as PublicAppointment);
      }
      if (error instanceof AppError) throw error;
      throw new AppError(ErrorCodes.RESOURCE_UNAVAILABLE, 'Required resources are no longer available.', true);
    }
  }

  async getAppointment(businessSlug: string, appointmentId: string): Promise<PublicAppointment> {
    const business = await bookingRepository.getBusinessBySlug(businessSlug);
    if (!business) throw new AppError(ErrorCodes.BUSINESS_NOT_FOUND, `Business ${businessSlug} was not found.`);

    const appointment = await bookingRepository.getAppointment(appointmentId);
    assertAppointmentInBusiness(businessSlug, business.id, appointment, appointmentId);

    const service = await bookingRepository.getService(business.id, appointment.service_id);
    return this.toPublicAppointment(appointment, service?.name ?? appointment.service_id, business.name);
  }

  async rescheduleAppointment(input: {
    businessSlug: string;
    appointment_id: string;
    new_slot_id: string;
    idempotency_key: string;
  }): Promise<PublicAppointment> {
    const scopeKey = buildIdempotencyScope(
      'reschedule_appointment',
      input.businessSlug,
      input.idempotency_key,
    );
    const cached = await bookingRepository.getIdempotencyResponse(scopeKey);
    if (cached) {
      const payload = cached as { data?: PublicAppointment } | PublicAppointment;
      return 'data' in payload && payload.data ? payload.data : (payload as PublicAppointment);
    }

    const business = await bookingRepository.getBusinessBySlug(input.businessSlug);
    if (!business) throw new AppError(ErrorCodes.BUSINESS_NOT_FOUND, `Business ${input.businessSlug} was not found.`);

    const existing = await bookingRepository.getAppointment(input.appointment_id);
    assertAppointmentInBusiness(input.businessSlug, business.id, existing, input.appointment_id);

    const slot = await bookingRepository.getSlotTokenForBusiness(business.id, input.new_slot_id);
    if (!slot) {
      throw new AppError(ErrorCodes.SLOT_UNAVAILABLE, 'New slot is expired or invalid.', true);
    }

    const ctx = await buildSchedulerContext(business.id, existing.service_id);
    const query: AvailabilityQuery = {
      service_id: existing.service_id,
      date_from: slot.starts_at.slice(0, 10),
      date_to: slot.ends_at.slice(0, 10),
    };

    if (!revalidateSlot(ctx, slot, query)) {
      throw new AppError(ErrorCodes.SLOT_UNAVAILABLE, 'New slot is no longer available.', true);
    }

    try {
      const response = await runInTransaction(async () => {
        const appointment = await bookingRepository.getAppointmentForUpdate(input.appointment_id);
        assertAppointmentInBusiness(input.businessSlug, business.id, appointment, input.appointment_id);

        if (appointment.status === 'cancelled') {
          throw new AppError(
            ErrorCodes.APPOINTMENT_NOT_RESCHEDULABLE,
            'Cancelled appointments cannot be rescheduled.',
          );
        }

        const updated: Appointment = {
          ...appointment,
          starts_at: slot.starts_at,
          ends_at: slot.ends_at,
          resource_allocations: slot.resources,
        };

        await this.lockResourcesForAppointment(updated);
        const raced = await bookingRepository.getIdempotencyResponse(scopeKey);
        if (raced) {
          const payload = raced as { data?: PublicAppointment } | PublicAppointment;
          return 'data' in payload && payload.data ? payload.data : (payload as PublicAppointment);
        }

        await this.assertResourcesFree(business.id, updated, appointment.id, { alreadyLocked: true });
        await bookingRepository.updateAppointmentTimes(appointment.id, slot.starts_at, slot.ends_at);
        await bookingRepository.replaceAppointmentResources(appointment.id, slot.resources);
        const body = this.toPublicAppointment(updated, ctx.service.name, ctx.business.name);
        await bookingRepository.saveIdempotencyResponse(scopeKey, 'reschedule_appointment', ok(body));
        return body;
      });
      log('info', {
        business_id: business.id,
        operation: 'reschedule_appointment',
        appointment_id: input.appointment_id,
      });
      return response;
    } catch (error) {
      const raced = await bookingRepository.getIdempotencyResponse(scopeKey);
      if (raced) {
        const payload = raced as { data?: PublicAppointment } | PublicAppointment;
        return 'data' in payload && payload.data ? payload.data : (payload as PublicAppointment);
      }
      if (error instanceof AppError) throw error;
      throw new AppError(ErrorCodes.RESOURCE_UNAVAILABLE, 'Required resources are unavailable for reschedule.', true);
    }
  }

  async cancelAppointment(input: {
    businessSlug: string;
    appointment_id: string;
    idempotency_key: string;
    reason?: string;
  }): Promise<{ appointment_id: string; status: string; message: string; appointment: PublicAppointment }> {
    type CancelApptReturn = { appointment_id: string; status: string; message: string; appointment: PublicAppointment };
    const scopeKey = buildIdempotencyScope('cancel_appointment', input.businessSlug, input.idempotency_key);
    const cached = await bookingRepository.getIdempotencyResponse(scopeKey);
    if (cached) {
      const payload = cached as { data?: CancelApptReturn } | CancelApptReturn;
      return 'data' in payload && payload.data ? payload.data : (payload as CancelApptReturn);
    }

    const business = await bookingRepository.getBusinessBySlug(input.businessSlug);
    if (!business) throw new AppError(ErrorCodes.BUSINESS_NOT_FOUND, `Business ${input.businessSlug} was not found.`);

    const preview = await bookingRepository.getAppointment(input.appointment_id);
    assertAppointmentInBusiness(input.businessSlug, business.id, preview, input.appointment_id);

    const service = await bookingRepository.getService(business.id, preview.service_id);

    const response = await runInTransaction(async () => {
      const appointment = await bookingRepository.getAppointmentForUpdate(input.appointment_id);
      assertAppointmentInBusiness(input.businessSlug, business.id, appointment, input.appointment_id);

      const raced = await bookingRepository.getIdempotencyResponse(scopeKey);
      if (raced) {
        const payload = raced as { data?: CancelApptReturn } | CancelApptReturn;
        return 'data' in payload && payload.data ? payload.data : (payload as CancelApptReturn);
      }

      if (appointment.status === 'cancelled') {
        const body = {
          appointment_id: appointment.id,
          status: 'cancelled',
          message: 'Appointment was already cancelled.',
          appointment: this.toPublicAppointment(
            appointment,
            service?.name ?? appointment.service_id,
            business.name,
          ),
        };
        await bookingRepository.saveIdempotencyResponse(scopeKey, 'cancel_appointment', ok(body));
        return body;
      }

      await bookingRepository.cancelAppointment(appointment.id);
      appointment.status = 'cancelled';
      const body = {
        appointment_id: appointment.id,
        status: 'cancelled',
        message: input.reason ? `Cancelled: ${input.reason}` : 'Appointment cancelled.',
        appointment: this.toPublicAppointment(
          appointment,
          service?.name ?? appointment.service_id,
          business.name,
        ),
      };
      await bookingRepository.saveIdempotencyResponse(scopeKey, 'cancel_appointment', ok(body));
      return body;
    });
    log('info', {
      business_id: business.id,
      operation: 'cancel_appointment',
      appointment_id: input.appointment_id,
    });
    return response;
  }

  private async lockResourcesForAppointment(appointment: Appointment): Promise<void> {
    const resourceIds = appointment.resource_allocations.map((r) => r.resource_id);
    await bookingRepository.lockResources(resourceIds);
  }

  private async assertResourcesFree(
    businessId: string,
    appointment: Appointment,
    excludeAppointmentId?: string,
    options?: { alreadyLocked?: boolean },
  ): Promise<void> {
    if (!options?.alreadyLocked) {
      await this.lockResourcesForAppointment({
        ...appointment,
        id: excludeAppointmentId ?? appointment.id,
        business_id: businessId,
      });
    }

    const appointments = (await bookingRepository.listAppointments(businessId, ['confirmed', 'requested'])).filter(
      (item) => item.id !== excludeAppointmentId,
    );
    const blocked = await bookingRepository.listBlockedTimes(businessId);
    const start = new Date(appointment.starts_at);
    const end = new Date(appointment.ends_at);

    for (const allocation of appointment.resource_allocations) {
      for (const existing of appointments) {
        if (!isAppointmentActive(existing)) continue;
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

  private toPublicAppointment(appointment: Appointment, serviceName: string, businessName: string): PublicAppointment {
    const human = appointment.resource_allocations.find((r) =>
      ['hvac_technician', 'plumber', 'stylist', 'therapist', 'automotive_technician', 'cleaner', 'technician', 'provider'].includes(
        r.resource_type,
      ) || Boolean(r.resource_name),
    );
    const providerName = human?.resource_name ?? null;

    let nextSteps: string[];
    if (appointment.status === 'requested') {
      nextSteps = [
        `Appointment request submitted for ${appointment.starts_at}.`,
        providerName
          ? `Assigned professional: ${providerName}.`
          : `Service will be fulfilled by ${businessName}.`,
        `To inspect or cancel, use get_appointment or cancel_appointment with appointment_id: ${appointment.id}.`,
      ];
    } else if (appointment.status === 'confirmed') {
      nextSteps = [
        `Service is confirmed for ${appointment.starts_at}.`,
        providerName
          ? `Assigned professional: ${providerName}.`
          : `Service will be fulfilled by ${businessName}.`,
        `To inspect, reschedule, or cancel, use get_appointment, reschedule_appointment, or cancel_appointment with appointment_id: ${appointment.id}.`,
      ];
    } else if (appointment.status === 'cancelled') {
      nextSteps = [
        'Appointment was cancelled.',
        'To schedule a new appointment, query availability using check_availability.',
      ];
    } else {
      nextSteps = [
        `Appointment status: ${appointment.status}.`,
        `Contact ${businessName} for further questions.`,
      ];
    }

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
      provider: providerName,
      price: { amount: appointment.price_cents / 100, currency: appointment.currency },
      customer: {
        name: appointment.customer.name,
        email: appointment.customer.email ?? null,
        phone: appointment.customer.phone ?? null,
      },
      notes: appointment.notes ?? null,
      cancellable: appointment.status === 'requested' || appointment.status === 'confirmed',
      next_steps: nextSteps,
    };
  }
}

export const bookingService = new BookingService();

export function handleServiceError(error: unknown) {
  return toErrorResponse(error);
}

export type BookingServiceResult<T> = ReturnType<typeof ok<T>> | ReturnType<typeof toErrorResponse>;
