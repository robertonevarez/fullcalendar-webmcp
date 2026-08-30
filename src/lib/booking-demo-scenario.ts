import type { Business, Service, WorkingHours } from '@/domain/types';

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

export type BookingDemoLocationKind = 'service_area' | 'business_location' | 'flexible';

export interface BookingDemoScenario {
  customerRequest: string;
  service: Service | null;
  serviceLabel: string;
  priceLabel: string;
  locationKind: BookingDemoLocationKind;
  locationTitle: string;
  locationDetail: string;
  scheduleLabel: string;
  scheduleDetail: string;
  summaryLines: { label: string; value: string }[];
  takeaway: string;
}

function formatPrice(cents: number, currency: string = 'USD'): string {
  if (cents <= 0) return 'Quote';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatClock(hhmm: string): string {
  const [hourRaw, minuteRaw] = hhmm.split(':');
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: minute === 0 ? undefined : '2-digit',
  }).format(date);
}

/** Prefer a mid/high-ticket service with a clear name; fall back to first. */
export function pickDemoService(services: Service[]): Service | null {
  if (services.length === 0) return null;
  const priced = [...services].sort((a, b) => a.price_cents - b.price_cents);
  if (priced.length === 1) return priced[0] ?? null;
  // Prefer second-highest when available (often the “flagship” offering).
  const index = Math.min(priced.length - 1, Math.max(1, Math.floor(priced.length * 0.66)));
  return priced[index] ?? priced[priced.length - 1] ?? null;
}

function buildCustomerRequest(business: Business, service: Service | null): string {
  const serviceName = service?.name ?? 'an appointment';
  if (business.location_mode === 'CUSTOMER_LOCATION') {
    return `I need a ${serviceName.toLowerCase()} next Tuesday afternoon.`;
  }
  return `Book a ${serviceName.toLowerCase()} next Tuesday afternoon at ${business.name}.`;
}

function locationStep(
  business: Business,
  service: Service | null,
): Pick<BookingDemoScenario, 'locationKind' | 'locationTitle' | 'locationDetail'> {
  const place = `${business.address.city}, ${business.address.region}`;

  if (
    business.location_mode === 'CUSTOMER_LOCATION' ||
    service?.service_area_required === true
  ) {
    const sampleZip = business.address.postal_code || 'local area';
    return {
      locationKind: 'service_area',
      locationTitle: 'Checks where the business operates',
      locationDetail: `Eligible in the ${place} area (example ZIP ${sampleZip}).`,
    };
  }

  if (business.location_mode === 'BUSINESS_LOCATION') {
    const address = business.address.line1
      ? `${business.address.line1}, ${place}`
      : place;
    return {
      locationKind: 'business_location',
      locationTitle: 'Confirms the visit location',
      locationDetail: `At ${business.name} in ${address}.`,
    };
  }

  return {
    locationKind: 'flexible',
    locationTitle: 'Confirms how the visit works',
    locationDetail: `Can meet at ${business.name} or come to you in ${place}.`,
  };
}

function pickAfternoonSlot(hours: WorkingHours[]): {
  dayName: string;
  startLabel: string;
  endLabel: string;
} | null {
  if (hours.length === 0) return null;

  // Prefer Tuesday (2), then any weekday with afternoon coverage.
  const preferredDays = [2, 3, 4, 1, 5, 6, 0];
  for (const day of preferredDays) {
    const entry = hours.find((h) => h.day === day);
    if (!entry) continue;
    const [openH] = entry.open.split(':').map(Number);
    const [closeH, closeM] = entry.close.split(':').map(Number);
    if (closeH < 13 && !(closeH === 13 && (closeM ?? 0) > 0)) continue;

    const startHour = Math.max(openH ?? 9, 13);
    if (startHour >= (closeH ?? 17)) continue;

    const start = `${String(startHour).padStart(2, '0')}:00`;
    return {
      dayName: DAY_NAMES[day] ?? 'Tuesday',
      startLabel: formatClock(start),
      endLabel: formatClock(entry.close),
    };
  }

  const first = hours[0];
  if (!first) return null;
  return {
    dayName: DAY_NAMES[first.day] ?? 'weekday',
    startLabel: formatClock(first.open),
    endLabel: formatClock(first.close),
  };
}

function scheduleStep(
  business: Business,
  service: Service | null,
): Pick<BookingDemoScenario, 'scheduleLabel' | 'scheduleDetail'> {
  const slot = pickAfternoonSlot(business.working_hours ?? []);
  const duration = service?.duration_minutes;

  if (!slot) {
    return {
      scheduleLabel: 'Checks the schedule',
      scheduleDetail: `Looks for an open time in ${business.timezone}.`,
    };
  }

  const durationPart =
    typeof duration === 'number' && duration > 0 ? ` · about ${duration} minutes` : '';

  return {
    scheduleLabel: 'Checks the schedule',
    scheduleDetail: `Representative opening: ${slot.dayName} ${slot.startLabel} (${business.timezone})${durationPart}. Not live inventory.`,
  };
}

/**
 * Build a representative, read-only guided demo from page props.
 * Does not call APIs or mutate scheduling state.
 */
export function buildBookingDemoScenario(
  business: Business,
  services: Service[],
): BookingDemoScenario {
  const service = pickDemoService(services);
  const priceLabel = service ? formatPrice(service.price_cents, service.currency) : '—';
  const location = locationStep(business, service);
  const schedule = scheduleStep(business, service);
  const slot = pickAfternoonSlot(business.working_hours ?? []);

  const summaryLines: { label: string; value: string }[] = [
    { label: 'Business', value: business.name },
    {
      label: 'Service',
      value: service?.name ?? 'No services listed',
    },
  ];

  if (service) {
    summaryLines.push({ label: 'Price', value: priceLabel });
  }

  if (slot) {
    summaryLines.push({
      label: 'Time',
      value: `${slot.dayName} ${slot.startLabel}`,
    });
  }

  summaryLines.push({
    label: 'Location',
    value:
      location.locationKind === 'business_location'
        ? `${business.address.city}, ${business.address.region}`
        : `${business.address.city}, ${business.address.region} area`,
  });

  return {
    customerRequest: buildCustomerRequest(business, service),
    service,
    serviceLabel: service?.name ?? 'No services listed yet',
    priceLabel,
    ...location,
    ...schedule,
    summaryLines,
    takeaway:
      'With an AI agent, your customer can handle these steps directly from their conversation.',
  };
}

/** Natural-language booking example for the ChatGPT guide (same data rules). */
export function buildSuggestedBookingRequest(
  business: Business,
  services: Service[],
): string {
  return buildBookingDemoScenario(business, services).customerRequest;
}
