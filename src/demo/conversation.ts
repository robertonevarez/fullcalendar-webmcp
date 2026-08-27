import { AppError, ErrorCodes, toErrorResponse } from '@/domain/errors';
import { DemoBookingEngine, emptyConversationState } from '@/demo/engine';
import {
  formatPriceCents,
  formatSlotTimeOnly,
  formatSlotWhen,
} from '@/demo/format';
import { matchSlotBySpokenTime, parseCustomerIntent } from '@/demo/intent';
import type {
  DemoActivityResult,
  DemoActivityStep,
  DemoActivityTarget,
  DemoConversationState,
  DemoPendingOffer,
  DemoPublicAppointment,
  DemoTurnRequest,
  DemoTurnResponse,
} from '@/demo/types';

function activityStep(
  id: string,
  label: string,
  target: DemoActivityTarget,
  options?: {
    detail?: string;
    tool?: string;
    result?: DemoActivityResult;
  },
): DemoActivityStep {
  return {
    id,
    label,
    target,
    detail: options?.detail,
    tool: options?.tool,
    result: options?.result,
  };
}

function friendlyError(error: unknown): string {
  if (error instanceof AppError) {
    switch (error.code) {
      case ErrorCodes.OUTSIDE_SERVICE_AREA:
        return "That location is outside this business's service area. Try a ZIP they serve, or update the service area in your setup.";
      case ErrorCodes.LOCATION_REQUIRED:
        return 'I need a ZIP code to check whether they can come to you.';
      case ErrorCodes.NO_AVAILABILITY:
        return "I couldn't find an open time that matches. Try another day, a wider window, or adjust the business hours.";
      case ErrorCodes.SLOT_UNAVAILABLE:
      case ErrorCodes.RESOURCE_UNAVAILABLE:
        return 'That time is no longer available. Ask me to check openings again.';
      case ErrorCodes.SERVICE_NOT_FOUND:
        return "I couldn't match that to a service this business offers. Try describing the job in different words.";
      case ErrorCodes.VALIDATION_ERROR:
        return error.message;
      default:
        return "I couldn't complete that request. Try rephrasing, or reset the demo and start again.";
    }
  }
  return "Something unexpected happened. Reset the demo if things feel stuck.";
}

function toPublicAppointment(
  engine: DemoBookingEngine,
  appointment: DemoConversationState['appointments'][number],
  serviceName: string,
): DemoPublicAppointment {
  const provider = appointment.resource_allocations[0];
  return {
    appointment_id: appointment.id,
    service_name: serviceName,
    starts_at: appointment.starts_at,
    ends_at: appointment.ends_at,
    price_cents: appointment.price_cents,
    currency: appointment.currency,
    provider_name: provider?.resource_name,
    postal_code: appointment.customer.service_address?.postal_code,
  };
}

function offerReply(engine: DemoBookingEngine, offer: DemoPendingOffer): string {
  const price = formatPriceCents(offer.price_cents, offer.currency);
  const times = offer.slots
    .slice(0, 3)
    .map((slot) => formatSlotTimeOnly(slot.starts_at, engine.timezone));
  const whenDay = formatSlotWhen(offer.slots[0].starts_at, engine.timezone).replace(/ at .*$/, '');
  const timeList =
    times.length === 1
      ? times[0]
      : times.length === 2
        ? `${times[0]} and ${times[1]}`
        : `${times.slice(0, -1).join(', ')}, and ${times[times.length - 1]}`;

  return `${engine.businessName} offers ${offer.service_name} for ${price}. I found openings ${whenDay} at ${timeList}.\n\nWould you like me to book one?`;
}

function tryConfirm(
  engine: DemoBookingEngine,
  conversation: DemoConversationState,
  message: string,
): DemoTurnResponse | null {
  if (conversation.phase !== 'awaiting_confirmation' || !conversation.pendingOffer) {
    return null;
  }

  const intent = parseCustomerIntent(message, {
    timeZone: engine.timezone,
    workingHours: engine.normalized.business.working_hours,
  });

  if (!intent.looksLikeConfirmation && !intent.chosenTimeHm) {
    return null;
  }

  const offer = conversation.pendingOffer;
  let slotIndex = matchSlotBySpokenTime(offer.slots, intent.chosenTimeHm, engine.timezone);

  const lower = message.toLowerCase();
  if (slotIndex < 0 && /\b(first|yes|book|confirm|go ahead|sounds good|perfect)\b/.test(lower)) {
    slotIndex = 0;
  }
  if (slotIndex < 0 && /\bsecond\b/.test(lower) && offer.slots.length > 1) {
    slotIndex = 1;
  }

  if (slotIndex < 0) {
    return {
      ok: true,
      reply: `Which time works for you — ${offer.slots
        .slice(0, 3)
        .map((s) => formatSlotTimeOnly(s.starts_at, engine.timezone))
        .join(' or ')}?`,
      conversation,
      activity: [],
      businessNotice: null,
    };
  }

  const slot = offer.slots[slotIndex];
  const service = engine.getService(offer.service_id);
  const { appointment, appointments } = engine.createAppointment({
    appointments: conversation.appointments,
    service_id: offer.service_id,
    slot,
    postal_code: offer.postal_code,
    customer: {
      name: 'Demo Customer',
      email: 'customer@example.com',
      service_address: offer.postal_code
        ? {
            line1: 'Customer location',
            city: 'Austin',
            region: 'TX',
            postal_code: offer.postal_code,
          }
        : undefined,
    },
    notes: { description: message },
  });

  const lastBooking = toPublicAppointment(engine, appointment, service.name);
  const when = formatSlotWhen(appointment.starts_at, engine.timezone);

  const nextState: DemoConversationState = {
    phase: 'booked',
    appointments,
    pendingOffer: null,
    lastBooking,
  };

  return {
    ok: true,
    reply: `You're booked for ${when}. ${service.name} is confirmed with ${engine.businessName}.`,
    conversation: nextState,
    activity: [
      activityStep('create_appointment', 'Create appointment', 'booking', {
        detail: 'Confirmed',
        tool: 'create_appointment',
        result: {
          service_name: service.name,
          when_label: when.charAt(0).toUpperCase() + when.slice(1),
          provider_name: lastBooking.provider_name,
        },
      }),
    ],
    businessNotice: {
      headline: 'New appointment',
      service_name: service.name,
      when_label: when.charAt(0).toUpperCase() + when.slice(1),
      notification_email: engine.notificationEmail,
      provider_name: lastBooking.provider_name,
    },
  };
}

function findAndOffer(
  engine: DemoBookingEngine,
  conversation: DemoConversationState,
  message: string,
): DemoTurnResponse {
  const intent = parseCustomerIntent(message, {
    timeZone: engine.timezone,
    workingHours: engine.normalized.business.working_hours,
  });

  const activity: DemoActivityStep[] = [];

  const matches = engine.search(intent.serviceQuery);
  if (!matches.length) {
    const catalog = engine.search();
    activity.push(
      activityStep('search_services', 'Search services', 'services', {
        detail: 'No match',
        tool: 'search_services',
        result: { query: intent.serviceQuery },
      }),
    );
    throw Object.assign(
      new AppError(
        ErrorCodes.SERVICE_NOT_FOUND,
        catalog.length
          ? `No matching service. This business offers: ${catalog.map((s) => s.name).join(', ')}.`
          : 'No services are configured.',
        false,
      ),
      { activity },
    );
  }

  const best = matches[0];
  const service = engine.getService(best.service_id);
  activity.push(
    activityStep('search_services', 'Search services', 'services', {
      detail: service.name,
      tool: 'search_services',
      result: {
        query: intent.serviceQuery,
        service_name: service.name,
        price_label: formatPriceCents(service.price_cents, service.currency),
        duration_minutes: service.duration_minutes,
      },
    }),
  );

  if (service.service_area_required && !intent.postalCode) {
    activity.push(
      activityStep('check_service_area', 'Check service area', 'service_area', {
        detail: 'ZIP needed',
        tool: 'check_service_area',
      }),
    );
    throw Object.assign(
      new AppError(ErrorCodes.LOCATION_REQUIRED, 'Postal code is required.', false, 'postal_code'),
      { activity },
    );
  }

  if (service.service_area_required && intent.postalCode) {
    try {
      engine.assertServiceArea(service.id, intent.postalCode);
      activity.push(
        activityStep('check_service_area', 'Check service area', 'service_area', {
          detail: `${intent.postalCode} eligible`,
          tool: 'check_service_area',
          result: { postal_code: intent.postalCode, eligible: true },
        }),
      );
    } catch (error) {
      activity.push(
        activityStep('check_service_area', 'Check service area', 'service_area', {
          detail: `${intent.postalCode} not eligible`,
          tool: 'check_service_area',
          result: { postal_code: intent.postalCode, eligible: false },
        }),
      );
      throw Object.assign(error instanceof Error ? error : new Error(String(error)), { activity });
    }
  }

  let slots;
  try {
    slots = engine.findSlots(conversation.appointments, {
      service_id: service.id,
      start_date: intent.startDate,
      end_date: intent.endDate,
      postal_code: intent.postalCode,
      time_preference: intent.timePreference,
      limit: 4,
    });
  } catch (error) {
    activity.push(
      activityStep('get_availability', 'Find availability', 'availability', {
        detail: 'None found',
        tool: 'get_availability',
        result: {
          query: intent.timePreference,
          slot_labels: [],
        },
      }),
    );
    throw Object.assign(error instanceof Error ? error : new Error(String(error)), { activity });
  }

  const slotLabels = slots
    .slice(0, 3)
    .map((slot) => formatSlotTimeOnly(slot.starts_at, engine.timezone));

  activity.push(
    activityStep('get_availability', 'Find availability', 'availability', {
      detail: `${slots.length} time${slots.length === 1 ? '' : 's'} found`,
      tool: 'get_availability',
      result: {
        query: intent.timePreference,
        slot_labels: slotLabels,
      },
    }),
  );

  const pendingOffer: DemoPendingOffer = {
    service_id: service.id,
    service_name: service.name,
    price_cents: service.price_cents,
    currency: service.currency,
    postal_code: intent.postalCode,
    time_preference: intent.timePreference,
    start_date: intent.startDate,
    end_date: intent.endDate,
    slots,
  };

  const nextState: DemoConversationState = {
    ...conversation,
    phase: 'awaiting_confirmation',
    pendingOffer,
  };

  return {
    ok: true,
    reply: offerReply(engine, pendingOffer),
    conversation: nextState,
    activity,
    businessNotice: null,
  };
}

/**
 * One conversation turn for the product demo.
 * Read path may run autonomously; writes only after clear confirmation.
 */
export function processDemoTurn(request: DemoTurnRequest): DemoTurnResponse {
  const message = request.message?.trim();
  if (!message) {
    throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Say what you need in a short message.', false);
  }

  const engine = new DemoBookingEngine(request.config);
  const conversation = request.conversation ?? emptyConversationState();

  const confirmed = tryConfirm(engine, conversation, message);
  if (confirmed) return confirmed;

  return findAndOffer(engine, conversation, message);
}

export function processDemoTurnSafe(
  request: DemoTurnRequest,
): DemoTurnResponse | {
  ok: false;
  error: { code: string; message: string };
  reply: string;
  activity: DemoActivityStep[];
} {
  try {
    return processDemoTurn(request);
  } catch (error) {
    const envelope = toErrorResponse(error);
    const activity =
      error && typeof error === 'object' && 'activity' in error
        ? ((error as { activity?: DemoActivityStep[] }).activity ?? [])
        : [];
    return {
      ok: false,
      error: {
        code: envelope.error.code,
        message: envelope.error.message,
      },
      reply: friendlyError(error),
      activity,
    };
  }
}

export { emptyConversationState };
