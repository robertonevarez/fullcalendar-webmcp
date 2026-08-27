import type { DemoActivityStep } from '@/demo/types';

export type VisualPhase = 'idle' | 'entering' | 'operating' | 'returning';

const TRAVEL_MS = 550;
const STEP_MS = 950;
const SETTLE_MS = 350;

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const id = window.setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        window.clearTimeout(id);
        reject(new DOMException('Aborted', 'AbortError'));
      },
      { once: true },
    );
  });
}

/**
 * Plays a visual sequence derived from real orchestration activity.
 * No fake timeline — only steps present in the turn response.
 */
export async function playVisualSequence(options: {
  activity: DemoActivityStep[];
  reducedMotion: boolean;
  signal?: AbortSignal;
  onPhase: (phase: VisualPhase) => void;
  onStep: (step: DemoActivityStep | null) => void;
}): Promise<void> {
  const { activity, reducedMotion, signal, onPhase, onStep } = options;
  const travel = reducedMotion ? 0 : TRAVEL_MS;
  const stepHold = reducedMotion ? 0 : STEP_MS;
  const settle = reducedMotion ? 0 : SETTLE_MS;

  if (!activity.length) {
    onPhase('idle');
    onStep(null);
    return;
  }

  onPhase('entering');
  onStep(null);
  await wait(travel, signal);

  onPhase('operating');
  for (const step of activity) {
    onStep(step);
    await wait(stepHold, signal);
  }

  onPhase('returning');
  onStep(null);
  await wait(settle + travel, signal);

  onPhase('idle');
}
