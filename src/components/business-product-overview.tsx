'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { Business, Service, WorkingHours } from '@/domain/types';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  BusinessAgentActions,
  type BusinessAgentView,
} from '@/components/business-agent-actions';
import { ChatGPTBookingGuide } from '@/components/chatgpt-booking-guide';
import { AiBookingDemo } from '@/components/ai-booking-demo';
import { WebMCPInspectPanel } from '@/components/webmcp-inspect-panel';
import { useWebMCPRegistrationState } from '@/components/webmcp-business-provider';
import {
  AUTOPLAY_MS,
  DURATION_CROSSFADE_S,
  DURATION_FAST_S,
  EASE_IN_OUT,
  mountContainer,
  mountItem,
  mountList,
} from '@/lib/motion';

type ActiveView = 'product' | BusinessAgentView;

function classNames(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}

function formatPrice(cents: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

function formatClock(hhmm: string): string {
  const [hourRaw, minuteRaw] = hhmm.split(':');
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: minute === 0 ? undefined : '2-digit',
  }).format(date);
}

function formatHoursRows(hours: WorkingHours[]): { day: string; time: string }[] {
  return [...hours]
    .sort((a, b) => a.day - b.day)
    .map((entry) => ({
      day: DAY_NAMES[entry.day] ?? `Day ${entry.day}`,
      time: `${formatClock(entry.open)} – ${formatClock(entry.close)}`,
    }));
}

function locationSummary(business: Business): string {
  const place = `${business.address.city}, ${business.address.region}`;
  switch (business.location_mode) {
    case 'CUSTOMER_LOCATION':
      return `We come to you across the ${place} area.`;
    case 'BUSINESS_LOCATION':
      return `Visits are at our location in ${place}${
        business.address.line1 ? ` (${business.address.line1})` : ''
      }.`;
    default:
      return `We can meet at our location or come to you in ${place}.`;
  }
}

function buildFaqs(
  business: Business,
  services: Service[],
  hoursRows: { day: string; time: string }[],
): { id: string; question: string; answer: string }[] {
  const priced = services.map((s) => s.price_cents).filter((p) => p > 0);
  const minServicePrice = priced.length > 0 ? Math.min(...priced) : 0;

  const pricingAnswer =
    minServicePrice > 0
      ? `Services start at ${formatPrice(minServicePrice)}. See the list above for each offering.`
      : 'Pricing varies by service — contact us for a quote.';

  const hoursAnswer =
    hoursRows.length > 0
      ? `We're open ${hoursRows
          .map((row) => `${row.day} ${row.time}`)
          .join('; ')}. Times are in ${business.timezone}.`
      : `Hours vary — check back or ask in ChatGPT for availability in ${business.timezone}.`;

  return [
    {
      id: 'booking',
      question: 'How do I book?',
      answer:
        'Use ChatGPT with this business to browse services, check availability, and request an appointment.',
    },
    {
      id: 'location',
      question: 'Where do you operate?',
      answer: locationSummary(business),
    },
    {
      id: 'hours',
      question: 'What are your hours?',
      answer: hoursAnswer,
    },
    {
      id: 'pricing',
      question: 'How does pricing work?',
      answer: pricingAnswer,
    },
  ];
}

interface BusinessProductOverviewProps {
  business: Business;
  services: Service[];
}

export function BusinessProductOverview({
  business,
  services,
}: BusinessProductOverviewProps) {
  const reduceMotion = useReducedMotion();
  const registrationState = useWebMCPRegistrationState();
  const [activeView, setActiveView] = useState<ActiveView>('product');
  const [photoIndex, setPhotoIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const photos =
    business.photos && business.photos.length > 0
      ? business.photos
      : [
          {
            src: '/images/businesses/marias-cleaning/1.jpg',
            objectPosition: 'object-center',
          },
        ];

  const activePhoto = photos[photoIndex] ?? photos[0];

  useEffect(() => {
    if (activeView !== 'product' || photos.length < 2 || paused || reduceMotion) {
      return;
    }
    const id = window.setInterval(() => {
      setPhotoIndex((current) => (current + 1) % photos.length);
    }, AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [activeView, photos.length, paused, photoIndex, reduceMotion]);

  const goBack = () => setActiveView('product');

  if (activeView === 'chatgpt') {
    return (
      <ChatGPTBookingGuide
        onBack={goBack}
        business={business}
        services={services}
        registrationState={registrationState}
      />
    );
  }

  if (activeView === 'demo') {
    return (
      <AiBookingDemo
        key="ai-booking-demo"
        onBack={goBack}
        business={business}
        services={services}
      />
    );
  }

  if (activeView === 'inspect') {
    return (
      <WebMCPInspectPanel
        onBack={goBack}
        registrationState={registrationState}
        businessName={business.name}
      />
    );
  }

  const prices = services.map((s) => s.price_cents).filter((p) => p > 0);
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const priceDisplay =
    minPrice > 0 ? `Starts at ${formatPrice(minPrice)}` : 'Contact for Quote';

  const hoursRows = formatHoursRows(business.working_hours ?? []);
  const faqs = buildFaqs(business, services, hoursRows);

  const goToPhoto = (index: number) => {
    setPhotoIndex(index);
    setPaused(true);
  };

  return (
    <div className="bg-background text-foreground transition-colors max-lg:p-6 lg:h-full lg:min-h-0 lg:overflow-hidden">
      <div className="mx-auto flex h-full w-full max-w-7xl flex-col lg:max-w-none">
        <div className="grid grid-cols-1 gap-6 lg:h-full lg:min-h-0 lg:grid-cols-7 lg:gap-0">
          <motion.div
            className="lg:col-span-4 lg:self-start lg:py-6 lg:pl-6 lg:pr-3"
            initial={reduceMotion ? false : 'hidden'}
            animate="show"
            variants={mountItem}
          >
            <div
              className="overflow-hidden rounded-2xl bg-muted shadow-lg"
              onMouseEnter={() => setPaused(true)}
              onMouseLeave={() => setPaused(false)}
              onFocusCapture={() => setPaused(true)}
              onBlurCapture={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                  setPaused(false);
                }
              }}
            >
              <div className="relative aspect-4/3 w-full overflow-hidden bg-muted">
                <AnimatePresence initial={false}>
                  <motion.div
                    key={activePhoto.src}
                    className="absolute inset-0"
                    initial={
                      reduceMotion
                        ? { opacity: 0 }
                        : { opacity: 0, transform: 'scale(1)' }
                    }
                    animate={
                      reduceMotion
                        ? { opacity: 1 }
                        : { opacity: 1, transform: 'scale(1.08)' }
                    }
                    exit={
                      reduceMotion
                        ? { opacity: 0 }
                        : { opacity: 0, transform: 'scale(1.08)' }
                    }
                    transition={{
                      opacity: {
                        duration: reduceMotion
                          ? DURATION_FAST_S
                          : DURATION_CROSSFADE_S,
                        ease: EASE_IN_OUT,
                      },
                      transform: {
                        duration: reduceMotion ? 0 : AUTOPLAY_MS / 1000,
                        ease: 'linear',
                      },
                    }}
                  >
                    <Image
                      src={activePhoto.src}
                      alt={`${business.name} photo ${photoIndex + 1}`}
                      fill
                      priority={photoIndex === 0}
                      unoptimized
                      className={classNames(
                        'object-cover',
                        activePhoto.objectPosition ?? 'object-center',
                      )}
                    />
                  </motion.div>
                </AnimatePresence>

                {photos.length > 1 && (
                  <div
                    className="absolute inset-x-0 bottom-3 z-10 flex justify-center"
                    role="tablist"
                    aria-label="Photo gallery"
                  >
                    <div className="flex items-center gap-0.5">
                      {photos.map((photo, index) => {
                        const selected = index === photoIndex;
                        return (
                          <button
                            key={photo.src}
                            type="button"
                            role="tab"
                            aria-selected={selected}
                            aria-label={`Show photo ${index + 1} of ${photos.length}`}
                            onClick={() => goToPhoto(index)}
                            className="flex size-10 items-center justify-center cursor-pointer active:scale-[0.97] transition-transform duration-fast ease-motion"
                          >
                            <span
                              className={classNames(
                                'rounded-full shadow-sm transition-[width,background-color] duration-fast ease-motion',
                                selected
                                  ? 'h-2.5 w-6 bg-white'
                                  : 'size-2.5 bg-white/50 hover:bg-white/75',
                              )}
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          <ScrollArea
            className="min-h-0 lg:col-span-3 lg:h-full"
            viewportClassName="scroll-fade overscroll-contain"
          >
            <motion.div
              className="flex flex-col gap-6 lg:py-6 lg:pl-3 lg:pr-6"
              initial={reduceMotion ? false : 'hidden'}
              animate="show"
              variants={mountContainer}
            >
              <motion.div className="flex flex-col gap-0" variants={mountItem}>
                <h1 className="text-3xl font-medium tracking-tighter text-foreground sm:text-4xl">
                  {business.name}
                </h1>

                <div className="flex flex-wrap items-center gap-2 text-base sm:text-lg tracking-tight text-muted-foreground">
                  <span>
                    {business.address.city}, {business.address.region}
                  </span>
                  <span>·</span>
                  <span>{business.timezone}</span>
                </div>
              </motion.div>

              <motion.div className="flex items-baseline gap-2" variants={mountItem}>
                <span className="text-2xl font-medium tracking-tighter text-foreground sm:text-3xl">
                  {priceDisplay}
                </span>
              </motion.div>

              <motion.p
                className="text-base sm:text-lg tracking-tight text-muted-foreground"
                variants={mountItem}
              >
                {business.description}
              </motion.p>

              <motion.div variants={mountItem}>
                <BusinessAgentActions onSelectView={setActiveView} />
              </motion.div>

              {services.length > 0 && (
                <motion.section
                  aria-labelledby="services-heading"
                  variants={mountItem}
                >
                  <h2
                    id="services-heading"
                    className="text-xl font-medium tracking-tighter text-foreground sm:text-2xl"
                  >
                    Services
                  </h2>

                  <motion.ul
                    className="mt-3"
                    variants={mountList}
                    initial={reduceMotion ? false : 'hidden'}
                    animate="show"
                  >
                    {services.map((service) => {
                      const servicePrice =
                        service.price_cents > 0
                          ? formatPrice(service.price_cents, service.currency)
                          : 'Contact for Quote';

                      return (
                        <motion.li
                          key={service.id}
                          className="border-t border-border py-3"
                          variants={mountItem}
                        >
                          <div className="flex items-baseline justify-between gap-4">
                            <span className="text-base tracking-tight text-foreground sm:text-lg">
                              {service.name}
                            </span>
                            <span className="shrink-0 text-base tracking-tight text-foreground sm:text-lg">
                              {servicePrice}
                            </span>
                          </div>
                        </motion.li>
                      );
                    })}
                  </motion.ul>
                </motion.section>
              )}

              {hoursRows.length > 0 && (
                <motion.section
                  aria-labelledby="hours-heading"
                  variants={mountItem}
                >
                  <h2
                    id="hours-heading"
                    className="text-xl font-medium tracking-tighter text-foreground sm:text-2xl"
                  >
                    Hours
                  </h2>

                  <motion.ul
                    className="mt-3"
                    variants={mountList}
                    initial={reduceMotion ? false : 'hidden'}
                    animate="show"
                  >
                    {hoursRows.map((row) => (
                      <motion.li
                        key={row.day}
                        className="flex items-baseline justify-between gap-4 border-t border-border py-3"
                        variants={mountItem}
                      >
                        <span className="text-base tracking-tight text-foreground sm:text-lg">
                          {row.day}
                        </span>
                        <span className="shrink-0 text-base tracking-tight text-muted-foreground sm:text-lg">
                          {row.time}
                        </span>
                      </motion.li>
                    ))}
                  </motion.ul>
                </motion.section>
              )}

              <motion.section aria-labelledby="faq-heading" variants={mountItem}>
                <h2
                  id="faq-heading"
                  className="text-xl font-medium tracking-tighter text-foreground sm:text-2xl"
                >
                  Frequently asked questions
                </h2>

                <Accordion className="mt-3">
                  <motion.div
                    variants={mountList}
                    initial={reduceMotion ? false : 'hidden'}
                    animate="show"
                  >
                    {faqs.map((faq) => (
                      <motion.div key={faq.id} variants={mountItem}>
                        <AccordionItem value={faq.id}>
                          <AccordionTrigger>{faq.question}</AccordionTrigger>
                          <AccordionContent>{faq.answer}</AccordionContent>
                        </AccordionItem>
                      </motion.div>
                    ))}
                  </motion.div>
                </Accordion>
              </motion.section>
            </motion.div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
