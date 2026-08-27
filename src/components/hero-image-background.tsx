import { cn } from '@/lib/utils';

const HERO_IMAGE = '/hero-gradient.jpg';

type HeroImageBackgroundProps = {
  className?: string;
  /** How visible the image should be (0–1). 0.4 = 40% image, 60% white wash. */
  opacity?: number;
};

export function HeroImageBackground({
  className,
  opacity: imageOpacity = 1,
}: HeroImageBackgroundProps) {
  const washOpacity = 1 - imageOpacity;

  return (
    <div aria-hidden className={cn('absolute inset-0 overflow-hidden bg-background', className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={HERO_IMAGE}
        alt=""
        decoding="async"
        fetchPriority="high"
        className="h-full w-full object-cover object-bottom"
        style={{ opacity: imageOpacity }}
      />
      <div
        className="absolute inset-0 bg-background"
        style={{ opacity: washOpacity }}
      />
    </div>
  );
}
