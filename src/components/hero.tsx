import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { HeroImageBackground } from '@/components/hero-image-background';
import { Button } from '@/components/ui/button';
import { playpenSansHebrew } from '@/lib/fonts';
import { ds, spacing } from '@/lib/design-system';
import { cn } from '@/lib/utils';

const DEMO_URL = '/businesses/acme-hvac';

const heroScrim =
  'bg-[linear-gradient(to_bottom,oklch(1_0_0/0.98)_0%,oklch(1_0_0/0.88)_18%,oklch(1_0_0/0.68)_38%,oklch(1_0_0/0.38)_58%,oklch(1_0_0/0.14)_72%,transparent_88%)]';
const heroCopyGlow =
  'bg-[radial-gradient(ellipse_110%_90%_at_50%_24%,oklch(1_0_0/0.98)_0%,oklch(1_0_0/0.88)_30%,oklch(1_0_0/0.58)_55%,oklch(1_0_0/0.22)_78%,transparent_94%)]';

export function Hero() {
  return (
    <section className="relative flex h-[80svh] w-full items-start overflow-hidden border-b bg-background">
      <HeroImageBackground className="z-0" opacity={0.8} />
      <div
        aria-hidden
        className={cn('pointer-events-none absolute inset-0 z-[1]', heroScrim)}
      />
      <div
        aria-hidden
        className={cn('pointer-events-none absolute inset-0 z-[2]', heroCopyGlow)}
      />

      <div
        className={cn(
          'relative z-10 w-full',
          ds.layout.container,
          spacing.page,
          'pt-10 pb-16 md:pt-14 md:pb-20',
        )}
      >
        <div className="relative mx-auto max-w-4xl">
          <div className="relative flex flex-col items-center gap-6 text-center md:gap-8">
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

            <p className="max-w-2xl text-base font-normal tracking-tight text-balance md:text-lg">
              Protocol Tooling lets people book your services through the AI they already use. They say
              what they need and when they&apos;re free. You get a confirmed appointment.
            </p>

            <div className={cn('flex flex-wrap items-center justify-center pt-2', spacing.gap)}>
              <Button nativeButton={false} render={<Link href={DEMO_URL} />} size="xl" className={"drop-shadow-lg"}>
                Start with ChatGPT
                <ArrowRight />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
