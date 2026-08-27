'use client';

import { useId, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { formatDaysLabel, formatHoursLabel, formatSlotWhen } from '@/demo/format';
import type { DemoConfig, DemoPublicAppointment } from '@/demo/types';
import { cn } from '@/lib/utils';

type Props = {
  config: DemoConfig;
  blurb?: string;
  lastBooking: DemoPublicAppointment | null;
  notificationEmail: string;
  className?: string;
};

function formatServicePrice(dollars: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: Number.isInteger(dollars) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(dollars);
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-medium tracking-tight text-muted-foreground">{label}</h4>
      <div className="text-sm tracking-tight">{children}</div>
    </div>
  );
}

export function BusinessTruthPanel({
  config,
  blurb,
  lastBooking,
  notificationEmail,
  className,
}: Props) {
  const detailsId = useId();
  const [detailsOpen, setDetailsOpen] = useState(false);

  const teamLabel =
    config.archetype === 'auto' ? 'Technicians' : config.archetype === 'salon' ? 'Stylists' : 'Staff';
  const bookedService = lastBooking?.service_name ?? null;

  return (
    <aside
      className={cn('flex min-h-0 flex-col bg-muted/30 p-4 md:p-5', className)}
      aria-label="What agents can see"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-medium tracking-tight text-muted-foreground">
            What agents can see
          </p>
          <h3 className="text-lg font-medium tracking-tight text-balance">{config.businessName}</h3>
          {blurb ? (
            <p className="text-sm tracking-tight text-muted-foreground">{blurb}</p>
          ) : null}
        </div>
        <button
          type="button"
          className={cn(
            'inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium tracking-tight text-muted-foreground outline-none md:hidden',
            'hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
          )}
          aria-expanded={detailsOpen}
          aria-controls={detailsId}
          onClick={() => setDetailsOpen((open) => !open)}
        >
          {detailsOpen ? 'Hide' : 'Details'}
          <ChevronDown
            className={cn('size-3.5 transition-transform', detailsOpen && 'rotate-180')}
            aria-hidden
          />
        </button>
      </div>

      <div
        id={detailsId}
        className={cn('mt-5 space-y-5', detailsOpen ? 'block' : 'hidden md:block')}
      >
        <Field label="Services">
          <ul className="space-y-2">
            {config.services.map((service) => {
              const highlighted = bookedService === service.name;
              return (
                <li
                  key={service.id}
                  className={cn(
                    '-mx-2 rounded-md px-2 py-1.5 transition-colors',
                    highlighted && 'bg-background shadow-xs',
                  )}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-medium">{service.name}</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {formatServicePrice(service.price_dollars)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {service.duration_minutes} min
                  </p>
                </li>
              );
            })}
          </ul>
        </Field>

        <Field label={teamLabel}>
          <ul className="space-y-1">
            {config.staff.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        </Field>

        {config.facilities?.length ? (
          <Field label="Service bays">
            <ul className="space-y-1">
              {config.facilities.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          </Field>
        ) : null}

        <Field label="Hours">
          <p>{formatDaysLabel(config.availability.days)}</p>
          <p className="text-muted-foreground">
            {formatHoursLabel(config.availability.open, config.availability.close)}
          </p>
        </Field>

        {config.postalCodes.length ? (
          <Field label="Service area">
            <p className="tabular-nums">{config.postalCodes.join(', ')}</p>
          </Field>
        ) : null}
      </div>

      <div className="mt-5 border-t border-border pt-4 md:mt-auto">
        {lastBooking ? (
          <div className="space-y-2" role="status" aria-live="polite">
            <p className="flex items-center gap-1.5 text-sm font-medium tracking-tight">
              <Check className="size-4" aria-hidden />
              Appointment booked
            </p>
            <p className="text-sm tracking-tight">{lastBooking.service_name}</p>
            <p className="text-sm tracking-tight text-muted-foreground">
              {formatSlotWhen(lastBooking.starts_at, config.timezone)}
              {lastBooking.provider_name ? ` · ${lastBooking.provider_name}` : null}
            </p>
            <p className="text-xs tracking-tight text-muted-foreground">
              A notification would go to {notificationEmail}.
            </p>
          </div>
        ) : (
          <p className="text-sm tracking-tight text-muted-foreground">
            Bookings from the conversation appear here.
          </p>
        )}
      </div>
    </aside>
  );
}
