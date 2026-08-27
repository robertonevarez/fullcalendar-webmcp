'use client';

import type { DemoActivityStep } from '@/demo/types';
import { cn } from '@/lib/utils';

type Props = {
  steps: DemoActivityStep[];
  activeStepId: string | null;
  className?: string;
};

function ResultBody({ step }: { step: DemoActivityStep }) {
  const result = step.result;

  if (step.target === 'services') {
    if (result?.service_name) {
      return (
        <div className="mt-1.5 space-y-0.5 text-sm tracking-tight">
          <p>
            <span aria-hidden>✓ </span>
            {result.service_name}
          </p>
          {(result.price_label || result.duration_minutes) && (
            <p className="text-muted-foreground">
              {[result.price_label, result.duration_minutes ? `${result.duration_minutes} min` : null]
                .filter(Boolean)
                .join(' · ')}
            </p>
          )}
        </div>
      );
    }
    return (
      <p className="mt-1.5 text-sm tracking-tight text-muted-foreground">
        {step.detail ?? 'No match'}
      </p>
    );
  }

  if (step.target === 'service_area') {
    const failed = result?.eligible === false;
    const ok = result?.eligible === true;
    return (
      <p
        className={cn(
          'mt-1.5 text-sm tracking-tight',
          failed && 'text-destructive',
        )}
      >
        {failed ? (
          <>
            <span aria-hidden>× </span>
            {result?.postal_code
              ? `${result.postal_code} is outside the service area`
              : step.detail}
          </>
        ) : ok ? (
          <>
            <span aria-hidden>✓ </span>
            {result?.postal_code ? `${result.postal_code} eligible` : step.detail}
          </>
        ) : (
          step.detail
        )}
      </p>
    );
  }

  if (step.target === 'availability') {
    if (result?.slot_labels?.length) {
      return (
        <div className="mt-1.5 space-y-1 text-sm tracking-tight">
          <p>
            <span aria-hidden>✓ </span>
            {result.slot_labels.length} opening
            {result.slot_labels.length === 1 ? '' : 's'}
          </p>
          <ul className="space-y-0.5 tabular-nums text-muted-foreground">
            {result.slot_labels.map((label) => (
              <li key={label}>{label}</li>
            ))}
          </ul>
        </div>
      );
    }
    return (
      <p className="mt-1.5 text-sm tracking-tight text-muted-foreground">
        {step.detail ?? 'No openings'}
      </p>
    );
  }

  if (step.target === 'booking') {
    return (
      <div className="mt-1.5 space-y-0.5 text-sm tracking-tight">
        {result?.service_name ? <p>{result.service_name}</p> : null}
        {result?.when_label ? (
          <p className="text-muted-foreground">{result.when_label}</p>
        ) : null}
        {result?.provider_name ? (
          <p className="text-muted-foreground">{result.provider_name}</p>
        ) : null}
        <p>
          <span aria-hidden>✓ </span>
          {step.detail ?? 'Confirmed'}
        </p>
      </div>
    );
  }

  return step.detail ? (
    <p className="mt-1.5 text-sm tracking-tight text-muted-foreground">{step.detail}</p>
  ) : null;
}

/**
 * Progressive agent-activity surface — structured capabilities under the storefront.
 */
export function AgentActivity({ steps, activeStepId, className }: Props) {
  return (
    <section
      className={cn('flex h-full min-h-0 flex-col bg-muted/20', className)}
      aria-label="Agent activity"
    >
      <div className="border-b border-border/80 px-5 py-3 md:px-6">
        <h2 className="text-xs font-medium tracking-tight text-muted-foreground">
          Agent activity
        </h2>
      </div>

      <div
        className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4 md:px-6"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
      >
        {steps.length === 0 ? (
          <p className="text-sm tracking-tight text-muted-foreground">
            Waiting for a request…
          </p>
        ) : (
          steps.map((step) => {
            const current = step.id === activeStepId;
            return (
              <div
                key={step.id}
                data-demo-target={`activity-${step.id}`}
                data-demo-step={step.id}
                className={cn(
                  'scroll-mt-2 rounded-md px-2 py-1.5 -mx-2 transition-colors',
                  current && 'bg-background ring-1 ring-foreground/10',
                )}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-medium tracking-tight">{step.label}</p>
                  {step.tool ? (
                    <code className="text-[0.65rem] text-muted-foreground">{step.tool}</code>
                  ) : null}
                </div>
                <ResultBody step={step} />
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
