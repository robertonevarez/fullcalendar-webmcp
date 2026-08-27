'use client';

import { cn } from '@/lib/utils';

type Props = {
  visible: boolean;
  x: number;
  y: number;
  reducedMotion?: boolean;
  className?: string;
};

/**
 * Storytelling cursor for agent access — not a literal mouse-automation pointer.
 */
export function AgentCursor({ visible, x, y, reducedMotion, className }: Props) {
  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none absolute z-40 flex items-center gap-1.5',
        !visible && 'opacity-0',
        visible && 'opacity-100',
        !reducedMotion && 'transition-[left,top,opacity] duration-500 ease-out',
        className,
      )}
      style={{ left: x, top: y }}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 18 18"
        fill="none"
        className="drop-shadow-sm"
      >
        <path
          d="M2.5 2.5L7.2 15.2L9.1 9.1L15.2 7.2L2.5 2.5Z"
          fill="currentColor"
          className="text-foreground"
          stroke="white"
          strokeWidth="1.25"
          strokeLinejoin="round"
        />
      </svg>
      <span className="rounded-md bg-foreground px-1.5 py-0.5 text-[10px] font-medium tracking-tight text-background shadow-xs">
        Agent
      </span>
    </div>
  );
}
