'use client';

import { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { DEMO_AGENT_CAPABILITIES } from '@/demo/capabilities';
import { formatDaysLabel, formatHoursLabel, formatSlotWhen } from '@/demo/format';
import type {
  DemoActivityStep,
  DemoBusinessNotice,
  DemoConfig,
  DemoPublicAppointment,
} from '@/demo/types';
import { cn } from '@/lib/utils';

type Props = {
  config: DemoConfig;
  activity: DemoActivityStep[];
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

function compactDaysLabel(days: number[]): string {
  const full = formatDaysLabel(days);
  return full
    .replace('Monday', 'Mon')
    .replace('Tuesday', 'Tue')
    .replace('Wednesday', 'Wed')
    .replace('Thursday', 'Thu')
    .replace('Friday', 'Fri')
    .replace('Saturday', 'Sat')
    .replace('Sunday', 'Sun')
    .replace(' – ', '–');
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <h4 className="text-xs font-medium tracking-tight text-muted-foreground">{label}</h4>
      <div className="text-sm tracking-tight">{children}</div>
    </div>
  );
}

export function ProtocolToolingPanel({
  config,
  activity,
  lastBooking,
  businessNotice,
  className,
}: Props) {
  const detailsId = useId();
  const [detailsOpen, setDetailsOpen] = useState(false);

  const teamLabel =
    config.archetype === 'auto' ? 'Technicians' : config.archetype === 'salon' ? 'Stylists' : 'Staff';

  return (
    <aside
      className={cn('flex min-h-0 flex-col bg-muted/30 p-4 md:p-5', className)}
      aria-label="Protocol Tooling"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h3 className="text-lg font-medium tracking-tight">Protocol Tooling</h3>
          <p className="text-sm tracking-tight text-muted-foreground">
            Business capabilities exposed to the agent
          </p>
        </div>
        <button
          type="button"
          className={cn(
            'inline-flex shrink-0 items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium tracking-tight text-muted-foreground outline-none md:hidden',
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
        <Field label="Business">
          <p className="font-medium">{config.businessName}</p>
        </Field>

        <Field label="Status">
          <p>Agent-ready</p>
        </Field>

        <Field label="Services">
          <ul className="space-y-2">
            {config.services.map((service) => (
              <li key={service.id}>
                <div className="font-medium">{service.name}</div>
                <p className="text-xs tabular-nums text-muted-foreground">
                  {formatServicePrice(service.price_dollars)} · {service.duration_minutes} min
                </p>
              </li>
            ))}
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

        <Field label="Availability">
          <p>{compactDaysLabel(config.availability.days)}</p>
          <p className="text-muted-foreground">
            {formatHoursLabel(config.availability.open, config.availability.close).replace(
              ' – ',
              '–',
            )}
          </p>
        </Field>

        {config.postalCodes.length ? (
          <Field label="Service area">
            <ul className="flex flex-wrap gap-x-3 gap-y-1 tabular-nums">
              {config.postalCodes.map((code) => (
                <li key={code}>{code}</li>
              ))}
            </ul>
          </Field>
        ) : null}

        <Field label="Agent capabilities">
          <ul className="space-y-2">
            {DEMO_AGENT_CAPABILITIES.map((cap) => (
              <li key={cap.tool}>
                <div>{cap.label}</div>
                <code className="text-[0.7rem] text-muted-foreground">{cap.tool}</code>
              </li>
            ))}
          </ul>
        </Field>
      </div>

      <div className="mt-5 space-y-4 border-t border-border pt-4 md:mt-auto">
        <div className="space-y-2" aria-live="polite">
          <h4 className="text-xs font-medium tracking-tight text-muted-foreground">
            Live operations
          </h4>
          {activity.length === 0 ? (
            <p className="text-sm tracking-tight text-muted-foreground">
              Activity appears here as the agent works.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {activity.map((step) => (
                <li key={step.id} className="text-sm tracking-tight">
                  <div className="font-medium">{step.label}</div>
                  {step.detail ? (
                    <p className="text-muted-foreground">{step.detail}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>

        {lastBooking || businessNotice ? (
          <div className="space-y-2 border-t border-border pt-4" role="status" aria-live="polite">
            <h4 className="text-xs font-medium tracking-tight text-muted-foreground">
              {businessNotice?.headline ?? 'New appointment'}
            </h4>
            <p className="text-sm font-medium tracking-tight">
              {businessNotice?.service_name ?? lastBooking?.service_name}
            </p>
            <p className="text-sm tracking-tight text-muted-foreground">
              {businessNotice?.when_label ??
                (lastBooking
                  ? formatSlotWhen(lastBooking.starts_at, config.timezone)
                  : null)}
            </p>
            {(businessNotice?.provider_name ?? lastBooking?.provider_name) ? (
              <p className="text-sm tracking-tight text-muted-foreground">
                {businessNotice?.provider_name ?? lastBooking?.provider_name}
              </p>
            ) : null}
            <div className="pt-1">
              <p className="text-xs font-medium tracking-tight text-muted-foreground">
                Notification
              </p>
              <p className="text-sm tracking-tight text-muted-foreground">
                Would be sent to{' '}
                {businessNotice?.notification_email ?? config.notificationEmail}
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
