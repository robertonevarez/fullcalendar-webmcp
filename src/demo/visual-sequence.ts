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

export type VisualSequenceTimings = {
  travelMs?: number;
  stepMs?: number;
  settleMs?: number;
};

/** Slightly longer holds for the self-driving walkthrough so tool results are readable. */
export const WALKTHROUGH_VISUAL_TIMINGS: Required<VisualSequenceTimings> = {
  travelMs: 650,
  stepMs: 1500,
  settleMs: 450,
};

/**
 * Plays a visual sequence derived from real orchestration activity.
 * No fake timeline — only steps present in the turn response.
 */
export async function playVisualSequence(options: {
  activity: DemoActivityStep[];
  reducedMotion: boolean;
  signal?: AbortSignal;
  timings?: VisualSequenceTimings;
  onPhase: (phase: VisualPhase) => void;
  onStep: (step: DemoActivityStep | null) => void;
}): Promise<void> {
  const { activity, reducedMotion, signal, timings, onPhase, onStep } = options;
  const travel = reducedMotion ? 0 : (timings?.travelMs ?? TRAVEL_MS);
  const stepHold = reducedMotion ? 0 : (timings?.stepMs ?? STEP_MS);
  const settle = reducedMotion ? 0 : (timings?.settleMs ?? SETTLE_MS);

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
