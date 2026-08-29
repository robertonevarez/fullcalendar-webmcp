'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import type { PhotoConfig } from '@/domain/types';

export type { PhotoConfig };

const SHARP_LAYER_MASK =
  'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.25) 14%, rgba(0,0,0,0.7) 28%, black 40%, black 60%, rgba(0,0,0,0.7) 72%, rgba(0,0,0,0.25) 86%, transparent 100%)';

/** Sharp layer: no upscale — object-cover alone fills the container. */
const SHARP_SCALE_IDLE = 'scale-100';
const SHARP_SCALE_ACTIVE = 'scale-102';

/** Blurred edge layer: scale freely; blur hides upscale artifacts. */
const BLUR_SCALE_IDLE = 'scale-110';
const BLUR_SCALE_ACTIVE = 'scale-115';

/** Ambient underlay: heavily scaled + blurred to harmonize aspect-ratio gaps. */
const AMBIENT_SCALE = 'scale-115';

const BUSINESS_PHOTOS: Record<string, PhotoConfig[]> = {
  'marias-cleaning': [
    {
      src: '/images/businesses/marias-cleaning/1.jpg',
      objectPosition: 'object-[center_20%] sm:object-[right_25%] lg:object-[80%_25%]',
    },
    {
      src: '/images/businesses/marias-cleaning/2.jpg',
      objectPosition: 'object-center sm:object-[center_35%] lg:object-[85%_35%]',
    },
    {
      src: '/images/businesses/marias-cleaning/3.jpg',
      objectPosition: 'object-[center_20%] sm:object-[right_25%] lg:object-[80%_25%]',
    },
    {
      src: '/images/businesses/marias-cleaning/4.jpg',
      objectPosition: 'object-center sm:object-[center_35%] lg:object-[75%_40%]',
    },
  ],
  'acme-hvac': [
    {
      src: '/images/businesses/acme-hvac/1.jpg',
      objectPosition: 'object-center sm:object-[center_30%]',
    },
    {
      src: '/images/businesses/acme-hvac/2.jpg',
      objectPosition: 'object-center sm:object-[center_35%]',
    },
    {
      src: '/images/businesses/acme-hvac/3.jpg',
      objectPosition: 'object-center sm:object-[center_40%]',
    },
    {
      src: '/images/businesses/acme-hvac/4.jpg',
      objectPosition: 'object-center sm:object-[center_35%]',
    },
  ],
  'blue-pipe-plumbing': [
    {
      src: '/images/businesses/blue-pipe-plumbing/1.jpg',
      objectPosition: 'object-center sm:object-[center_35%]',
    },
    {
      src: '/images/businesses/blue-pipe-plumbing/2.jpg',
      objectPosition: 'object-center sm:object-[center_30%]',
    },
    {
      src: '/images/businesses/blue-pipe-plumbing/3.jpg',
      objectPosition: 'object-center sm:object-[center_35%]',
    },
    {
      src: '/images/businesses/blue-pipe-plumbing/4.jpg',
      objectPosition: 'object-center sm:object-[center_40%]',
    },
  ],
  'northline-salon': [
    {
      src: '/images/businesses/northline-salon/1.jpg',
      objectPosition: 'object-center sm:object-[center_30%]',
    },
    {
      src: '/images/businesses/northline-salon/2.jpg',
      objectPosition: 'object-center sm:object-[center_35%]',
    },
    {
      src: '/images/businesses/northline-salon/3.jpg',
      objectPosition: 'object-center sm:object-[center_40%]',
    },
    {
      src: '/images/businesses/northline-salon/4.jpg',
      objectPosition: 'object-center sm:object-[center_35%]',
    },
  ],
  'harbor-physical-therapy': [
    {
      src: '/images/businesses/harbor-physical-therapy/1.jpg',
      objectPosition: 'object-center sm:object-[center_30%]',
    },
    {
      src: '/images/businesses/harbor-physical-therapy/2.jpg',
      objectPosition: 'object-center sm:object-[center_35%]',
    },
    {
      src: '/images/businesses/harbor-physical-therapy/3.jpg',
      objectPosition: 'object-center sm:object-[center_40%]',
    },
    {
      src: '/images/businesses/harbor-physical-therapy/4.jpg',
      objectPosition: 'object-center sm:object-[center_35%]',
    },
  ],
  'mesa-auto-service': [
    {
      src: '/images/businesses/mesa-auto-service/1.jpg',
      objectPosition: 'object-center sm:object-[center_35%]',
    },
    {
      src: '/images/businesses/mesa-auto-service/2.jpg',
      objectPosition: 'object-center sm:object-[center_30%]',
    },
    {
      src: '/images/businesses/mesa-auto-service/3.jpg',
      objectPosition: 'object-center sm:object-[center_35%]',
    },
    {
      src: '/images/businesses/mesa-auto-service/4.jpg',
      objectPosition: 'object-center sm:object-[center_40%]',
    },
  ],
};

interface CardPhotoBackgroundProps {
  images?: (string | PhotoConfig)[];
  intervalMs?: number;
  slug?: string;
}

interface CardPhotoImageProps {
  src: string;
  className?: string;
  priority?: boolean;
}

/** Local JPGs are pre-compressed — skip the optimizer to avoid WebP re-encoding and retina upscaling. */
function CardPhotoImage({ src, className, priority }: CardPhotoImageProps) {
  return (
    <Image
      src={src}
      alt=""
      fill
      unoptimized
      priority={priority}
      className={className}
    />
  );
}

function resolvePhotoConfigs(
  images: CardPhotoBackgroundProps['images'],
  slug: string | undefined,
): PhotoConfig[] {
  if (images) {
    return images.map((item) => (typeof item === 'string' ? { src: item } : item));
  }
  if (slug && BUSINESS_PHOTOS[slug]) {
    return BUSINESS_PHOTOS[slug];
  }
  return BUSINESS_PHOTOS['marias-cleaning'] ?? [];
}

export function CardPhotoBackground({
  images,
  intervalMs = 6500,
  slug,
}: CardPhotoBackgroundProps) {
  const imageKey =
    images?.map((item) => (typeof item === 'string' ? item : item.src)).join('|') ?? '';

  const photoConfigs = useMemo(
    () => resolvePhotoConfigs(images, slug),
    // Stabilize on slug + src identity so WebMCP/provider re-renders don't reset the interval.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- images covered by imageKey
    [slug, imageKey],
  );

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    setCurrentIndex(0);
  }, [photoConfigs]);

  useEffect(() => {
    if (photoConfigs.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % photoConfigs.length);
    }, intervalMs);
    return () => clearInterval(interval);
  }, [photoConfigs, intervalMs, currentIndex]);

  if (photoConfigs.length === 0) return null;

  return (
    <div className="absolute inset-0 z-0 select-none overflow-hidden rounded-[inherit]">
      {/* Background Image Layers */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        {photoConfigs.map((photo, idx) => {
          const isActive = idx === currentIndex;
          const objectPosition = photo.objectPosition ?? 'object-center';

          return (
            <div
              key={photo.src}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                isActive ? 'opacity-100' : 'opacity-0'
              }`}
            >
              {/* Ambient underlay — scaled + blurred; fills aspect-ratio gaps */}
              <div className="absolute inset-0 opacity-40">
                <CardPhotoImage
                  src={photo.src}
                  className={`object-cover ${AMBIENT_SCALE} blur-[64px] brightness-90 ${objectPosition}`}
                />
              </div>

              {/* Edge blur — scaled; revealed at top/bottom via sharp layer mask */}
              <div className="absolute inset-0">
                <CardPhotoImage
                  src={photo.src}
                  className={`object-cover blur-[40px] brightness-90 ${objectPosition} transition-transform duration-[6500ms] ease-out ${
                    isActive ? BLUR_SCALE_ACTIVE : BLUR_SCALE_IDLE
                  }`}
                />
              </div>

              {/* Sharp layer — 1× scale; focal point art-direction only */}
              <div
                className="absolute inset-0"
                style={{
                  maskImage: SHARP_LAYER_MASK,
                  WebkitMaskImage: SHARP_LAYER_MASK,
                }}
              >
                <CardPhotoImage
                  src={photo.src}
                  priority={idx === 0}
                  className={`object-cover ${objectPosition} transition-transform duration-[6500ms] ease-out ${
                    isActive ? SHARP_SCALE_ACTIVE : SHARP_SCALE_IDLE
                  }`}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Subtle Right-Edge Slideshow Navigation Dots */}
      {photoConfigs.length > 1 && (
        <div
          role="tablist"
          aria-label="Photo slideshow navigation"
          className="pointer-events-auto absolute right-2.5 sm:right-4 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-1.5 p-1 rounded-full opacity-50 hover:opacity-90 transition-opacity duration-300"
        >
          {photoConfigs.map((photo, idx) => {
            const isActive = idx === currentIndex;
            return (
              <button
                key={photo.src}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={`View photo ${idx + 1} of ${photoConfigs.length}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(idx);
                }}
                className="group relative flex h-6 w-5 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/50"
              >
                <span
                  className={`rounded-full transition-all duration-300 ease-out ${
                    isActive
                      ? 'h-4 w-1.5 bg-white/90 shadow-[0_0_6px_rgba(255,255,255,0.4)]'
                      : 'h-1.5 w-1.5 bg-white/35 group-hover:scale-125 group-hover:bg-white/80'
                  }`}
                />
                <span className="sr-only">Photo {idx + 1}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
