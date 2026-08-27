import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ds, spacing } from '@/lib/design-system';
import { playpenSansHebrew } from '@/lib/fonts';
import { cn } from '@/lib/utils';

const DEMO_URL = '/businesses/acme-hvac';
const GITHUB_URL = 'https://github.com/robertonevarez/protocoltooling';
const DOCS_URL = '/docs';

const VERTICALS = [
  {
    slug: 'acme-hvac',
    name: 'HVAC',
    constraint: 'Technician + service area',
  },
  {
    slug: 'blue-pipe-plumbing',
    name: 'Plumbing',
    constraint: 'Technician + service area',
  },
  {
    slug: 'northline-salon',
    name: 'Salon',
    constraint: 'Provider',
  },
  {
    slug: 'harbor-physical-therapy',
    name: 'Physical therapy',
    constraint: 'Provider + room',
  },
  {
    slug: 'mesa-auto-service',
    name: 'Auto service',
    constraint: 'Technician + service bay',
  },
] as const;

function HomeSection({
  id,
  children,
  className,
}: {
  id?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={cn('scroll-mt-20 border-b border-border', className)}
    >
      <div className={cn(ds.layout.container, spacing.x, spacing.sectionY, spacing.sectionStack)}>
        {children}
      </div>
    </section>
  );
}

function SectionHeading({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h2
      className={cn(
        playpenSansHebrew.className,
        'max-w-2xl text-3xl font-medium tracking-tighter text-balance md:text-4xl',
        className,
      )}
    >
      {children}
    </h2>
  );
}

function SectionLead({ children }: { children: React.ReactNode }) {
  return <p className="max-w-2xl text-base tracking-tight text-foreground md:text-lg">{children}</p>;
}

export function LiveInteractionSection() {
  return (
    <HomeSection id="how-it-works">
      <div className="grid items-start gap-6 md:grid-cols-2 md:gap-10">
        <div className={cn(spacing.stack, 'max-w-xl')}>
          <SectionHeading>One request. A confirmed appointment.</SectionHeading>
          <SectionLead>
            The customer says what they need in plain language. Their agent works with Protocol
            Tooling to find the service, check eligibility, offer real times, and book.
          </SectionLead>
        </div>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/how-it-works.jpg"
          alt="A customer asks their agent to book an AC diagnostic visit. Protocol Tooling returns the service, confirms 78701 is eligible, offers 4:30 PM or 6:00 PM for $89, and confirms the appointment."
          width={2048}
          height={2048}
          decoding="async"
          className="w-full self-start justify-self-end rounded-xl shadow-lg border border-border"
        />
      </div>
    </HomeSection>
  );
}

export function BookingFunnelsSection() {
  return (
    <HomeSection>
      <div className={cn(spacing.stack, 'max-w-2xl')}>
        <SectionHeading>No more booking funnels.</SectionHeading>
        <SectionLead>
          Agents should not have to operate websites like humans. Protocol Tooling exposes
          structured business capabilities through WebMCP while the business stays authoritative
          over scheduling rules.
        </SectionLead>
      </div>

      <div className="grid gap-6 md:grid-cols-2 md:gap-10">
        <div className={spacing.stack}>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Traditional booking
          </p>
          <ol className={cn(spacing.stack, 'text-sm text-muted-foreground md:text-base')}>
            <li>Find website</li>
            <li>Find booking page</li>
            <li>Choose service</li>
            <li>Enter location</li>
            <li>Navigate calendar</li>
            <li>Enter details</li>
            <li>Submit</li>
          </ol>
        </div>

        <div className={spacing.stack}>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Protocol Tooling
          </p>
          <ol className={cn(spacing.stack, 'text-sm md:text-base')}>
            <li>Tell your agent what you need</li>
            <li>Confirm the appointment</li>
          </ol>
        </div>
      </div>
    </HomeSection>
  );
}

export function BusinessControlSection() {
  const primitives = [
    {
      title: 'Services',
      body: 'Pricing, duration, and requirements.',
    },
    {
      title: 'Team & resources',
      body: 'Staff, rooms, bays, and equipment.',
    },
    {
      title: 'Availability',
      body: 'Working hours and blocked time.',
    },
    {
      title: 'Service areas',
      body: 'Where the business operates.',
    },
    {
      title: 'Appointments',
      body: 'Confirmed, rescheduled, or cancelled.',
    },
    {
      title: 'Agent access',
      body: 'Structured capabilities exposed through WebMCP.',
    },
  ] as const;

  return (
    <HomeSection>
      <div className={cn(spacing.stack, 'max-w-2xl')}>
        <SectionHeading>
          You control the business.
          <br />
          Agents handle the booking.
        </SectionHeading>
        <SectionLead>
          Protocol Tooling remains authoritative for the rules that matter. Agents discover and
          book against those rules — they do not invent them.
        </SectionLead>
      </div>

      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {primitives.map((item) => (
          <div key={item.title} className={spacing.stack}>
            <dt className="text-sm font-medium">{item.title}</dt>
            <dd className="text-sm text-muted-foreground">{item.body}</dd>
          </div>
        ))}
      </dl>
    </HomeSection>
  );
}

export function MultiVerticalSection() {
  return (
    <HomeSection>
      <div className={cn(spacing.stack, 'max-w-2xl')}>
        <SectionHeading>Built for service businesses.</SectionHeading>
        <SectionLead>
          The same scheduling engine handles different constraints — providers, rooms, technicians,
          bays, and geography.
        </SectionLead>
      </div>

      <ul className="divide-y divide-border border-y border-border">
        {VERTICALS.map((vertical) => (
          <li key={vertical.slug}>
            <Link
              href={`/businesses/${vertical.slug}`}
              className="flex flex-col gap-1 py-3 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"
            >
              <span className="text-sm font-medium md:text-base">{vertical.name}</span>
              <span className="text-sm text-muted-foreground">{vertical.constraint}</span>
            </Link>
          </li>
        ))}
      </ul>
    </HomeSection>
  );
}

export function TechnicalCredibilitySection() {
  const stack = [
    'Customer',
    'Personal AI agent',
    'WebMCP',
    'Protocol Tooling',
    'Scheduling engine',
    'Persistent data',
  ] as const;

  return (
    <HomeSection>
      <div className={cn(spacing.stack, 'max-w-2xl')}>
        <SectionHeading>
          Deterministic underneath.
          <br />
          Conversational on top.
        </SectionHeading>
        <SectionLead>
          The AI interprets intent. Protocol Tooling stays authoritative for services, prices,
          eligibility, resource constraints, availability, and appointment state.
        </SectionLead>
      </div>

      <ol className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3 sm:gap-y-2">
        {stack.map((step, index) => (
          <li key={step} className="flex items-center gap-3 text-sm md:text-base">
            <span className={index === stack.length - 1 ? 'font-medium' : undefined}>{step}</span>
            {index < stack.length - 1 ? (
              <span aria-hidden className="hidden text-muted-foreground sm:inline">
                →
              </span>
            ) : null}
          </li>
        ))}
      </ol>

      <p className="max-w-2xl text-sm text-muted-foreground">
        Runs on Vercel with PlanetScale Postgres. Read the{' '}
        <Link href={DOCS_URL} className="underline underline-offset-4 hover:text-foreground">
          docs
        </Link>{' '}
        or explore the{' '}
        <a
          href={GITHUB_URL}
          className="underline underline-offset-4 hover:text-foreground"
          rel="noopener noreferrer"
          target="_blank"
        >
          source on GitHub
        </a>
        .
      </p>
    </HomeSection>
  );
}

export function ClosingCtaSection() {
  return (
    <HomeSection className="border-b-0">
      <div className={cn('mx-auto max-w-2xl text-center', spacing.sectionStack)}>
        <SectionHeading className="mx-auto">
          Agent-native booking infrastructure.
          <br />
          Open source.
        </SectionHeading>
        <p className="text-base tracking-tight text-foreground md:text-lg">
          Make your business bookable by AI agents.
        </p>
        <div className={cn('flex flex-wrap items-center justify-center', spacing.gap)}>
          <Button nativeButton={false} render={<Link href={DEMO_URL} />} size="lg">
            Try the live demo
            <ArrowRight />
          </Button>
          <Button
            nativeButton={false}
            render={
              <a href={GITHUB_URL} rel="noopener noreferrer" target="_blank" />
            }
            size="lg"
            variant="outline"
          >
            View on GitHub
          </Button>
        </div>
      </div>
    </HomeSection>
  );
}
