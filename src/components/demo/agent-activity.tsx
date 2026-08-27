'use client';

import { useEffect, useRef } from 'react';
import type { DemoActivityStep } from '@/demo/types';
import { cn } from '@/lib/utils';

type Props = {
  steps: DemoActivityStep[];
  activeStepId: string | null;
  className?: string;
};

function quoted(value?: string): string | null {
  return value ? JSON.stringify(value) : null;
}

function TerminalInput({ step }: { step: DemoActivityStep }) {
  const result = step.result;
  let line: string | null = null;

  if (step.target === 'services') line = result?.query ? `query: ${quoted(result.query)}` : null;
  if (step.target === 'service_area') {
    line = result?.postal_code ? `postal_code: ${result.postal_code}` : null;
  }
  if (step.target === 'availability') {
    line = result?.query ? `after: ${quoted(result.query)}` : null;
  }
  if (step.target === 'booking') {
    line = result?.when_label ? `when: ${result.when_label}` : null;
  }

  return line ? <p className="pl-5 text-[0.68rem] leading-5 text-zinc-400">{line}</p> : null;
}

function TerminalResult({ step }: { step: DemoActivityStep }) {
  const result = step.result;

  if (step.target === 'services') {
    if (result?.service_name) {
      return (
        <div className="mt-1 space-y-0.5">
          <p className="text-[0.72rem] leading-5 text-emerald-300">
            <span aria-hidden>✓</span>{' '}
            {result.service_id ?? result.service_name}
          </p>
          <p className="pl-5 text-[0.72rem] leading-5 text-zinc-100">{result.service_name}</p>
          {(result.price_label || result.duration_minutes) ? (
            <p className="pl-5 text-[0.68rem] leading-5 text-zinc-400">
              {[result.price_label, result.duration_minutes ? `${result.duration_minutes} min` : null]
                .filter(Boolean)
                .join(' · ')}
            </p>
          ) : null}
        </div>
      );
    }

    return (
      <p className="mt-1 text-[0.72rem] leading-5 text-red-300">
        <span aria-hidden>✗</span> outside_catalog
      </p>
    );
  }

  if (step.target === 'service_area') {
    return (
      <p className={cn('mt-1 text-[0.72rem] leading-5', result?.eligible === false ? 'text-red-300' : 'text-emerald-300')}>
        <span aria-hidden>{result?.eligible === false ? '✗' : '✓'}</span>{' '}
        {result?.eligible === false ? 'outside_service_area' : result?.eligible === true ? 'eligible' : step.detail}
      </p>
    );
  }

  if (step.target === 'availability') {
    const labels = result?.slot_labels ?? [];
    if (!labels.length) {
      return (
        <p className="mt-1 text-[0.72rem] leading-5 text-red-300">
          <span aria-hidden>✗</span> no_slots
        </p>
      );
    }
    return (
      <div className="mt-1 space-y-0.5 text-[0.72rem] leading-5">
        <p className="text-emerald-300"><span aria-hidden>✓</span> {labels.length} slots</p>
        <ul className="pl-5 text-zinc-100 tabular-nums">
          {labels.map((label) => <li key={label}>{label}</li>)}
        </ul>
      </div>
    );
  }

  if (step.target === 'booking') {
    return (
      <div className="mt-1 space-y-0.5 text-[0.72rem] leading-5">
        <p className="text-emerald-300"><span aria-hidden>✓</span> confirmed</p>
        {result?.service_id ? <p className="pl-5 text-zinc-400">service: {result.service_id}</p> : null}
        {result?.service_name && !result.service_id ? <p className="pl-5 text-zinc-100">{result.service_name}</p> : null}
        {result?.provider_name ? <p className="pl-5 text-zinc-400">provider: {result.provider_name}</p> : null}
      </div>
    );
  }

  return <p className="mt-1 text-[0.72rem] leading-5 text-zinc-100">{step.detail ?? 'complete'}</p>;
}

function TerminalEntry({ step }: { step: DemoActivityStep }) {
  return (
    <>
      <p className="text-[0.72rem] font-semibold leading-5 text-zinc-100">
        <span className="mr-2 text-zinc-500" aria-hidden>&gt;</span>
        {step.tool ?? step.label}
      </p>
      <TerminalInput step={step} />
      <TerminalResult step={step} />
    </>
  );
}

/**
 * A small visual terminal for the structured capabilities underneath the
 * storefront. Every entry is supplied by the real demo turn activity.
 */
export function AgentActivity({ steps, activeStepId, className }: Props) {
  const activeEntryRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (activeStepId) activeEntryRef.current?.scrollIntoView({ block: 'start' });
  }, [activeStepId, steps.length]);

  return (
    <section
      className={cn('flex h-full min-h-0 flex-col bg-zinc-950 font-mono text-zinc-100', className)}
      aria-label="Agent activity terminal"
    >
      <div className="shrink-0 border-b border-zinc-800 px-5 py-3 md:px-6">
        <p className="text-[0.68rem] font-medium tracking-tight text-zinc-300">protocol-tooling://agent</p>
      </div>

      <div
        className="min-h-0 flex-1 overflow-y-auto px-5 py-4 md:px-6"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
      >
        {steps.length === 0 ? (
          <p className="text-[0.72rem] leading-5 text-zinc-500">waiting for agent request...</p>
        ) : (
          <ol className="space-y-3">
            {steps.map((step) => (
              <li
                key={step.id}
                ref={step.id === activeStepId ? activeEntryRef : undefined}
                data-demo-target={`activity-${step.id}`}
                data-demo-step={step.id}
                className={cn('scroll-mt-2 rounded-sm px-1 py-0.5 transition-colors', step.id === activeStepId && 'bg-white/5')}
              >
                <TerminalEntry step={step} />
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
