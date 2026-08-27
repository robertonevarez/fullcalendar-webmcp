import { describe, expect, it } from 'vitest';
import type { DemoActivityStep } from '@/demo/types';
import { playVisualSequence } from '@/demo/visual-sequence';

function step(
  id: string,
  label: string,
  target: DemoActivityStep['target'],
): DemoActivityStep {
  return { id, label, target, tool: id };
}

describe('demo visual sequence', () => {
  it('plays orchestration steps in order without inventing extras', async () => {
    const phases: string[] = [];
    const seen: string[] = [];
    const activity = [
      step('search_services', 'Search services', 'services'),
      step('check_service_area', 'Check service area', 'service_area'),
      step('get_availability', 'Find availability', 'availability'),
    ];

    await playVisualSequence({
      activity,
      reducedMotion: true,
      onPhase: (phase) => phases.push(phase),
      onStep: (s) => {
        if (s) seen.push(s.id);
      },
    });

    expect(seen).toEqual([
      'search_services',
      'check_service_area',
      'get_availability',
    ]);
    expect(phases).toContain('entering');
    expect(phases).toContain('operating');
    expect(phases).toContain('returning');
    expect(phases.at(-1)).toBe('idle');
  });

  it('skips visualization when activity is empty', async () => {
    const seen: string[] = [];
    await playVisualSequence({
      activity: [],
      reducedMotion: true,
      onPhase: () => undefined,
      onStep: (s) => {
        if (s) seen.push(s.id);
      },
    });
    expect(seen).toEqual([]);
  });
});
