'use client';

import { formatDaysLabel, formatHoursLabel } from '@/demo/format';
import type {
  DemoActivityStep,
  DemoBusinessNotice,
  DemoConfig,
  DemoPublicAppointment,
} from '@/demo/types';
import { cn } from '@/lib/utils';

type Props = {
  config: DemoConfig;
  agentAccess: boolean;
  activeStep: DemoActivityStep | null;
  lastBooking: DemoPublicAppointment | null;
  businessNotice: DemoBusinessNotice | null;
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

function CapabilityCard({ step }: { step: DemoActivityStep }) {
  const result = step.result;
  return (
    <div
      className="mt-3 rounded-lg border border-foreground/15 bg-background p-3 shadow-xs"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium tracking-tight">{step.label}</p>
        {step.tool ? (
          <code className="text-[0.65rem] text-muted-foreground">{step.tool}</code>
        ) : null}
      </div>

      {step.target === 'services' ? (
        <div className="mt-2 space-y-1 text-sm tracking-tight">
          {result?.query ? (
            <p className="text-muted-foreground">“{result.query}”</p>
          ) : null}
          {result?.service_name ? (
            <p>
              <span className="font-medium">{result.service_name}</span>
              {result.price_label ? (
                <span className="text-muted-foreground">
                  {' '}
                  · {result.price_label}
                  {result.duration_minutes ? ` · ${result.duration_minutes} min` : ''}
                </span>
              ) : null}
            </p>
          ) : (
            <p className="text-muted-foreground">{step.detail}</p>
          )}
        </div>
      ) : null}

      {step.target === 'service_area' ? (
        <div className="mt-2 space-y-1 text-sm tracking-tight">
          {result?.postal_code ? (
            <p className="tabular-nums">{result.postal_code}</p>
          ) : null}
          <p
            className={cn(
              'font-medium',
              result?.eligible === false && 'text-destructive',
            )}
          >
            {result?.eligible === true
              ? 'Eligible'
              : result?.eligible === false
                ? 'Not served'
                : step.detail}
          </p>
        </div>
      ) : null}

      {step.target === 'availability' ? (
        <div className="mt-2 space-y-1.5 text-sm tracking-tight">
          {result?.query ? (
            <p className="text-muted-foreground">{result.query}</p>
          ) : null}
          {result?.slot_labels?.length ? (
            <ul className="space-y-1">
              {result.slot_labels.map((label) => (
                <li key={label} className="font-medium tabular-nums">
                  {label}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">{step.detail}</p>
          )}
        </div>
      ) : null}

      {step.target === 'booking' ? (
        <div className="mt-2 space-y-1 text-sm tracking-tight">
          {result?.service_name ? (
            <p className="font-medium">{result.service_name}</p>
          ) : null}
          {result?.when_label ? (
            <p className="text-muted-foreground">{result.when_label}</p>
          ) : null}
          <p className="font-medium">{step.detail ?? 'Confirmed'}</p>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Deliberately simple local-business website surface.
 * Human view is ordinary; agent access reveals structured capabilities contextually.
 */
export function BusinessWebsite({
  config,
  agentAccess,
  activeStep,
  lastBooking,
  businessNotice,
  className,
}: Props) {
  const intro =
    config.archetype === 'salon'
      ? 'Haircuts and color at the salon.'
      : config.archetype === 'auto'
        ? 'Oil changes and inspections with bay service.'
        : 'Heating & cooling service in Austin.';

  const areaLabel =
    config.archetype === 'field_service'
      ? 'Austin, TX'
      : config.archetype === 'salon'
        ? 'At the salon'
        : 'At the shop';

  return (
    <article
      className={cn(
        'flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-xs',
        agentAccess && 'ring-1 ring-foreground/20',
        className,
      )}
      aria-label={`${config.businessName} website`}
    >
      <header className="border-b border-border px-5 py-4 md:px-6 md:py-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <h2 className="text-xl font-medium tracking-tight text-balance md:text-2xl">
              {config.businessName}
            </h2>
            <p className="text-sm tracking-tight text-muted-foreground">{intro}</p>
          </div>
          {agentAccess ? (
            <span
              className="shrink-0 rounded-md border border-border bg-muted px-2 py-1 text-[10px] font-medium tracking-tight text-muted-foreground"
              role="status"
            >
              Agent access
            </span>
          ) : null}
        </div>
      </header>

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5 md:px-6 md:py-6">
        <p className="max-w-md text-sm tracking-tight text-muted-foreground md:text-base">
          A normal business website for people. Compatible agents can use structured
          capabilities exposed underneath.
        </p>

        <section data-demo-target="services" className="scroll-mt-4 space-y-3">
          <h3 className="text-xs font-medium tracking-tight text-muted-foreground">
            Services
          </h3>
          <ul className="space-y-3">
            {config.services.map((service) => (
              <li key={service.id} className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-medium tracking-tight">{service.name}</span>
                <span className="shrink-0 text-sm tabular-nums tracking-tight text-muted-foreground">
                  {formatServicePrice(service.price_dollars)}
                </span>
              </li>
            ))}
          </ul>
          {activeStep?.target === 'services' ? <CapabilityCard step={activeStep} /> : null}
        </section>

        <section className="space-y-2">
          <h3 className="text-xs font-medium tracking-tight text-muted-foreground">Hours</h3>
          <p className="text-sm tracking-tight">{formatDaysLabel(config.availability.days)}</p>
          <p className="text-sm tracking-tight text-muted-foreground">
            {formatHoursLabel(config.availability.open, config.availability.close)}
          </p>
        </section>

        <section data-demo-target="service_area" className="scroll-mt-4 space-y-2">
          <h3 className="text-xs font-medium tracking-tight text-muted-foreground">
            Service area
          </h3>
          <p className="text-sm tracking-tight">{areaLabel}</p>
          {config.postalCodes.length ? (
            <p className="text-sm tabular-nums tracking-tight text-muted-foreground">
              {config.postalCodes.join(' · ')}
            </p>
          ) : null}
          {activeStep?.target === 'service_area' ? (
            <CapabilityCard step={activeStep} />
          ) : null}
        </section>

        <section data-demo-target="availability" className="scroll-mt-4 space-y-2">
          {activeStep?.target === 'availability' ? (
            <>
              <h3 className="text-xs font-medium tracking-tight text-muted-foreground">
                Availability
              </h3>
              <CapabilityCard step={activeStep} />
            </>
          ) : null}
        </section>

        <section data-demo-target="booking" className="scroll-mt-4 space-y-2">
          {activeStep?.target === 'booking' ? <CapabilityCard step={activeStep} /> : null}

          {(lastBooking || businessNotice) && !activeStep ? (
            <div
              className="rounded-lg border border-border bg-muted/40 p-3"
              role="status"
              aria-live="polite"
            >
              <p className="text-xs font-medium tracking-tight text-muted-foreground">
                Appointment confirmed
              </p>
              <p className="mt-1 text-sm font-medium tracking-tight">
                {businessNotice?.service_name ?? lastBooking?.service_name}
              </p>
              <p className="text-sm tracking-tight text-muted-foreground">
                {businessNotice?.when_label}
              </p>
              {(businessNotice?.provider_name ?? lastBooking?.provider_name) ? (
                <p className="text-sm tracking-tight text-muted-foreground">
                  {businessNotice?.provider_name ?? lastBooking?.provider_name}
                </p>
              ) : null}
              <p className="mt-2 text-xs tracking-tight text-muted-foreground">
                Notification would be sent to{' '}
                {businessNotice?.notification_email ?? config.notificationEmail}
              </p>
            </div>
          ) : null}
        </section>
      </div>
    </article>
  );
}
