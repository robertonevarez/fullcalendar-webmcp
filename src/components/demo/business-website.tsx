'use client';

import type { ReactNode } from 'react';
import type { DemoBusinessNotice, DemoConfig, DemoPublicAppointment } from '@/demo/types';
import { cn } from '@/lib/utils';
import { BookingNotice } from '@/components/demo/storefront-primitives';

type Props = {
  config: DemoConfig;
  lastBooking: DemoPublicAppointment | null;
  businessNotice: DemoBusinessNotice | null;
  isAgentAccess?: boolean;
  overlay?: ReactNode;
  className?: string;
};

/**
 * Clean business capability surface hosting the animated agent interaction overlay
 * and booking confirmation notices without mock storefront markup.
 */
export function BusinessWebsite({
  config,
  lastBooking,
  businessNotice,
  isAgentAccess = false,
  overlay,
  className,
}: Props) {
  return (
    <article
      id="top"
      data-demo-target="storefront"
      data-agent-access={isAgentAccess ? 'true' : 'false'}
      className={cn('relative flex h-full min-h-0 flex-col overflow-hidden bg-card text-card-foreground', className)}
      aria-label={`${config.businessName} workspace`}
    >
      <div
        className={cn(
          'min-h-0 flex-1 overflow-y-auto transition-[filter,opacity,transform] duration-300 ease-out',
          isAgentAccess && 'opacity-40 scale-[0.99] select-none pointer-events-none',
        )}
      />

      {overlay ? (
        <div
          className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center p-4"
          data-demo-target="overlay-container"
        >
          {overlay}
        </div>
      ) : null}

      <BookingNotice
        config={config}
        lastBooking={lastBooking}
        businessNotice={businessNotice}
        className="border-t border-border bg-muted/40 text-foreground"
      />
    </article>
  );
}
