'use client';

import { Button } from '@/components/ui/button';
import { formatDaysLabel, formatHoursLabel, formatPriceCents } from '@/demo/format';
import type { DemoConfig } from '@/demo/types';

type Props = {
  config: DemoConfig;
  onContinue: () => void;
  onBack: () => void;
};

export function AgentReadyMoment({ config, onContinue, onBack }: Props) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <div className="space-y-3">
        <p className="text-sm font-medium tracking-tight text-muted-foreground">Step 2 of 3</p>
        <p className="max-w-xl text-base tracking-tight text-foreground md:text-lg">
          A customer&apos;s AI agent can now understand how {config.businessName} takes appointments.
        </p>
      </div>

      <ul className="space-y-3 text-sm tracking-tight md:text-base" aria-label="What an agent can understand">
        <li>
          <span className="font-medium">Services</span>
          <span className="text-muted-foreground">
            {' '}
            —{' '}
            {config.services
              .map(
                (s) =>
                  `${s.name} (${s.duration_minutes} min, ${formatPriceCents(Math.round(s.price_dollars * 100))})`,
              )
              .join('; ')}
          </span>
        </li>
        <li>
          <span className="font-medium">Availability</span>
          <span className="text-muted-foreground">
            {' '}
            — {formatDaysLabel(config.availability.days)},{' '}
            {formatHoursLabel(config.availability.open, config.availability.close)}
          </span>
        </li>
        <li>
          <span className="font-medium">Where you operate</span>
          <span className="text-muted-foreground">
            {' '}
            —{' '}
            {config.postalCodes.length
              ? config.postalCodes.join(', ')
              : 'No service-area limit in this demo'}
          </span>
        </li>
        <li>
          <span className="font-medium">Who can perform the work</span>
          <span className="text-muted-foreground"> — {config.staff.join(', ')}</span>
        </li>
        <li>
          <span className="font-medium">How to create an appointment</span>
          <span className="text-muted-foreground">
            {' '}
            — with a clear customer confirmation before anything is booked
          </span>
        </li>
      </ul>

      <p className="max-w-xl text-sm tracking-tight text-muted-foreground">
        Under the hood, Protocol Tooling exposes these capabilities as structured WebMCP tools — the
        same idea personal agents use on a live business page.
      </p>

      <div className="flex flex-wrap gap-3">
        <Button type="button" size="lg" onClick={onContinue}>
          Try it as a customer
        </Button>
        <Button type="button" variant="outline" size="lg" onClick={onBack}>
          Edit business
        </Button>
      </div>
    </div>
  );
}
