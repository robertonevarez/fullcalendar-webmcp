'use client';

import { formatDaysLabel, formatHoursLabel } from '@/demo/format';
import type {
  DemoBusinessNotice,
  DemoConfig,
  DemoPublicAppointment,
} from '@/demo/types';
import { cn } from '@/lib/utils';

type Props = {
  config: DemoConfig;
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

function storefrontIntro(config: DemoConfig): { headline: string; support: string } {
  if (config.archetype === 'salon') {
    return {
      headline: 'Haircuts and color, done well.',
      support: 'Bookable appointments with stylists who know your look.',
    };
  }
  if (config.archetype === 'auto') {
    return {
      headline: 'Honest service for everyday cars.',
      support: 'Oil changes, inspections, and repairs with clear pricing.',
    };
  }
  return {
    headline: 'Reliable heating & cooling service in Austin.',
    support: 'Fast local service for repairs, diagnostics, and maintenance.',
  };
}

function serviceSupport(service: DemoConfig['services'][number]): string {
  if (/diagnostic/i.test(service.name)) {
    return 'Cooling-system inspection and diagnosis.';
  }
  if (/maintenance|tune/i.test(service.name)) {
    return 'Seasonal HVAC tune-up.';
  }
  if (/haircut/i.test(service.name)) {
    return 'Cut and finish with your stylist.';
  }
  if (/color/i.test(service.name)) {
    return 'Color services matched to your goals.';
  }
  if (/oil/i.test(service.name)) {
    return 'Standard oil and filter service.';
  }
  if (/brake/i.test(service.name)) {
    return 'Inspection of pads, rotors, and fluid.';
  }
  return `${service.duration_minutes} min service.`;
}

function areaLine(config: DemoConfig): string {
  if (config.archetype === 'field_service') return 'Serving Austin, TX';
  if (config.archetype === 'salon') return 'At the salon';
  return 'At the shop';
}

/**
 * Miniature ordinary-business storefront — the human surface.
 * No Protocol Tooling marketing copy; no agent capability UI.
 */
export function BusinessWebsite({
  config,
  lastBooking,
  businessNotice,
  className,
}: Props) {
  const intro = storefrontIntro(config);
  const noticeService = businessNotice?.service_name ?? lastBooking?.service_name;
  const noticeWhen = businessNotice?.when_label;
  const noticeEmail = businessNotice?.notification_email ?? config.notificationEmail;

  return (
    <article
      data-demo-target="storefront"
      className={cn('flex h-full min-h-0 flex-col bg-background text-foreground', className)}
      aria-label={`${config.businessName} website`}
    >
      <div className="min-h-0 flex-1 overflow-y-auto">
        <header className="border-b border-border/80 px-5 py-4 md:px-6">
          <p className="text-base font-medium tracking-tight md:text-lg">
            {config.businessName}
          </p>
          <nav
            className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs tracking-tight text-muted-foreground"
            aria-label="Site"
          >
            <span>Home</span>
            <span>Services</span>
            <span>Contact</span>
          </nav>
        </header>

        <div className="space-y-6 px-5 py-5 md:px-6 md:py-6">
          <section className="max-w-md space-y-2">
            <h2 className="text-xl font-medium tracking-tight text-balance md:text-2xl">
              {intro.headline}
            </h2>
            <p className="text-sm tracking-tight text-muted-foreground md:text-[0.95rem]">
              {intro.support}
            </p>
            <p className="pt-1 text-sm font-medium tracking-tight">Call us</p>
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-medium tracking-tight text-muted-foreground">
              Services
            </h3>
            <ul className="space-y-4">
              {config.services.map((service) => (
                <li key={service.id} className="space-y-0.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm font-medium tracking-tight">{service.name}</span>
                    <span className="shrink-0 text-sm tabular-nums tracking-tight text-muted-foreground">
                      {formatServicePrice(service.price_dollars)}
                    </span>
                  </div>
                  <p className="text-sm tracking-tight text-muted-foreground">
                    {serviceSupport(service)}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <section className="space-y-1.5">
            <h3 className="text-xs font-medium tracking-tight text-muted-foreground">Hours</h3>
            <p className="text-sm tracking-tight">{formatDaysLabel(config.availability.days)}</p>
            <p className="text-sm tracking-tight text-muted-foreground">
              {formatHoursLabel(config.availability.open, config.availability.close)}
            </p>
          </section>

          <section className="space-y-1">
            <p className="text-sm tracking-tight">{areaLine(config)}</p>
          </section>
        </div>
      </div>

      {noticeService && noticeWhen ? (
        <div
          className="shrink-0 border-t border-border bg-muted/40 px-5 py-3 md:px-6"
          role="status"
          aria-live="polite"
        >
          <p className="text-xs font-medium tracking-tight text-muted-foreground">
            Appointment received
          </p>
          <p className="mt-1 text-sm font-medium tracking-tight">{noticeService}</p>
          <p className="text-sm tracking-tight text-muted-foreground">{noticeWhen}</p>
          {(businessNotice?.provider_name ?? lastBooking?.provider_name) ? (
            <p className="text-sm tracking-tight text-muted-foreground">
              {businessNotice?.provider_name ?? lastBooking?.provider_name}
            </p>
          ) : null}
          <p className="mt-1 text-xs tracking-tight text-muted-foreground">
            Notification would be sent to {noticeEmail}
          </p>
        </div>
      ) : null}
    </article>
  );
}
