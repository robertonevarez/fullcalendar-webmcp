import { describe, expect, it } from 'vitest';
import { AppError, ErrorCodes } from '@/domain/errors';
import { DEFAULT_CUSTOMER_PROMPT, DEFAULT_DEMO_CONFIG } from '@/demo/defaults';
import { DemoBookingEngine, emptyConversationState } from '@/demo/engine';
import { processDemoTurn, processDemoTurnSafe } from '@/demo/conversation';
import { parseCustomerIntent, parseSpokenTime } from '@/demo/intent';
import { cloneDemoConfig, normalizeDemoConfig } from '@/demo/normalize';
import {
  DEFAULT_PRESET_ID,
  DEMO_PRESETS,
  getDemoPreset,
  getDefaultPreset,
} from '@/demo/presets';
import { addDaysToDateString, formatPriceCents } from '@/demo/format';
import { formatDateInZone } from '@/lib/time';

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

describe('demo presets', () => {
  it('ships three curated presets with Acme as default', () => {
    expect(DEMO_PRESETS).toHaveLength(3);
    expect(DEFAULT_PRESET_ID).toBe('acme-hvac');
    expect(getDefaultPreset().id).toBe('acme-hvac');
    expect(getDefaultPreset().config.businessName).toBe('Acme Heating & Air');
    expect(DEFAULT_DEMO_CONFIG.archetype).toBe('field_service');
    expect(DEFAULT_CUSTOMER_PROMPT).toMatch(/78701/);
  });

  it('normalizes each archetype into domain objects', () => {
    const acme = normalizeDemoConfig(getDemoPreset('acme-hvac').config);
    expect(acme.services[0].service_area_required).toBe(true);
    expect(acme.resources[0].resource_type).toBe('staff');

    const salon = normalizeDemoConfig(getDemoPreset('northline-salon').config);
    expect(salon.services[0].service_area_required).toBe(false);
    expect(salon.resources[0].resource_type).toBe('stylist');

    const auto = normalizeDemoConfig(getDemoPreset('mesa-auto').config);
    expect(auto.services[0].resource_requirements).toHaveLength(2);
    expect(auto.resources.some((r) => r.resource_type === 'service_bay')).toBe(true);
  });

  it('cloneDemoConfig isolates mutable copies', () => {
    const a = cloneDemoConfig(getDefaultPreset().config);
    const b = cloneDemoConfig(getDefaultPreset().config);
    a.businessName = 'Changed';
    expect(b.businessName).toBe('Acme Heating & Air');
  });
});

describe('demo isolation', () => {
  it('keeps two demo engines from sharing appointment state', () => {
    const config = getDefaultPreset().config;
    const engineA = new DemoBookingEngine(config);
    const engineB = new DemoBookingEngine(config);
    const day = nextOpenWeekday();

    const slotsA = engineA.findSlots([], {
      service_id: config.services[0].id,
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
      service_id: config.services[0].id,
      start_date: day,
      end_date: day,
      postal_code: '78701',
      time_preference: 'after 4 pm',
      limit: 2,
    });

    expect(slotsB.some((s) => s.slot_id === slotsA[0].slot_id)).toBe(true);
  });

  it('does not leak appointments when switching preset configs', () => {
    const acme = getDemoPreset('acme-hvac').config;
    const salon = getDemoPreset('northline-salon').config;
    const day = nextOpenWeekday();

    const acmeEngine = new DemoBookingEngine(acme);
    const slots = acmeEngine.findSlots([], {
      service_id: acme.services[0].id,
      start_date: day,
      end_date: day,
      postal_code: '78701',
      limit: 1,
    });
    const { appointments } = acmeEngine.createAppointment({
      appointments: [],
      service_id: slots[0].service_id,
      slot: slots[0],
      postal_code: '78701',
      customer: { name: 'A' },
    });
    expect(appointments).toHaveLength(1);

    const salonEngine = new DemoBookingEngine(salon);
    const salonSlots = salonEngine.findSlots([], {
      service_id: salon.services[0].id,
      start_date: day,
      end_date: day,
      time_preference: 'morning',
      limit: 2,
    });
    expect(salonSlots.length).toBeGreaterThan(0);
  });
});

describe('demo scheduling reuse', () => {
  it('matches AC diagnostic from natural language search terms', () => {
    const engine = new DemoBookingEngine(getDefaultPreset().config);
    const results = engine.search('AC cooling upstairs');
    expect(results[0]?.name).toBe('AC Diagnostic Visit');
  });

  it('enforces service area using real domain check', () => {
    const config = getDefaultPreset().config;
    const engine = new DemoBookingEngine(config);
    expect(() => engine.assertServiceArea(config.services[0].id, '90210')).toThrow(
      expect.objectContaining({ code: ErrorCodes.OUTSIDE_SERVICE_AREA }),
    );
    expect(engine.assertServiceArea(config.services[0].id, '78701').status).toBe('eligible');
  });

  it('generates salon availability without postal code', () => {
    const config = getDemoPreset('northline-salon').config;
    const engine = new DemoBookingEngine(config);
    const day = nextOpenWeekday();
    const slots = engine.findSlots([], {
      service_id: config.services[0].id,
      start_date: day,
      end_date: day,
      time_preference: 'morning',
      limit: 2,
    });
    expect(slots.length).toBeGreaterThan(0);
    expect(slots[0].price.amount).toBe(4500);
    expect(slots[0].resources[0].resource_type).toBe('stylist');
  });

  it('allocates technician and service bay for auto oil change', () => {
    const config = getDemoPreset('mesa-auto').config;
    const engine = new DemoBookingEngine(config);
    const day = nextOpenWeekday();
    const slots = engine.findSlots([], {
      service_id: config.services[0].id,
      start_date: day,
      end_date: day,
      time_preference: 'morning',
      limit: 2,
    });
    expect(slots.length).toBeGreaterThan(0);
    const types = slots[0].resources.map((r) => r.resource_type).sort();
    expect(types).toEqual(['automotive_technician', 'service_bay']);
  });
});

describe('demo conversation confirmation gate', () => {
  it('does not create an appointment on the initial availability request', () => {
    const config = getDefaultPreset().config;
    const result = processDemoTurn({
      config,
      conversation: emptyConversationState(),
      message: getDefaultPreset().customerPrompt,
    });
    expect(result.ok).toBe(true);
    expect(result.conversation.phase).toBe('awaiting_confirmation');
    expect(result.conversation.appointments).toHaveLength(0);
    expect(result.reply).toMatch(/\$89/);
    expect(result.activity.map((s) => s.label)).toEqual([
      'Search services',
      'Check service area',
      'Find availability',
    ]);
    expect(result.activity.map((s) => s.target)).toEqual([
      'services',
      'service_area',
      'availability',
    ]);
    expect(result.activity[0]?.detail).toMatch(/AC Diagnostic/);
    expect(result.activity[0]?.result?.service_name).toMatch(/AC Diagnostic/);
    expect(result.activity[1]?.detail).toMatch(/78701 eligible/);
    expect(result.activity[1]?.result?.eligible).toBe(true);
    expect(result.activity[2]?.detail).toMatch(/time/);
    expect(result.activity[2]?.result?.slot_labels?.length).toBeGreaterThan(0);
  });

  it('creates an appointment only after confirmation using real domain logic', () => {
    const config = getDefaultPreset().config;
    const offered = processDemoTurn({
      config,
      conversation: emptyConversationState(),
      message: getDefaultPreset().customerPrompt,
    });

    const booked = processDemoTurn({
      config,
      conversation: offered.conversation,
      message: '4:30 works.',
    });

    const confirmed =
      booked.conversation.phase === 'booked'
        ? booked
        : processDemoTurn({
            config,
            conversation: offered.conversation,
            message: 'Yes, book the first one.',
          });

    expect(confirmed.conversation.phase).toBe('booked');
    expect(confirmed.conversation.appointments).toHaveLength(1);
    expect(confirmed.businessNotice?.notification_email).toBe('hello@acme.example');
    expect(confirmed.businessNotice?.headline).toBe('Appointment received');
    expect(confirmed.activity.map((s) => s.label)).toEqual(['Create appointment']);
    expect(confirmed.activity[0]?.target).toBe('booking');
    expect(confirmed.activity[0]?.detail).toBe('Confirmed');
    expect(confirmed.activity[0]?.result?.when_label).toBeTruthy();
  });

  it('books salon preset through confirmation gate', () => {
    const preset = getDemoPreset('northline-salon');
    const offered = processDemoTurn({
      config: preset.config,
      conversation: emptyConversationState(),
      message: preset.customerPrompt,
    });
    expect(offered.ok).toBe(true);

    const confirmed = processDemoTurn({
      config: preset.config,
      conversation: offered.conversation,
      message: 'Yes, book the first one.',
    });
    expect(confirmed.conversation.phase).toBe('booked');
  });

  it('returns a friendly outside-area message', () => {
    const result = processDemoTurnSafe({
      config: getDefaultPreset().config,
      conversation: emptyConversationState(),
      message: "I need an AC checkup. I'm in 90210.",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCodes.OUTSIDE_SERVICE_AREA);
      expect(result.reply.toLowerCase()).toMatch(/outside/);
      expect(result.activity.some((s) => s.label === 'Check service area')).toBe(true);
      expect(result.activity.find((s) => s.label === 'Check service area')?.detail).toMatch(
        /90210 is outside the service area/,
      );
      expect(result.activity.find((s) => s.label === 'Check service area')?.result?.eligible).toBe(
        false,
      );
      expect(result.activity.some((s) => s.target === 'availability')).toBe(false);
    }
  });

  it('reset-equivalent empty conversation clears booking state', () => {
    const reset = emptyConversationState();
    expect(reset.appointments).toHaveLength(0);
    expect(reset.pendingOffer).toBeNull();
    expect(reset.phase).toBe('idle');
  });
});

describe('demo intent parsing', () => {
  it('parses postal code, after-4 preference, and tomorrow', () => {
    const intent = parseCustomerIntent(getDefaultPreset().customerPrompt, {
      timeZone: 'America/Chicago',
      workingHours: normalizeDemoConfig(getDefaultPreset().config).business.working_hours,
    });
    expect(intent.postalCode).toBe('78701');
    expect(intent.timePreference?.toLowerCase()).toMatch(/after/);
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

describe('demo config validation', () => {
  it('rejects invalid configuration', () => {
    const bad = cloneDemoConfig(getDefaultPreset().config);
    bad.businessName = '';
    expect(() => normalizeDemoConfig(bad)).toThrow(AppError);
  });
});
