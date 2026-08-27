'use client';

import { useEffect, useRef } from 'react';
import { motion, useSpring } from 'motion/react';
import { cn } from '@/lib/utils';

const DEFAULT_SPRING = {
  damping: 45,
  stiffness: 400,
  mass: 1,
  restDelta: 0.001,
} as const;

const REDUCED_MOTION_SPRING = {
  damping: 100,
  stiffness: 1000,
  mass: 1,
  restDelta: 0.001,
} as const;

type AgentCursorProps = {
  visible: boolean;
  x: number;
  y: number;
  reducedMotion?: boolean;
  className?: string;
};

function IMessageBlueCursorSVG() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={36}
      height={40}
      viewBox="0 0 50 54"
      fill="none"
      className="drop-shadow-[0_2px_5px_rgba(0,122,255,0.3)]"
      style={{ scale: 0.36, transformOrigin: 'top left' }}
    >
      <g filter="url(#imessage_cursor_filter)">
        <path
          d="M42.6817 41.1495L27.5103 6.79925C26.7269 5.02557 24.2082 5.02558 23.3927 6.79925L7.59814 41.1495C6.75833 42.9759 8.52712 44.8902 10.4125 44.1954L24.3757 39.0496C24.8829 38.8627 25.4385 38.8627 25.9422 39.0496L39.8121 44.1954C41.6849 44.8902 43.4884 42.9759 42.6817 41.1495Z"
          fill="#007AFF"
        />
        <path
          d="M43.7146 40.6933L28.5431 6.34306C27.3556 3.65428 23.5772 3.69516 22.3668 6.32755L6.57226 40.6778C5.3134 43.4156 7.97238 46.298 10.803 45.2549L24.7662 40.109C25.0221 40.0147 25.2999 40.0156 25.5494 40.1082L39.4193 45.254C42.2261 46.2953 44.9254 43.4347 43.7146 40.6933Z"
          stroke="white"
          strokeWidth={2.4}
        />
      </g>
      <defs>
        <filter
          id="imessage_cursor_filter"
          x="0"
          y="0"
          width="50"
          height="54"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="#000000" floodOpacity="0.2" />
        </filter>
      </defs>
    </svg>
  );
}

export function AgentCursor({
  visible,
  x,
  y,
  reducedMotion = false,
  className,
}: AgentCursorProps) {
  const springConfig = reducedMotion ? REDUCED_MOTION_SPRING : DEFAULT_SPRING;
  const lastPos = useRef({ x, y });
  const previousAngle = useRef(0);
  const accumulatedRotation = useRef(0);
  const settleTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cursorX = useSpring(x, springConfig);
  const cursorY = useSpring(y, springConfig);
  const rotation = useSpring(0, {
    ...springConfig,
    damping: reducedMotion ? 100 : 60,
    stiffness: reducedMotion ? 1000 : 300,
  });
  const scale = useSpring(1, {
    ...springConfig,
    stiffness: reducedMotion ? 1000 : 500,
    damping: reducedMotion ? 100 : 35,
  });

  useEffect(() => {
    cursorX.set(x);
    cursorY.set(y);

    const dx = x - lastPos.current.x;
    const dy = y - lastPos.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    lastPos.current = { x, y };

    if (reducedMotion || distance < 1) {
      return;
    }

    const currentAngle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
    let angleDiff = currentAngle - previousAngle.current;
    if (angleDiff > 180) angleDiff -= 360;
    if (angleDiff < -180) angleDiff += 360;
    accumulatedRotation.current += angleDiff;
    rotation.set(accumulatedRotation.current);
    previousAngle.current = currentAngle;

    scale.set(0.95);
    if (settleTimeout.current) {
      clearTimeout(settleTimeout.current);
    }
    settleTimeout.current = setTimeout(() => {
      scale.set(1);
    }, 150);
  }, [cursorX, cursorY, reducedMotion, rotation, scale, x, y]);

  useEffect(() => {
    return () => {
      if (settleTimeout.current) {
        clearTimeout(settleTimeout.current);
      }
    };
  }, []);

  return (
    <motion.div
      aria-hidden
      className={cn(
        'pointer-events-none absolute z-40 hidden md:block',
        className,
      )}
      style={{
        left: cursorX,
        top: cursorY,
        translateX: '-14%',
        translateY: '-10%',
        rotate: rotation,
        scale,
        willChange: 'transform',
      }}
      initial={false}
      animate={{ opacity: visible ? 1 : 0 }}
      transition={{ duration: reducedMotion ? 0.05 : 0.15 }}
    >
      <div className="relative">
        <IMessageBlueCursorSVG />
      </div>
    </motion.div>
  );
}
