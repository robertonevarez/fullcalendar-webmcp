import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { playpenSansHebrew } from '@/lib/fonts';
import { ds, spacing } from '@/lib/design-system';
import { cn } from '@/lib/utils';

const DEMO_URL = '/businesses/acme-hvac';

export function Hero() {
  return (
    <section className="hero-rainbow border-b w-full">
      <div className={cn(ds.layout.container, spacing.page, 'py-20 md:py-32 lg:py-36')}>
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 text-center md:gap-8">
          <h1
            className={cn(
              playpenSansHebrew.className,
              'text-4xl font-medium tracking-tighter text-balance md:text-5xl lg:text-6xl lg:leading-[1.08]',
            )}
          >
            Your customers have agents.
            <br />
            Let them book you.
          </h1>

          <p className="max-w-2xl text-base font-normal tracking-tight text-muted-foreground text-balance md:text-lg">
            Protocol Tooling lets people book your services through the AI they already use. They say
            what they need and when they&apos;re free. You get a confirmed appointment.
          </p>

          <div className={cn('flex flex-wrap items-center justify-center pt-2', spacing.gap)}>
            <Button nativeButton={false} render={<Link href={DEMO_URL} />} size="lg">
              Try demo
            </Button>
            <Button
              nativeButton={false}
              render={<Link href="/docs" />}
              variant="ghost"
              size="lg"
            >
              Learn more
              <ChevronDown className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
