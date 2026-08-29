'use client';

import { useState } from 'react';
import Image from 'next/image';
import {
  CheckIcon,
  ClockIcon,
  MapPinIcon,
  ShieldCheckIcon,
  CpuIcon,
  CopyIcon,
  CheckCircle2Icon,
} from 'lucide-react';
import type { Business, Service, ServiceAreaZone } from '@/domain/types';
import { useWebMCPRegistrationState } from '@/components/webmcp-business-provider';
import { WEBMCP_TOOL_NAMES } from '@/webmcp/tools';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

function classNames(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className={className}>
      <path
        fillRule="evenodd"
        d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function formatPrice(cents: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

const BUSINESS_REVIEWS: Record<
  string,
  {
    average: number;
    count: number;
    featured: {
      id: number;
      rating: number;
      author: string;
      date: string;
      datetime: string;
      avatarSrc: string;
      content: string;
    }[];
  }
> = {
  'marias-cleaning': {
    average: 5,
    count: 84,
    featured: [
      {
        id: 1,
        rating: 5,
        author: 'Sarah Jenkins',
        date: 'August 14, 2026',
        datetime: '2026-08-14',
        avatarSrc:
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=facearea&facepad=8&w=256&h=256&q=80',
        content:
          '<p>Maria’s team did an extraordinary job on our 3-bedroom home deep clean. Every corner was spotless, and the agentic WebMCP booking made scheduling completely effortless.</p>',
      },
      {
        id: 2,
        rating: 5,
        author: 'Marcus Vance',
        date: 'August 02, 2026',
        datetime: '2026-08-02',
        avatarSrc:
          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=facearea&facepad=8&w=256&h=256&q=80',
        content:
          '<p>Punctual, thorough, and highly professional. We have them on recurring bi-weekly cleaning now. Cannot recommend them enough!</p>',
      },
    ],
  },
  'acme-hvac': {
    average: 5,
    count: 112,
    featured: [
      {
        id: 1,
        rating: 5,
        author: 'David Kowalski',
        date: 'August 19, 2026',
        datetime: '2026-08-19',
        avatarSrc:
          'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=facearea&facepad=8&w=256&h=256&q=80',
        content:
          '<p>Our condenser stopped working during a 95-degree heatwave. ACME HVAC dispatched a tech the same afternoon and resolved the issue in under 45 minutes.</p>',
      },
      {
        id: 2,
        rating: 5,
        author: 'Elena Rostova',
        date: 'July 28, 2026',
        datetime: '2026-07-28',
        avatarSrc:
          'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=facearea&facepad=8&w=256&h=256&q=80',
        content:
          '<p>Top notch diagnostic process. Honest pricing and transparent quotes before any work began.</p>',
      },
    ],
  },
};

const DEFAULT_REVIEWS = {
  average: 5,
  count: 67,
  featured: [
    {
      id: 1,
      rating: 5,
      author: 'Emily Selman',
      date: 'August 10, 2026',
      datetime: '2026-08-10',
      avatarSrc:
        'https://images.unsplash.com/photo-1502685104226-ee32379fefbe?auto=format&fit=facearea&facepad=8&w=256&h=256&q=80',
      content:
        '<p>Incredible service experience from start to finish. Highly communicative team and impeccable quality.</p>',
    },
    {
      id: 2,
      rating: 5,
      author: 'Hector Gibbons',
      date: 'July 22, 2026',
      datetime: '2026-07-22',
      avatarSrc:
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=facearea&facepad=8&w=256&h=256&q=80',
      content:
        '<p>Seamless scheduling and exceptional workmanship. Everything was transparent, timely, and executed to perfection.</p>',
    },
  ],
};

const BUSINESS_FAQS: Record<string, { question: string; answer: string }[]> = {
  'marias-cleaning': [
    {
      question: 'Do you bring your own cleaning supplies and equipment?',
      answer:
        'Yes, our team brings all eco-friendly cleaning supplies, HEPA vacuum cleaners, microfiber cloths, and specialized equipment. We only require running water and electricity at the service address.',
    },
    {
      question: 'What is your service cancellation and rescheduling policy?',
      answer:
        'Appointments can be rescheduled or cancelled with at least 24 hours notice at no charge directly via our WebMCP tools or customer portal.',
    },
    {
      question: 'How do you determine eligibility for large homes?',
      answer:
        'Standard cleaning applies up to 4 bedrooms / 3 bathrooms / 3,000 sq ft. For larger estates or heavy post-construction cleaning, please select our Deep Cleaning tier.',
    },
  ],
  default: [
    {
      question: 'How does automated agentic booking work?',
      answer:
        'This endpoint exposes standard WebMCP protocol tools directly to connected AI agents (such as ChatGPT or Chrome WebMCP clients), allowing autonomous discovery, eligibility checks, real-time availability querying, and instant booking confirmation.',
    },
    {
      question: 'What happens after an appointment request is submitted?',
      answer:
        'The appointment is validated against real-time staff/resource schedules and service zones. Confirmed bookings immediately hold slot capacity and issue an authoritative appointment confirmation ID.',
    },
    {
      question: 'What geographic areas are covered?',
      answer:
        'Service is provided throughout our designated postal code zones. Agents and users can call the `check_service_area` WebMCP tool to verify instant territory eligibility.',
    },
  ],
};

interface BusinessProductOverviewProps {
  business: Business;
  services: Service[];
  serviceZones?: ServiceAreaZone[];
}

export function BusinessProductOverview({
  business,
  services,
  serviceZones,
}: BusinessProductOverviewProps) {
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [selectedTab, setSelectedTab] = useState<string>('services');
  const [copied, setCopied] = useState(false);

  const registrationState = useWebMCPRegistrationState();

  const photos =
    business.photos && business.photos.length > 0
      ? business.photos
      : [{ src: '/images/businesses/marias-cleaning/1.jpg', objectPosition: 'object-center' }];

  const activePhoto = photos[selectedPhotoIndex] ?? photos[0];
  const reviewsData = BUSINESS_REVIEWS[business.slug] ?? DEFAULT_REVIEWS;
  const faqsData = BUSINESS_FAQS[business.slug] ?? BUSINESS_FAQS.default;

  // Calculate pricing range
  const prices = services.map((s) => s.price_cents).filter((p) => p > 0);
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
  const priceDisplay =
    minPrice > 0
      ? minPrice === maxPrice
        ? formatPrice(minPrice)
        : `From ${formatPrice(minPrice)}`
      : 'Contact for Quote';

  const postalCodes = serviceZones?.flatMap((z) => z.postal_codes) ?? [];

  const handleCopyEndpoint = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const isWebMcpActive =
    registrationState.phase === 'registered' ||
    (registrationState.phase === 'failed' &&
      'registered' in registrationState &&
      (registrationState.registered as string[]).length > 0);

  const registeredTools =
    isWebMcpActive && 'registered' in registrationState
      ? (registrationState.registered as string[])
      : [...WEBMCP_TOOL_NAMES];

  return (
    <div className="bg-background text-foreground transition-colors p-6">
      <div className="mx-auto max-w-7xl">
        {/* Product / Business Overview Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
          {/* Main Media Gallery (Left Column) */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="overflow-hidden rounded-2xl border border-border bg-muted/40 shadow-xs">
              <div className="relative aspect-4/3 w-full overflow-hidden bg-muted">
                <Image
                  src={activePhoto.src}
                  alt={business.name}
                  fill
                  priority
                  unoptimized
                  className={classNames(
                    'object-cover transition-all duration-500',
                    activePhoto.objectPosition ?? 'object-center',
                  )}
                />
                <div className="absolute top-6 left-6 flex flex-wrap gap-2">
                  <Badge variant="secondary" className="bg-black/65 text-white backdrop-blur-md border-white/10 shadow-xs">
                    <ShieldCheckIcon className="size-3.5 text-emerald-400" />
                    Verified Provider
                  </Badge>
                </div>
              </div>
            </div>

            {/* Photo Thumbnails Selector (if multiple photos) */}
            {photos.length > 1 && (
              <div className="flex gap-6 overflow-x-auto pb-1">
                {photos.map((photo, idx) => (
                  <button
                    key={photo.src}
                    type="button"
                    onClick={() => setSelectedPhotoIndex(idx)}
                    className={classNames(
                      'relative aspect-4/3 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition-all cursor-pointer',
                      selectedPhotoIndex === idx
                        ? 'border-primary ring-2 ring-primary/20 scale-102'
                        : 'border-border/80 opacity-70 hover:opacity-100',
                    )}
                  >
                    <Image
                      src={photo.src}
                      alt={`Photo ${idx + 1}`}
                      fill
                      unoptimized
                      className={classNames('object-cover', photo.objectPosition ?? 'object-center')}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Business Details (Right Column) */}
          <div className="lg:col-span-3 flex flex-col gap-6">
            <div className="flex flex-col gap-6">
              {/* Header block */}
              <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                  {business.name}
                </h1>

                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <MapPinIcon className="size-4 shrink-0 text-muted-foreground/80" />
                    <span>
                      {business.address.city}, {business.address.region}
                    </span>
                  </div>
                  <span>•</span>
                  <div className="flex items-center gap-1 font-mono text-xs">
                    <ClockIcon className="size-3.5 shrink-0 text-muted-foreground/80" />
                    <span>{business.timezone}</span>
                  </div>
                </div>
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-foreground">
                  {priceDisplay}
                </span>
                {minPrice > 0 && minPrice !== maxPrice && (
                  <span className="text-xs text-muted-foreground">
                    (Up to {formatPrice(maxPrice)})
                  </span>
                )}
              </div>

              {/* Description */}
              <p className="text-sm leading-relaxed text-muted-foreground">
                {business.description}
              </p>

              {/* Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <Button
                  size="lg"
                  onClick={() => setSelectedTab('services')}
                  className="w-full font-semibold shadow-xs cursor-pointer"
                >
                  View Services &amp; Book
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => setSelectedTab('webmcp')}
                  className="w-full gap-2 font-semibold cursor-pointer"
                >
                  <CpuIcon className="size-4" />
                  Inspect WebMCP
                </Button>
              </div>

              <Separator />

              {/* Highlights */}
              <div className="flex flex-col gap-3">
                <h3 className="text-sm font-semibold tracking-tight text-foreground">Highlights</h3>
                <ul role="list" className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2.5">
                    <CheckIcon className="size-4 shrink-0 text-emerald-600 mt-0.5" />
                    <span>Instant agentic scheduling via native WebMCP integration</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckIcon className="size-4 shrink-0 text-emerald-600 mt-0.5" />
                    <span>
                      Location mode:{' '}
                      <strong className="font-medium text-foreground">
                        {business.location_mode.replace('_', ' ')}
                      </strong>
                    </span>
                  </li>
                  {services.length > 0 && (
                    <li className="flex items-start gap-2.5">
                      <CheckIcon className="size-4 shrink-0 text-emerald-600 mt-0.5" />
                      <span>{services.length} specialized service packages</span>
                    </li>
                  )}
                  <li className="flex items-start gap-2.5">
                    <CheckIcon className="size-4 shrink-0 text-emerald-600 mt-0.5" />
                    <span>Real-time availability synchronization</span>
                  </li>
                </ul>
              </div>

              <Separator />

              {/* Service Area & Endpoint */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold tracking-tight text-foreground">
                    Service Area &amp; Endpoint
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyEndpoint}
                    className="h-7 text-xs font-medium text-primary cursor-pointer gap-1.5"
                  >
                    {copied ? (
                      <>
                        <CheckCircle2Icon className="size-3.5 text-emerald-600" />
                        Copied URL
                      </>
                    ) : (
                      <>
                        <CopyIcon className="size-3.5" />
                        Copy URL
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Operating in{' '}
                  <span className="font-medium text-foreground">
                    {business.address.city}, {business.address.region}
                  </span>{' '}
                  ({business.address.postal_code})
                  {postalCodes.length > 0 && (
                    <>
                      {' '}
                      serving postal codes:{' '}
                      <span className="font-mono text-xs text-foreground">
                        {postalCodes.slice(0, 5).join(', ')}
                        {postalCodes.length > 5 ? ` +${postalCodes.length - 5} more` : ''}
                      </span>
                    </>
                  )}
                  .
                </p>
              </div>
            </div>
          </div>

          {/* Interactive Shadcn Tabs (Bottom Span) */}
          <div className="lg:col-span-7 flex flex-col gap-6 pt-6">
            <Tabs value={selectedTab} onValueChange={(val) => typeof val === 'string' && setSelectedTab(val)}>
              <TabsList variant="line" className="w-full justify-start border-b border-border gap-6 overflow-x-auto">
                <TabsTrigger value="services" className="cursor-pointer pb-3 text-sm">
                  Services &amp; Pricing ({services.length})
                </TabsTrigger>
                <TabsTrigger value="reviews" className="cursor-pointer pb-3 text-sm">
                  Customer Reviews
                </TabsTrigger>
                <TabsTrigger value="faq" className="cursor-pointer pb-3 text-sm">
                  FAQ
                </TabsTrigger>
                <TabsTrigger value="webmcp" className="cursor-pointer pb-3 text-sm flex items-center gap-1.5">
                  <span
                    className={classNames(
                      'inline-block size-2 rounded-full',
                      isWebMcpActive ? 'bg-emerald-500' : 'bg-amber-500',
                    )}
                  />
                  WebMCP Live Tools
                </TabsTrigger>
              </TabsList>

              {/* Tab 1: Services & Offerings */}
              <TabsContent value="services" className="pt-6">
                <h3 className="sr-only">Services and Pricing</h3>
                {services.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No services listed.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {services.map((service) => (
                      <Card key={service.id} className="p-6 flex flex-col justify-between gap-6 transition hover:border-foreground/20">
                        <CardHeader className="p-0 gap-2">
                          <div className="flex items-baseline justify-between gap-2">
                            <CardTitle className="text-base font-semibold text-foreground">
                              {service.name}
                            </CardTitle>
                            <span className="text-base font-bold text-primary shrink-0">
                              {formatPrice(service.price_cents, service.currency)}
                            </span>
                          </div>
                          <CardDescription className="text-sm text-muted-foreground leading-relaxed">
                            {service.description}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <Badge variant="outline" className="gap-1 font-normal text-muted-foreground">
                              <ClockIcon className="size-3" />
                              {service.duration_minutes} mins
                            </Badge>
                            {service.eligibility_rules?.requires_water_and_power && (
                              <Badge variant="secondary" className="gap-1 font-normal text-emerald-700 dark:text-emerald-400 bg-emerald-500/10">
                                <CheckCircle2Icon className="size-3 text-emerald-600" />
                                Water &amp; Power
                              </Badge>
                            )}
                            {service.intake_fields.map((field) => (
                              <Badge key={field} variant="ghost" className="font-mono text-[11px]">
                                {field}
                              </Badge>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Tab 2: Customer Reviews */}
              <TabsContent value="reviews" className="pt-6 divide-y divide-border">
                <h3 className="sr-only">Customer Reviews</h3>
                {reviewsData.featured.map((review) => (
                  <div
                    key={review.id}
                    className="flex space-x-4 py-6 text-sm text-muted-foreground"
                  >
                    <div className="shrink-0">
                      <img
                        alt=""
                        src={review.avatarSrc}
                        className="size-10 rounded-full bg-muted object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-foreground">{review.author}</h4>
                        <time
                          dateTime={review.datetime}
                          className="text-xs text-muted-foreground"
                        >
                          {review.date}
                        </time>
                      </div>
                      <div className="mt-1 flex items-center">
                        {[0, 1, 2, 3, 4].map((rating) => (
                          <StarIcon
                            key={rating}
                            className={classNames(
                              review.rating > rating ? 'text-amber-400' : 'text-muted/40',
                              'size-4 shrink-0',
                            )}
                          />
                        ))}
                      </div>
                      <div
                        dangerouslySetInnerHTML={{ __html: review.content }}
                        className="mt-2 text-sm leading-relaxed text-muted-foreground"
                      />
                    </div>
                  </div>
                ))}
              </TabsContent>

              {/* Tab 3: FAQ */}
              <TabsContent value="faq" className="pt-6">
                <h3 className="sr-only">Frequently Asked Questions</h3>
                <dl className="grid grid-cols-1 gap-6">
                  {faqsData.map((faq) => (
                    <Card key={faq.question} className="p-6 bg-muted/20 gap-2">
                      <CardHeader className="p-0 pb-1">
                        <dt className="text-sm font-semibold text-foreground">{faq.question}</dt>
                      </CardHeader>
                      <CardContent className="p-0">
                        <dd className="text-sm leading-relaxed text-muted-foreground">
                          {faq.answer}
                        </dd>
                      </CardContent>
                    </Card>
                  ))}
                </dl>
              </TabsContent>

              {/* Tab 4: WebMCP Protocol & Live Tools */}
              <TabsContent value="webmcp" className="pt-6 flex flex-col gap-6 font-mono text-xs">
                <h3 className="sr-only">WebMCP Protocol Diagnostics</h3>

                <Card className="p-6 font-sans gap-2">
                  <CardHeader className="p-0 pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CpuIcon className="size-4 text-primary" />
                        <CardTitle className="text-sm font-semibold text-foreground">
                          WebMCP Lifecycle Status
                        </CardTitle>
                      </div>
                      <Badge
                        variant={isWebMcpActive ? 'secondary' : 'outline'}
                        className={classNames(
                          'font-mono text-xs',
                          isWebMcpActive
                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-600 border-amber-500/20',
                        )}
                      >
                        Phase: {registrationState.phase}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <CardDescription className="text-xs">
                      {isWebMcpActive
                        ? 'WebMCP tools are registered on this page and discoverable by agent runtimes.'
                        : 'WebMCP API waiting or executing in standard browser environment. In-app ChatGPT browser or Chrome flags enable native hooks.'}
                    </CardDescription>
                  </CardContent>
                </Card>

                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between text-muted-foreground text-xs font-sans">
                    <span>Exposed WebMCP Tools ({registeredTools.length})</span>
                    <span>Target: /api/businesses/{business.slug}/*</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {registeredTools.map((tool) => (
                      <div
                        key={tool}
                        className="flex items-center justify-between rounded-lg border border-border bg-muted/40 p-6 text-xs"
                      >
                        <span className="font-mono font-medium text-foreground">{tool}</span>
                        <Badge variant="ghost" className="text-[11px] font-sans">
                          Active RPC
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
