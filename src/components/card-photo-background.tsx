'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

export interface PhotoConfig {
  src: string;
  objectPosition?: string;
}

const SHARP_LAYER_MASK =
  'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.45) 12%, rgba(0,0,0,0.82) 20%, black 28%, black 72%, rgba(0,0,0,0.82) 80%, rgba(0,0,0,0.45) 88%, transparent 100%)';

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

export function CardPhotoBackground({
  images,
  intervalMs = 6500,
  slug,
}: CardPhotoBackgroundProps) {
  const photoConfigs: PhotoConfig[] = images
    ? images.map((item) => (typeof item === 'string' ? { src: item } : item))
    : (slug && BUSINESS_PHOTOS[slug])
      ? BUSINESS_PHOTOS[slug]
      : (BUSINESS_PHOTOS['marias-cleaning'] ?? []);

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!photoConfigs || photoConfigs.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % photoConfigs.length);
    }, intervalMs);
    return () => clearInterval(interval);
  }, [photoConfigs, intervalMs]);

  if (!photoConfigs || photoConfigs.length === 0) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 select-none overflow-hidden rounded-[inherit]"
    >
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
            <div className="absolute inset-0 opacity-35">
              <CardPhotoImage
                src={photo.src}
                className={`object-cover ${AMBIENT_SCALE} blur-3xl brightness-95 ${objectPosition}`}
              />
            </div>

            {/* Edge blur — scaled; revealed at top/bottom via sharp layer mask */}
            <div className="absolute inset-0">
              <CardPhotoImage
                src={photo.src}
                className={`object-cover blur-2xl brightness-95 ${objectPosition} transition-transform duration-[6500ms] ease-out ${
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
  );
}
