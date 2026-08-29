'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { Business, Service } from '@/domain/types';
import { useWebMCPRegistrationState } from '@/components/webmcp-business-provider';
import { Button } from '@/components/ui/button';

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

/** Strong ease-in-out for on-screen morphs — Emil Kowalski / animations.dev. */
const EASE_IN_OUT = [0.77, 0, 0.175, 1] as const;
const AUTOPLAY_MS = 5500;
const CROSSFADE_S = 1.1;

interface BusinessProductOverviewProps {
  business: Business;
  services: Service[];
}

export function BusinessProductOverview({
  business,
  services,
}: BusinessProductOverviewProps) {
  const registrationState = useWebMCPRegistrationState();
  const reduceMotion = useReducedMotion();
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
    if (photos.length < 2 || paused || reduceMotion) return;
    const id = window.setInterval(() => {
      setPhotoIndex((current) => (current + 1) % photos.length);
    }, AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [photos.length, paused, photoIndex, reduceMotion]);

  const prices = services.map((s) => s.price_cents).filter((p) => p > 0);
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const priceDisplay =
    minPrice > 0 ? `Starts at ${formatPrice(minPrice)}` : 'Contact for Quote';

  const isWebMcpActive =
    registrationState.phase === 'registered' ||
    (registrationState.phase === 'failed' &&
      'registered' in registrationState &&
      (registrationState.registered as string[]).length > 0);

  const goToPhoto = (index: number) => {
    setPhotoIndex(index);
    setPaused(true);
  };

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors p-6">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
          <div className="lg:col-span-4">
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
                        duration: reduceMotion ? 0.2 : CROSSFADE_S,
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
                            className="flex size-10 items-center justify-center cursor-pointer active:scale-[0.97] transition-transform duration-150 ease-out"
                          >
                            <span
                              className={classNames(
                                'rounded-full shadow-sm transition-[width,background-color] duration-200 ease-out',
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
          </div>

          <div className="lg:col-span-3 flex flex-col gap-6">
            <div className="flex flex-col gap-0">
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
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-medium tracking-tighter text-foreground sm:text-3xl">
                {priceDisplay}
              </span>
            </div>

            <p className="text-base sm:text-lg tracking-tight text-muted-foreground">
              {business.description}
            </p>

            <Button
              size="lg"
              variant="outline"
              type="button"
              className="h-12 w-full gap-2.5 text-base font-medium tracking-tight cursor-pointer"
            >
              <span
                className={classNames(
                  'size-1 shrink-0 rounded-full',
                  isWebMcpActive
                    ? 'bg-green-500 animate-pulse'
                    : 'bg-muted-foreground',
                )}
                aria-hidden
              />
              {isWebMcpActive ? 'Ready for ChatGPT' : 'Not ready for ChatGPT'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
