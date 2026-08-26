'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

const HERO_VIDEO = '/protocol-tooling-hero-video.mp4';
const FADE_BEFORE_END_S = 0.9;
const PAUSE_MS = 500;

type HeroVideoBackgroundProps = {
  className?: string;
  /** How visible the video should be (0–1). 0.4 = 40% video, 60% white wash. */
  opacity?: number;
};

export function HeroVideoBackground({
  className,
  opacity: videoOpacity = 0.4,
}: HeroVideoBackgroundProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loopOpacity, setLoopOpacity] = useState(1);
  const [reduceMotion, setReduceMotion] = useState(false);
  const washOpacity = 1 - videoOpacity;

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotion = () => setReduceMotion(media.matches);
    updateMotion();
    media.addEventListener('change', updateMotion);
    return () => media.removeEventListener('change', updateMotion);
  }, []);

  useEffect(() => {
    if (reduceMotion) return;

    const video = videoRef.current;
    if (!video) return;

    let pauseTimer: ReturnType<typeof setTimeout> | undefined;

    const onTimeUpdate = () => {
      if (!video.duration || Number.isNaN(video.duration)) return;

      const remaining = video.duration - video.currentTime;
      if (remaining <= FADE_BEFORE_END_S) {
        setLoopOpacity(Math.max(0, remaining / FADE_BEFORE_END_S));
        return;
      }

      setLoopOpacity(1);
    };

    const onEnded = () => {
      video.pause();
      setLoopOpacity(0);

      pauseTimer = setTimeout(() => {
        video.currentTime = 0;
        setLoopOpacity(1);
        void video.play();
      }, PAUSE_MS);
    };

    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('ended', onEnded);

    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('ended', onEnded);
      if (pauseTimer) clearTimeout(pauseTimer);
    };
  }, [reduceMotion]);

  if (reduceMotion) {
    return <div aria-hidden className={cn('absolute inset-0 bg-background', className)} />;
  }

  return (
    <div aria-hidden className={cn('absolute inset-0 bg-background', className)}>
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        src={HERO_VIDEO}
        className="absolute inset-0 h-full w-full object-cover object-bottom transition-opacity duration-700 ease-in-out"
        style={{ opacity: loopOpacity }}
      />
      <div
        className="absolute inset-0 bg-background"
        style={{ opacity: washOpacity }}
      />
    </div>
  );
}
