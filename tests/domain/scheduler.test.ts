import { describe, expect, it } from 'vitest';
import { bookingRepository } from '@/db/repository';
import { checkServiceArea, findAvailability } from '@/domain/scheduler';
import { AppError } from '@/domain/errors';

async function schedulerContext(businessId: string, serviceId: string) {
  const business = (await bookingRepository.getBusinessById(businessId))!;
  const service = (await bookingRepository.getService(businessId, serviceId))!;
  return {
    business,
    service,
    resources: await bookingRepository.listResources(businessId),
    appointments: await bookingRepository.listAppointments(businessId),
    blockedTimes: await bookingRepository.listBlockedTimes(businessId),
  };
}

async function zoneMap(businessId: string) {
  const zones = await bookingRepository.listServiceAreaZones(businessId);
  return new Map(zones.map((zone) => [zone.zone_id, zone.postal_codes]));
}

describe('scheduler', () => {
  it('validates HVAC service area and after-4 availability', async () => {
    const ctx = await schedulerContext('biz_acme_hvac', 'svc_ac_diagnostic');
    const area = checkServiceArea(
      'biz_acme_hvac',
      ctx.service,
      await zoneMap('biz_acme_hvac'),
      '78701',
    );
    expect(area.status).toBe('eligible');

    const slots = findAvailability(ctx, {
      service_id: 'svc_ac_diagnostic',
      start_date: '2026-08-26',
      end_date: '2026-08-26',
      time_preference: 'after 16:00',
      limit: 5,
    });
    expect(slots.length).toBeGreaterThan(0);
    for (const slot of slots) {
      expect(slot.resources).toHaveLength(1);
      expect(slot.resources[0].resource_type).toBe('hvac_technician');
    }
  });

  it('returns not_required for salon service area', async () => {
    const ctx = await schedulerContext('biz_northline_salon', 'svc_haircut');
    const area = checkServiceArea(
      'biz_northline_salon',
      ctx.service,
      await zoneMap('biz_northline_salon'),
    );
    expect(area.status).toBe('not_required');
  });

  it('requires technician and service bay for oil change', async () => {
    const ctx = await schedulerContext('biz_mesa_auto', 'svc_oil_change');
    const slots = findAvailability(ctx, {
      service_id: 'svc_oil_change',
      start_date: '2026-08-29',
      end_date: '2026-08-29',
      time_preference: 'morning',
      limit: 3,
    });
    expect(slots.length).toBeGreaterThan(0);
    for (const slot of slots) {
      const types = slot.resources.map((r) => r.resource_type).sort();
      expect(types).toEqual(['automotive_technician', 'service_bay']);
    }
  });

  it('respects existing auto appointment conflicts', async () => {
    const ctx = await schedulerContext('biz_mesa_auto', 'svc_oil_change');
    const slots = findAvailability(ctx, {
      service_id: 'svc_oil_change',
      start_date: '2026-08-29',
      end_date: '2026-08-29',
      time_preference: 'morning',
      limit: 20,
    });
    const conflict = slots.find(
      (slot) =>
        slot.resources.some((resource) => resource.resource_id === 'res_auto_maria') &&
        slot.starts_at === '2026-08-29T15:00:00.000Z',
    );
    expect(conflict).toBeUndefined();
  });

  it('rejects outside service area postal codes', async () => {
    const ctx = await schedulerContext('biz_blue_pipe', 'svc_drain_cleaning');
    const area = checkServiceArea(
      'biz_blue_pipe',
      ctx.service,
      await zoneMap('biz_blue_pipe'),
      '73301',
    );
    expect(area.status).toBe('ineligible');
  });

  it('allocates therapist and room for clinic service', async () => {
    const ctx = await schedulerContext('biz_harbor_pt', 'svc_pt_eval');
    const slots = findAvailability(ctx, {
      service_id: 'svc_pt_eval',
      start_date: '2026-08-27',
      end_date: '2026-08-27',
      limit: 2,
    });
    expect(slots.length).toBeGreaterThan(0);
    const types = slots[0].resources.map((r) => r.resource_type).sort();
    expect(types).toEqual(['therapist', 'treatment_room']);
  });
});

describe('scheduler errors', () => {
  it('throws for invalid date range', async () => {
    const ctx = await schedulerContext('biz_acme_hvac', 'svc_ac_diagnostic');
    expect(() =>
      findAvailability(ctx, {
        service_id: 'svc_ac_diagnostic',
        start_date: '2026-08-28',
        end_date: '2026-08-26',
      }),
    ).toThrow(AppError);
  });
});
