'use client';

import { useState } from 'react';
import type { DemoActivityStep } from '@/demo/types';
import { cn } from '@/lib/utils';
import { Badge, CheckIcon, RetryIcon, SpinnerRing, XIcon } from '@/components/demo/task-rows';

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

interface TaskItem {
  key: string;
  badge: React.ReactNode;
  label: string;
  amount: string;
  pill: React.ReactNode;
  details: Array<{ label: string; meta: string }>;
  active?: boolean;
}

export function AgentInteractionOverlay({
  step,
  status,
  completedSteps = [],
  className,
}: Props) {
  const [manualOpen, setManualOpen] = useState<Record<string, boolean>>({});
  const isRunning = status === 'running';
  const target = step.target;
  const result = step.result;
  const eligible = result?.eligible;

  const hasSearch = completedSteps.some((s) => s.target === 'services') || target === 'services';
  const hasArea = completedSteps.some((s) => s.target === 'service_area') || target === 'service_area';
  const hasAvail = completedSteps.some((s) => s.target === 'availability') || target === 'availability';
  const hasBooking = completedSteps.some((s) => s.target === 'booking') || target === 'booking';

  const searchStep = completedSteps.find((s) => s.target === 'services') ?? (target === 'services' ? step : undefined);
  const areaStep = completedSteps.find((s) => s.target === 'service_area') ?? (target === 'service_area' ? step : undefined);
  const availStep = completedSteps.find((s) => s.target === 'availability') ?? (target === 'availability' ? step : undefined);
  const bookingStep = completedSteps.find((s) => s.target === 'booking') ?? (target === 'booking' ? step : undefined);

  const rows: TaskItem[] = [];

  // Row 1: Search services
  if (hasSearch || (!hasAvail && !hasBooking)) {
    const isCurrent = target === 'services';
    const isDone = completedSteps.some((s) => s.target === 'services') || (isCurrent && !isRunning);
    const searchName = searchStep?.result?.service_name ?? 'AC Diagnostic Visit';
    const price = searchStep?.result?.price_label ?? '$89';
    const dur = searchStep?.result?.duration_minutes ? `${searchStep.result.duration_minutes} min` : '90 min';

    rows.push({
      key: 'services',
      badge: isDone ? (
        <Badge tone="green">{CheckIcon}</Badge>
      ) : (
        <SpinnerRing active={isCurrent && isRunning}>1</SpinnerRing>
      ),
      label: isCurrent && isRunning ? 'Finding the right service' : searchName,
      amount: `${price} · ${dur}`,
      pill: isDone ? (
        <span className="inline-flex h-5.5 items-center rounded-full bg-green-tint px-2 text-[12px] font-medium text-green">
          Completed
        </span>
      ) : null,
      details: [
        {
          label: isCurrent && isRunning && searchStep?.result?.query
            ? `Matching "${searchStep.result.query}"`
            : 'Query matching',
          meta: searchStep?.result?.query ?? 'AC cooling upstairs',
        },
        { label: 'Tool operation', meta: 'search_services' },
      ],
      active: isCurrent,
    });
  }

  // Row 2: Check service area
  if (hasArea) {
    const isCurrent = target === 'service_area';
    const isDone = completedSteps.some((s) => s.target === 'service_area') || (isCurrent && !isRunning);
    const isFailed = areaStep?.result?.eligible === false;

    rows.push({
      key: 'service_area',
      badge: isFailed ? (
        <Badge tone="red">{XIcon}</Badge>
      ) : isDone ? (
        <Badge tone="green">{CheckIcon}</Badge>
      ) : (
        <SpinnerRing active={isCurrent && isRunning}>2</SpinnerRing>
      ),
      label: isCurrent && isRunning
        ? 'Checking service area'
        : isFailed
          ? `Not available in ${areaStep?.result?.postal_code ?? '90210'}`
          : `Available in ${areaStep?.result?.postal_code ?? '78701'}`,
      amount: areaStep?.result?.postal_code ?? '78701',
      pill: isFailed ? (
        <span className="inline-flex h-5.5 items-center gap-1.5 rounded-full bg-red-tint px-2 text-[12px] font-medium text-red">
          Failed <span style={{ animation: 'spin 1.2s linear infinite' }} className="flex">{RetryIcon}</span>
        </span>
      ) : isDone ? (
        <span className="inline-flex h-5.5 items-center rounded-full bg-green-tint px-2 text-[12px] font-medium text-green">
          Completed
        </span>
      ) : null,
      details: [
        {
          label: isFailed ? (step.detail ?? `${areaStep?.result?.postal_code} is outside the service area`) : 'Postal code coverage',
          meta: areaStep?.result?.postal_code ?? '78701',
        },
        { label: 'Tool operation', meta: 'check_service_area' },
      ],
      active: isCurrent,
    });
  }

  // Row 3: Availability
  if (hasAvail) {
    const isCurrent = target === 'availability';
    const isDone = completedSteps.some((s) => s.target === 'availability') || (isCurrent && !isRunning);
    const slots = availStep?.result?.slot_labels ?? ['4:00 PM', '4:15 PM', '4:30 PM'];

    rows.push({
      key: 'availability',
      badge: isDone ? (
        <Badge tone="green">{CheckIcon}</Badge>
      ) : (
        <SpinnerRing active={isCurrent && isRunning}>1</SpinnerRing>
      ),
      label: isCurrent && isRunning ? 'Finding available times' : 'Available tomorrow',
      amount: `${slots.length} times`,
      pill: isDone ? (
        <span className="inline-flex h-5.5 items-center rounded-full bg-green-tint px-2 text-[12px] font-medium text-green">
          Completed
        </span>
      ) : null,
      details: [
        { label: 'Matching openings', meta: slots.join(' · ') },
        { label: 'Tool operation', meta: 'get_availability' },
      ],
      active: isCurrent,
    });
  }

  // Row 4: Booking
  if (hasBooking) {
    const isCurrent = target === 'booking';
    const isDone = completedSteps.some((s) => s.target === 'booking') || (isCurrent && !isRunning);

    rows.push({
      key: 'booking',
      badge: isDone ? (
        <Badge tone="green">{CheckIcon}</Badge>
      ) : (
        <SpinnerRing active={isCurrent && isRunning}>1</SpinnerRing>
      ),
      label: isCurrent && isRunning ? 'Booking appointment' : 'Appointment confirmed',
      amount: 'Confirmed',
      pill: isDone ? (
        <span className="inline-flex h-5.5 items-center rounded-full bg-green-tint px-2 text-[12px] font-medium text-green">
          Confirmed
        </span>
      ) : null,
      details: [
        { label: 'Service item', meta: bookingStep?.result?.service_name ?? 'AC Diagnostic Visit' },
        { label: 'Scheduled time', meta: bookingStep?.result?.when_label ?? 'Tomorrow at 4:30 PM' },
        { label: `Technician: ${bookingStep?.result?.provider_name ?? 'James'}`, meta: 'assigned' },
        { label: 'Tool operation', meta: 'create_appointment' },
      ],
      active: isCurrent,
    });
  }

  // Fallback if empty
  if (!rows.length) {
    rows.push({
      key: step.id,
      badge: <SpinnerRing active={isRunning}>1</SpinnerRing>,
      label: step.label,
      amount: step.detail ?? '',
      pill: null,
      details: [{ label: 'Tool operation', meta: step.tool ?? step.id }],
    });
  }

  return (
    <div
      role="status"
      aria-live="polite"
      data-demo-target="overlay"
      data-demo-overlay-target={target}
      data-demo-overlay-status={status}
      className={cn('flex w-full max-w-110 flex-col min-h-[196px] gap-2', className)}
    >
      {rows.map((row, i) => {
        const open = manualOpen[row.key] ?? row.active;
        return (
          <div
            key={row.key}
            className="self-stretch overflow-hidden bg-surface shadow-card transition-[border-radius,background-color] duration-300 hover:bg-inset"
            style={{
              borderRadius: open ? 14 : 22,
              animation: `fade-up 450ms cubic-bezier(0.23,1,0.32,1) ${i * 80}ms both`,
            }}
          >
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setManualOpen((current) => ({ ...current, [row.key]: !open }))}
              className="flex h-11 w-full items-center gap-2.5 px-2.5 text-left"
            >
              <span className="flex size-6 shrink-0 items-center justify-center">
                {row.badge}
              </span>
              <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">
                {row.label}
              </span>
              <span className="text-[13px] text-ink-2 tabular-nums">{row.amount}</span>
              {row.pill}
              <span
                aria-hidden="true"
                className="-ml-2 flex size-7 shrink-0 items-center justify-center rounded-full text-ink-3"
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-transform duration-300"
                  style={{ transform: open ? 'rotate(180deg)' : 'rotate(0)' }}
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </span>
            </button>

            {/* dropdown detail — expandable grammar */}
            <div
              className="grid transition-[grid-template-rows,opacity] duration-300"
              style={{
                gridTemplateRows: open ? '1fr' : '0fr',
                opacity: open ? 1 : 0,
                transitionTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)',
              }}
            >
              <div className="overflow-hidden">
                <div className="mb-2.5 grid grid-cols-[24px_1fr] gap-2.5 px-2.5">
                  <span aria-hidden className="mx-auto h-full w-px bg-line" />
                  <div className="flex flex-col gap-1.5">
                    {row.details.map((d, j) => (
                      <div
                        key={d.label}
                        className="flex items-center justify-between"
                        style={
                          open
                            ? { animation: `fade-up 300ms cubic-bezier(0.23,1,0.32,1) ${120 + j * 100}ms both` }
                            : undefined
                        }
                      >
                        <span className="text-[13px] text-ink-2">{d.label}</span>
                        <span className="font-mono text-[12.5px] text-ink-3 tabular-nums">
                          {d.meta}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
