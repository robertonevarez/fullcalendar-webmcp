'use client';

import { formatDaysLabel, formatHoursLabel, formatPriceCents } from '@/demo/format';
import type { DemoConfig, DemoPublicAppointment } from '@/demo/types';
import { cn } from '@/lib/utils';

type Props = {
  config: DemoConfig;
  lastBooking: DemoPublicAppointment | null;
  notificationEmail: string;
  className?: string;
};

export function BusinessTruthPanel({ config, lastBooking, notificationEmail, className }: Props) {
  return (
    <aside
      className={cn('space-y-4 rounded-lg border border-border bg-muted/30 p-3', className)}
      aria-label="Business configuration"
    >
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Business truth
        </p>
        <h3 className="text-lg font-semibold tracking-tight">{config.businessName}</h3>
      </div>

      <div className="space-y-2 text-sm tracking-tight">
        <p className="font-medium">Services</p>
        <ul className="space-y-1 text-muted-foreground">
          {config.services.map((s) => (
            <li key={s.id}>
              {s.name} · {s.duration_minutes} min ·{' '}
              {formatPriceCents(Math.round(s.price_dollars * 100))}
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-1 text-sm tracking-tight">
        <p className="font-medium">Staff</p>
        <p className="text-muted-foreground">{config.staff.join(', ')}</p>
      </div>

      <div className="space-y-1 text-sm tracking-tight">
        <p className="font-medium">Hours</p>
        <p className="text-muted-foreground">
          {formatDaysLabel(config.availability.days)} ·{' '}
          {formatHoursLabel(config.availability.open, config.availability.close)}
        </p>
      </div>

      {config.postalCodes.length ? (
        <div className="space-y-1 text-sm tracking-tight">
          <p className="font-medium">Service area</p>
          <p className="text-muted-foreground">{config.postalCodes.join(', ')}</p>
        </div>
      ) : null}

      {lastBooking ? (
        <div
          className="space-y-2 border-t border-border pt-3 text-sm tracking-tight"
          role="status"
          aria-live="polite"
        >
          <p className="font-medium">New appointment created</p>
          <p>
            {lastBooking.service_name}
            <br />
            <span className="text-muted-foreground">
              {new Intl.DateTimeFormat('en-US', {
                weekday: 'long',
                hour: 'numeric',
                minute: '2-digit',
                timeZone: config.timezone,
              }).format(new Date(lastBooking.starts_at))}
            </span>
          </p>
          <p className="text-muted-foreground">
            A booking notification would be sent to {notificationEmail}.
          </p>
        </div>
      ) : (
        <p className="border-t border-border pt-3 text-sm text-muted-foreground tracking-tight">
          Bookings from the customer conversation appear here. No extra dashboard required.
        </p>
      )}
    </aside>
  );
}
