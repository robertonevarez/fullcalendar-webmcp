import { describe, expect, it } from 'vitest';
import type { Business, Service } from '@/domain/types';
import {
  buildBookingDemoScenario,
  buildSuggestedBookingRequest,
  pickDemoService,
} from '@/lib/booking-demo-scenario';
import { bookingGuideMode } from '@/lib/chatgpt-booking-guide-mode';

const fieldBusiness: Business = {
  id: 'biz_marias_cleaning',
  slug: 'marias-cleaning',
  name: "Maria's Cleaning Service",
  description: 'Residential cleaning',
  timezone: 'America/Denver',
  location_mode: 'CUSTOMER_LOCATION',
  working_hours: [
    { day: 1, open: '08:00', close: '17:00' },
    { day: 2, open: '08:00', close: '17:00' },
  ],
  address: {
    line1: '4120 Rio Bravo St',
    city: 'El Paso',
    region: 'TX',
    postal_code: '79902',
  },
};

const salonBusiness: Business = {
  id: 'biz_northline_salon',
  slug: 'northline-salon',
  name: 'Northline Salon',
  description: 'Hair and spa',
  timezone: 'America/Chicago',
  location_mode: 'BUSINESS_LOCATION',
  working_hours: [
    { day: 2, open: '10:00', close: '19:00' },
    { day: 3, open: '10:00', close: '19:00' },
  ],
  address: {
    line1: '1200 Congress Ave',
    city: 'Austin',
    region: 'TX',
    postal_code: '78701',
  },
};

function service(
  partial: Pick<Service, 'id' | 'name' | 'price_cents'> & Partial<Service>,
): Service {
  return {
    business_id: 'biz',
    description: '',
    duration_minutes: 60,
    currency: 'USD',
    keywords: [],
    location_policy: 'CUSTOMER',
    service_area_required: false,
    resource_requirements: [],
    intake_fields: [],
    ...partial,
  };
}

describe('pickDemoService', () => {
  it('returns null for an empty catalog', () => {
    expect(pickDemoService([])).toBeNull();
  });

  it('prefers a mid/high-ticket service', () => {
    const services = [
      service({ id: 'a', name: 'Standard Cleaning', price_cents: 12000 }),
      service({ id: 'b', name: 'Deep Cleaning', price_cents: 18000 }),
      service({ id: 'c', name: 'Move-Out Cleaning', price_cents: 25000 }),
    ];
    const picked = pickDemoService(services);
    expect(picked?.name).toBe('Deep Cleaning');
  });
});

describe('buildBookingDemoScenario', () => {
  it('builds a field-service scenario with service-area language', () => {
    const services = [
      service({
        id: 'svc_deep',
        name: 'Deep Cleaning',
        price_cents: 18000,
        duration_minutes: 180,
        service_area_required: true,
        location_policy: 'CUSTOMER',
      }),
    ];
    const scenario = buildBookingDemoScenario(fieldBusiness, services);

    expect(scenario.customerRequest).toContain('deep cleaning');
    expect(scenario.customerRequest).toContain('Tuesday afternoon');
    expect(scenario.serviceLabel).toBe('Deep Cleaning');
    expect(scenario.priceLabel).toBe('$180');
    expect(scenario.locationKind).toBe('service_area');
    expect(scenario.locationDetail).toContain('79902');
    expect(scenario.scheduleDetail).toContain('Tuesday');
    expect(scenario.takeaway).toContain('AI agent');
    expect(scenario.summaryLines.some((line) => line.label === 'Business')).toBe(true);
  });

  it('builds an on-site scenario without service-area language', () => {
    const services = [
      service({
        id: 'svc_cut',
        name: 'Signature Cut',
        price_cents: 6500,
        location_policy: 'BUSINESS',
        service_area_required: false,
      }),
    ];
    const scenario = buildBookingDemoScenario(salonBusiness, services);

    expect(scenario.customerRequest).toContain('Northline Salon');
    expect(scenario.locationKind).toBe('business_location');
    expect(scenario.locationDetail).toContain('Austin');
    expect(scenario.locationDetail.toLowerCase()).not.toContain('eligible');
  });

  it('handles empty services and quote pricing', () => {
    const empty = buildBookingDemoScenario(fieldBusiness, []);
    expect(empty.service).toBeNull();
    expect(empty.serviceLabel).toBe('No services listed yet');

    const quote = buildBookingDemoScenario(fieldBusiness, [
      service({ id: 'q', name: 'Custom Job', price_cents: 0 }),
    ]);
    expect(quote.priceLabel).toBe('Quote');
  });
});

describe('buildSuggestedBookingRequest', () => {
  it('matches the demo customer request', () => {
    const services = [
      service({
        id: 'svc_deep',
        name: 'Deep Cleaning',
        price_cents: 18000,
        service_area_required: true,
      }),
    ];
    expect(buildSuggestedBookingRequest(fieldBusiness, services)).toBe(
      buildBookingDemoScenario(fieldBusiness, services).customerRequest,
    );
  });
});

describe('bookingGuideMode', () => {
  it('keeps waiting and registering as checking', () => {
    expect(
      bookingGuideMode({ phase: 'waiting', supported: false, attempted: false }),
    ).toBe('checking');
    expect(
      bookingGuideMode({ phase: 'registering', supported: true, attempted: true }),
    ).toBe('checking');
  });

  it('maps registered to ready and failed to unavailable', () => {
    expect(
      bookingGuideMode({
        phase: 'registered',
        supported: true,
        attempted: true,
        registered: ['get_services'],
        errors: [],
        businessSlug: 'marias-cleaning',
      }),
    ).toBe('ready');
    expect(
      bookingGuideMode({
        phase: 'failed',
        supported: false,
        attempted: true,
        registered: [],
        errors: [],
        businessSlug: 'marias-cleaning',
      }),
    ).toBe('unavailable');
  });
});
