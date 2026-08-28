import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ds, spacing } from '@/lib/design-system';
import { cn } from '@/lib/utils';

const DEMO_URL = '/demo';
const GITHUB_URL = 'https://github.com/robertonevarez/protocoltooling';

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
        'max-w-2xl text-3xl font-semibold tracking-tighter text-balance md:text-4xl',
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

function ImageTextSection({
  id,
  imageSide = 'right',
  heading,
  lead,
  image,
}: {
  id?: string;
  imageSide?: 'left' | 'right';
  heading: React.ReactNode;
  lead: React.ReactNode;
  image: {
    src: string;
    alt: string;
    width: number;
    height: number;
  };
}) {
  const imageOnLeft = imageSide === 'left';

  return (
    <HomeSection id={id}>
      <div className="grid items-start gap-6 md:grid-cols-2 md:gap-10">
        <div
          className={cn(
            spacing.stack,
            'max-w-xl',
            imageOnLeft ? 'md:col-start-2 md:row-start-1' : 'md:col-start-1',
          )}
        >
          <SectionHeading>{heading}</SectionHeading>
          <SectionLead>{lead}</SectionLead>
        </div>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image.src}
          alt={image.alt}
          width={image.width}
          height={image.height}
          decoding="async"
          className={cn(
            'w-full self-start rounded-2xl',
            imageOnLeft ? 'md:col-start-1 md:row-start-1' : 'md:col-start-2 md:row-start-1',
          )}
        />
      </div>
    </HomeSection>
  );
}

export function LiveInteractionSection() {
  return (
    <ImageTextSection
      id="how-it-works"
      imageSide="right"
      heading="One request. A confirmed appointment."
      lead={
        <>
          The customer says what they need in plain language. Their agent works with Protocol
          Tooling to find the service, check eligibility, offer real times, and book.
        </>
      }
      image={{
        src: '/how-it-works.png',
        alt: 'A customer asks their agent to book an AC diagnostic visit. Protocol Tooling returns the service, confirms 78701 is eligible, offers 4:30 PM or 6:00 PM for $89, and confirms the appointment.',
        width: 1254,
        height: 1254,
      }}
    />
  );
}

export function BookingFunnelsSection() {
  return (
    <ImageTextSection
      imageSide="left"
      heading="No more booking funnels."
      lead={
        <>
          Agents should not have to operate websites like humans. Protocol Tooling exposes
          structured business capabilities through WebMCP while the business stays authoritative
          over scheduling rules.
        </>
      }
      image={{
        src: '/no-more-booking-funnels.png',
        alt: 'Side-by-side comparison: Protocol Tooling is two clean steps—tell your agent what you need and confirm the appointment—while traditional booking winds through a phone and laptop across seven steps from finding the website to submitting.',
        width: 1254,
        height: 1254,
      }}
    />
  );
}

export function BusinessControlSection() {
  return (
    <ImageTextSection
      imageSide="right"
      heading={
        <>
          You control the business.
          <br />
          Agents handle the booking.
        </>
      }
      lead={
        <>
          Protocol Tooling stays authoritative for services, pricing, availability, service areas,
          and appointments. The same engine handles HVAC, salons, clinics, and auto service — with
          different scheduling constraints. Agents book against your rules; they do not invent them.
        </>
      }
      image={{
        src: '/business-control.png',
        alt: 'Business owns Services, Hours, and Areas; an agent only asks “Can you book me in?” against those rules.',
        width: 1254,
        height: 1254,
      }}
    />
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
            Try the product demo
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
