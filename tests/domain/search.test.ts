import { describe, expect, it } from 'vitest';
import { searchServices } from '@/domain/search';
import { bookingRepository } from '@/db/repository';

describe('searchServices', () => {
  it('matches AC cooling keywords to AC Diagnostic', async () => {
    const services = await bookingRepository.listServices('biz_acme_hvac');
    const results = searchServices(services, 'AC is not cooling upstairs');
    expect(results[0]?.service_id).toBe('svc_ac_diagnostic');
    expect(results[0]?.score).toBeGreaterThan(0);
  });

  it('matches haircut query for salon', async () => {
    const services = await bookingRepository.listServices('biz_northline_salon');
    const results = searchServices(services, 'haircut');
    expect(results[0]?.service_id).toBe('svc_haircut');
  });
});
