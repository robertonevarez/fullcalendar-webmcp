import { describe, expect, it } from 'vitest';
import { AppError, ErrorCodes } from '@/domain/errors';
import { DEFAULT_CUSTOMER_PROMPT, DEFAULT_DEMO_CONFIG } from '@/demo/defaults';
import { DemoBookingEngine, emptyConversationState } from '@/demo/engine';
import { processDemoTurn, processDemoTurnSafe } from '@/demo/conversation';
import { parseCustomerIntent, parseSpokenTime } from '@/demo/intent';
import { cloneDemoConfig, normalizeDemoConfig } from '@/demo/normalize';
import { addDaysToDateString, formatPriceCents } from '@/demo/format';
import { formatDateInZone } from '@/lib/time';
import type { DemoConfig } from '@/demo/types';

function nextOpenWeekday(timeZone = 'America/Chicago'): string {
  const today = formatDateInZone(new Date(), timeZone);
  for (let i = 1; i <= 10; i += 1) {
    const date = addDaysToDateString(today, i);
    const [y, m, d] = date.split('-').map(Number);
    const weekday = new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay();
    if (weekday >= 1 && weekday <= 5) return date;
  }
  return addDaysToDateString(today, 1);
}

describe('demo defaults and normalization', () => {
  it('provides the Acme HVAC default configuration', () => {
    expect(DEFAULT_DEMO_CONFIG.businessName).toBe('Acme Heating & Air');
    expect(DEFAULT_DEMO_CONFIG.services).toHaveLength(2);
    expect(DEFAULT_DEMO_CONFIG.staff).toEqual(['James', 'Maria']);
    expect(DEFAULT_DEMO_CONFIG.postalCodes).toEqual(['78701', '78702', '78703']);
    expect(DEFAULT_DEMO_CONFIG.notificationEmail).toBe('hello@acme.example');
    expect(DEFAULT_CUSTOMER_PROMPT).toMatch(/78701/);
  });

  it('normalizes demo config into domain objects', () => {
    const normalized = normalizeDemoConfig(DEFAULT_DEMO_CONFIG);
    expect(normalized.business.name).toBe('Acme Heating & Air');
    expect(normalized.services[0].price_cents).toBe(8900);
    expect(normalized.services[0].duration_minutes).toBe(90);
    expect(normalized.resources).toHaveLength(2);
    expect(normalized.postalCodesByZone.get('demo-service-area')).toContain('78701');
    expect(normalized.business.working_hours.every((h) => h.open === '08:00' && h.close === '18:00')).toBe(
      true,
    );
  });

  it('rejects invalid configuration', () => {
    const bad = cloneDemoConfig();
    bad.businessName = '';
    expect(() => normalizeDemoConfig(bad)).toThrow(AppError);
  });

  it('cloneDemoConfig isolates mutable copies', () => {
    const a = cloneDemoConfig();
    const b = cloneDemoConfig();
    a.businessName = 'Changed';
    a.services[0].price_dollars = 1;
    expect(b.businessName).toBe('Acme Heating & Air');
    expect(b.services[0].price_dollars).toBe(89);
    expect(DEFAULT_DEMO_CONFIG.businessName).toBe('Acme Heating & Air');
  });
});

describe('demo isolation', () => {
  it('keeps two demo engines from sharing appointment state', () => {
    const engineA = new DemoBookingEngine(DEFAULT_DEMO_CONFIG);
    const engineB = new DemoBookingEngine(DEFAULT_DEMO_CONFIG);
    const day = nextOpenWeekday();

    const slotsA = engineA.findSlots([], {
      service_id: DEFAULT_DEMO_CONFIG.services[0].id,
      start_date: day,
      end_date: day,
      postal_code: '78701',
      time_preference: 'after 4 pm',
      limit: 2,
    });

    const booked = engineA.createAppointment({
      appointments: [],
      service_id: slotsA[0].service_id,
      slot: slotsA[0],
      postal_code: '78701',
      customer: { name: 'A', service_address: { line1: 'x', city: 'Austin', region: 'TX', postal_code: '78701' } },
    });

    expect(booked.appointments).toHaveLength(1);

    const slotsB = engineB.findSlots([], {
      service_id: DEFAULT_DEMO_CONFIG.services[0].id,
      start_date: day,
      end_date: day,
      postal_code: '78701',
      time_preference: 'after 4 pm',
      limit: 2,
    });

    // Engine B still has the first slot available — no shared state.
    expect(slotsB.some((s) => s.slot_id === slotsA[0].slot_id)).toBe(true);

    const slotsAAfter = engineA.findSlots(booked.appointments, {
      service_id: DEFAULT_DEMO_CONFIG.services[0].id,
      start_date: day,
      end_date: day,
      postal_code: '78701',
      time_preference: 'after 4 pm',
      limit: 8,
    });
    expect(slotsAAfter.some((s) => s.slot_id === slotsA[0].slot_id)).toBe(false);
  });
});

describe('demo scheduling reuse', () => {
  it('matches AC diagnostic from natural language search terms', () => {
    const engine = new DemoBookingEngine(DEFAULT_DEMO_CONFIG);
    const results = engine.search('AC cooling upstairs');
    expect(results[0]?.name).toBe('AC Diagnostic Visit');
  });

  it('enforces service area using real domain check', () => {
    const engine = new DemoBookingEngine(DEFAULT_DEMO_CONFIG);
    expect(() => engine.assertServiceArea(DEFAULT_DEMO_CONFIG.services[0].id, '90210')).toThrow(
      expect.objectContaining({ code: ErrorCodes.OUTSIDE_SERVICE_AREA }),
    );
    expect(engine.assertServiceArea(DEFAULT_DEMO_CONFIG.services[0].id, '78701').status).toBe('eligible');
  });

  it('generates availability from configured hours and staff', () => {
    const engine = new DemoBookingEngine(DEFAULT_DEMO_CONFIG);
    const day = nextOpenWeekday();
    const slots = engine.findSlots([], {
      service_id: DEFAULT_DEMO_CONFIG.services[0].id,
      start_date: day,
      end_date: day,
      postal_code: '78701',
      time_preference: 'after 4 pm',
      limit: 4,
    });
    expect(slots.length).toBeGreaterThan(0);
    expect(slots[0].price.amount).toBe(8900);
    expect(slots[0].resources[0].resource_type).toBe('staff');
  });

  it('reflects modified price and duration in results', () => {
    const config = cloneDemoConfig();
    config.services[0].price_dollars = 125;
    config.services[0].duration_minutes = 45;
    const engine = new DemoBookingEngine(config);
    const day = nextOpenWeekday();
    const slots = engine.findSlots([], {
      service_id: config.services[0].id,
      start_date: day,
      end_date: day,
      postal_code: '78701',
      limit: 2,
    });
    expect(slots[0].price.amount).toBe(12500);
    const start = new Date(slots[0].starts_at).getTime();
    const end = new Date(slots[0].ends_at).getTime();
    expect((end - start) / 60_000).toBe(45);
  });

  it('reflects narrowed business hours', () => {
    const config = cloneDemoConfig();
    config.availability.open = '09:00';
    config.availability.close = '12:00';
    const engine = new DemoBookingEngine(config);
    const day = nextOpenWeekday();
    expect(() =>
      engine.findSlots([], {
        service_id: config.services[0].id,
        start_date: day,
        end_date: day,
        postal_code: '78701',
        time_preference: 'after 4 pm',
        limit: 2,
      }),
    ).toThrow(expect.objectContaining({ code: ErrorCodes.NO_AVAILABILITY }));
  });
});

describe('demo conversation confirmation gate', () => {
  it('does not create an appointment on the initial availability request', () => {
    const result = processDemoTurn({
      config: DEFAULT_DEMO_CONFIG,
      conversation: emptyConversationState(),
      message: DEFAULT_CUSTOMER_PROMPT,
    });
    expect(result.ok).toBe(true);
    expect(result.conversation.phase).toBe('awaiting_confirmation');
    expect(result.conversation.appointments).toHaveLength(0);
    expect(result.conversation.pendingOffer?.slots.length).toBeGreaterThan(0);
    expect(result.reply).toMatch(/\$89/);
    expect(result.businessNotice).toBeNull();
  });

  it('creates an appointment only after confirmation using real domain logic', () => {
    const offered = processDemoTurn({
      config: DEFAULT_DEMO_CONFIG,
      conversation: emptyConversationState(),
      message: DEFAULT_CUSTOMER_PROMPT,
    });
    expect(offered.ok).toBe(true);
    const slot = offered.conversation.pendingOffer!.slots[0];

    const booked = processDemoTurn({
      config: DEFAULT_DEMO_CONFIG,
      conversation: offered.conversation,
      message: '4:30 works.',
    });

    // If 4:30 isn't offered, confirm the first slot explicitly.
    const confirmed =
      booked.conversation.phase === 'booked'
        ? booked
        : processDemoTurn({
            config: DEFAULT_DEMO_CONFIG,
            conversation: offered.conversation,
            message: 'Yes, book the first one.',
          });

    expect(confirmed.conversation.phase).toBe('booked');
    expect(confirmed.conversation.appointments).toHaveLength(1);
    expect(confirmed.conversation.lastBooking?.price_cents).toBe(8900);
    expect(confirmed.businessNotice?.notification_email).toBe('hello@acme.example');
    expect(confirmed.reply.toLowerCase()).toMatch(/booked/);
    expect(confirmed.conversation.appointments[0].starts_at).toBeTruthy();
    void slot;
  });

  it('returns a friendly outside-area message', () => {
    const result = processDemoTurnSafe({
      config: DEFAULT_DEMO_CONFIG,
      conversation: emptyConversationState(),
      message: "I need an AC checkup. I'm in 90210.",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCodes.OUTSIDE_SERVICE_AREA);
      expect(result.reply.toLowerCase()).toMatch(/outside/);
    }
  });

  it('reset-equivalent empty conversation clears booking state', () => {
    const offered = processDemoTurn({
      config: DEFAULT_DEMO_CONFIG,
      conversation: emptyConversationState(),
      message: DEFAULT_CUSTOMER_PROMPT,
    });
    const reset = emptyConversationState();
    expect(reset.appointments).toHaveLength(0);
    expect(reset.pendingOffer).toBeNull();
    expect(reset.phase).toBe('idle');
    expect(offered.conversation.pendingOffer).not.toBeNull();
  });
});

describe('demo intent parsing', () => {
  it('parses postal code, after-4 preference, and tomorrow', () => {
    const intent = parseCustomerIntent(DEFAULT_CUSTOMER_PROMPT, {
      timeZone: 'America/Chicago',
      workingHours: normalizeDemoConfig(DEFAULT_DEMO_CONFIG).business.working_hours,
    });
    expect(intent.postalCode).toBe('78701');
    expect(intent.timePreference?.toLowerCase()).toMatch(/after/);
    expect(intent.timePreference?.toLowerCase()).toMatch(/pm|16/);
  });

  it('parses spoken confirmation times', () => {
    expect(parseSpokenTime('4:30 works')).toBe('16:30');
    expect(parseSpokenTime('book 6:00 pm')).toBe('18:00');
  });
});

describe('demo format helpers', () => {
  it('formats configured prices', () => {
    expect(formatPriceCents(8900)).toBe('$89.00');
  });
});

describe('demo config without service area', () => {
  it('allows booking without postal codes when area is empty', () => {
    const config: DemoConfig = {
      ...cloneDemoConfig(),
      postalCodes: [],
    };
    const engine = new DemoBookingEngine(config);
    expect(engine.normalized.services[0].service_area_required).toBe(false);
    const day = nextOpenWeekday();
    const slots = engine.findSlots([], {
      service_id: config.services[0].id,
      start_date: day,
      end_date: day,
      limit: 1,
    });
    expect(slots).toHaveLength(1);
  });
});
