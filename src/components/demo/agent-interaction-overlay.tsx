'use client';

import { motion } from 'motion/react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  Search,
  Sparkles,
  XCircle,
} from 'lucide-react';
import type { DemoActivityStep } from '@/demo/types';
import { cn } from '@/lib/utils';

export type StepStatus = 'running' | 'resolved';

export interface VisualStepEvent {
  step: DemoActivityStep;
  status: StepStatus;
  completedSteps: DemoActivityStep[];
}

type Props = {
  step: DemoActivityStep;
  status: StepStatus;
  completedSteps?: DemoActivityStep[];
  reducedMotion?: boolean;
  className?: string;
};

function getPrimaryLabel(step: DemoActivityStep, status: StepStatus): string {
  if (status === 'running') {
    switch (step.target) {
      case 'services':
        return 'Finding the right service';
      case 'service_area':
        return 'Checking service area';
      case 'availability':
        return 'Finding available times';
      case 'booking':
        return 'Booking appointment';
      default:
        return step.label;
    }
  }

  // Resolved state
  switch (step.target) {
    case 'services':
      return step.result?.service_name ?? 'Service found';
    case 'service_area':
      return step.result?.eligible === false
        ? `Not available in ${step.result.postal_code ?? 'requested area'}`
        : `Available in ${step.result?.postal_code ?? 'service area'}`;
    case 'availability':
      return 'Available tomorrow';
    case 'booking':
      return 'Appointment confirmed';
    default:
      return step.label;
  }
}

function getRunningDetail(step: DemoActivityStep): string {
  const result = step.result;
  switch (step.target) {
    case 'services':
      return result?.query ? `Matching "${result.query}"…` : 'Searching service catalog…';
    case 'service_area':
      return result?.postal_code ? `Verifying coverage for ${result.postal_code}…` : 'Checking service area…';
    case 'availability':
      return result?.query ? `Finding openings ${result.query}…` : 'Checking business openings…';
    case 'booking':
      return 'Creating appointment…';
    default:
      return 'Communicating with website…';
  }
}

function TargetIcon({ target, status, eligible }: { target: string; status: StepStatus; eligible?: boolean }) {
  if (status === 'running') {
    return <Loader2 className="size-4 animate-spin text-foreground/70" />;
  }

  if (target === 'service_area' && eligible === false) {
    return <XCircle className="size-4 text-muted-foreground" />;
  }

  switch (target) {
    case 'services':
      return <Search className="size-4 text-foreground/80" />;
    case 'service_area':
      return <MapPin className="size-4 text-emerald-600 dark:text-emerald-400" />;
    case 'availability':
      return <Calendar className="size-4 text-foreground/80" />;
    case 'booking':
      return <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />;
    default:
      return <Sparkles className="size-4 text-foreground/80" />;
  }
}

export function AgentInteractionOverlay({
  step,
  status,
  completedSteps = [],
  reducedMotion = false,
  className,
}: Props) {
  const isRunning = status === 'running';
  const result = step.result;
  const target = step.target;
  const eligible = result?.eligible;

  // Detect grouped read summary (e.g. search + service_area completed)
  const isGroupedReadSummary =
    target === 'service_area' &&
    status === 'resolved' &&
    completedSteps.some((s) => s.target === 'services');

  const searchStep = completedSteps.find((s) => s.target === 'services');
  const serviceName = searchStep?.result?.service_name ?? result?.service_name;
  const priceLabel = searchStep?.result?.price_label ?? result?.price_label;
  const durationMinutes = searchStep?.result?.duration_minutes ?? result?.duration_minutes;

  return (
    <motion.div
      role="status"
      aria-live="polite"
      data-demo-target="overlay"
      data-demo-overlay-target={target}
      data-demo-overlay-status={status}
      initial={reducedMotion ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.96, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: -4 }}
      transition={{ duration: reducedMotion ? 0.05 : 0.22, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'w-full max-w-sm rounded-2xl border border-border/80 bg-background/95 p-5 shadow-2xl backdrop-blur-md text-foreground',
        className,
      )}
    >
      {/* Header with human-readable title and tool badge */}
      <div className="flex items-start justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted/80">
            <TargetIcon target={target} status={status} eligible={eligible} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold tracking-tight text-foreground truncate">
              {getPrimaryLabel(step, status)}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {isRunning ? 'Agent accessing capability' : 'Website capability resolved'}
            </p>
          </div>
        </div>

        {step.tool ? (
          <span className="shrink-0 font-mono text-[11px] px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border/50">
            {step.tool}
          </span>
        ) : null}
      </div>

      {/* Body content */}
      <div className="pt-3.5">
        {isRunning ? (
          <div className="flex items-center gap-2.5 py-1">
            <div className="flex gap-1" aria-hidden>
              <span className="size-1.5 rounded-full bg-foreground/40 animate-pulse" />
              <span className="size-1.5 rounded-full bg-foreground/40 animate-pulse [animation-delay:150ms]" />
              <span className="size-1.5 rounded-full bg-foreground/40 animate-pulse [animation-delay:300ms]" />
            </div>
            <p className="text-xs text-muted-foreground">{getRunningDetail(step)}</p>
          </div>
        ) : isGroupedReadSummary && eligible !== false ? (
          /* Consolidated Grouped Read Summary */
          <div className="space-y-2.5">
            <div>
              <p className="text-base font-semibold tracking-tight text-foreground">
                {serviceName}
              </p>
              {(priceLabel || durationMinutes) ? (
                <p className="text-xs font-medium text-muted-foreground">
                  {[priceLabel, durationMinutes ? `${durationMinutes} min` : null]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              ) : null}
            </div>
            <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <span aria-hidden>✓</span>
              <span>Available in {result?.postal_code ?? '78701'}</span>
            </div>
          </div>
        ) : target === 'services' ? (
          /* Services Result */
          <div className="space-y-1">
            <p className="text-base font-semibold tracking-tight text-foreground">
              {result?.service_name ?? 'AC Diagnostic Visit'}
            </p>
            {(result?.price_label || result?.duration_minutes) ? (
              <p className="text-xs font-medium text-muted-foreground">
                {[result.price_label, result.duration_minutes ? `${result.duration_minutes} min` : null]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            ) : null}
          </div>
        ) : target === 'service_area' ? (
          /* Service Area Result */
          <div>
            {eligible === false ? (
              <div className="rounded-lg bg-muted/60 p-2.5 border border-border/40">
                <p className="text-xs font-medium text-muted-foreground">
                  {step.detail ?? `Postal code ${result?.postal_code} is outside this business's service area.`}
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <span aria-hidden>✓</span>
                <span>Available in {result?.postal_code ?? '78701'}</span>
              </div>
            )}
          </div>
        ) : target === 'availability' ? (
          /* Availability Slots Result */
          <div className="space-y-2.5">
            <p className="text-xs text-muted-foreground">Openings matching request:</p>
            <div className="flex flex-wrap gap-2">
              {(result?.slot_labels ?? ['4:00 PM', '4:15 PM', '4:30 PM']).map((slot) => (
                <span
                  key={slot}
                  className="inline-flex items-center rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground border border-border/60"
                >
                  <Clock className="mr-1.5 size-3 text-muted-foreground" />
                  {slot}
                </span>
              ))}
            </div>
          </div>
        ) : target === 'booking' ? (
          /* Booking Confirmation Result */
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-4" />
              <span>Confirmed</span>
            </div>
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-foreground">
                {result?.service_name ?? 'AC Diagnostic Visit'}
              </p>
              <p className="text-xs text-muted-foreground">
                {result?.when_label ?? 'Tomorrow · 4:30 PM'}
              </p>
              {result?.provider_name ? (
                <p className="text-xs text-muted-foreground">
                  Technician: {result.provider_name}
                </p>
              ) : null}
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">{step.detail ?? 'Complete'}</p>
        )}
      </div>
    </motion.div>
  );
}
