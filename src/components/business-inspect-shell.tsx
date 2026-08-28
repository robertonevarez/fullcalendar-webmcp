'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useState, type ReactNode } from 'react';
import { WebMCPInspectView } from '@/components/webmcp-inspect-view';
import { Button } from '@/components/ui/button';

type View = 'card' | 'inspect';

const TRANSITION = {
  duration: 0.2,
  ease: [0.45, 0, 0.55, 1] as const,
};

const REDUCED_TRANSITION = {
  duration: 0.01,
  ease: 'linear' as const,
};

export function BusinessInspectShell({ children }: { children: ReactNode }) {
  const [view, setView] = useState<View>('card');
  const prefersReducedMotion = useReducedMotion();
  const transition = prefersReducedMotion ? REDUCED_TRANSITION : TRANSITION;

  return (
    <main className="flex h-dvh w-full items-center justify-center p-5 sm:p-7 md:p-10 lg:p-14">
      <div className="relative flex h-full w-full max-w-6xl flex-col">
        <div className="relative min-h-0 flex-1">
          <AnimatePresence mode="sync" initial={false}>
            {view === 'card' ? (
              <motion.div
                key="card"
                className="absolute inset-0 card-drop-shadow"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, pointerEvents: 'auto' }}
                exit={{ opacity: 0, pointerEvents: 'none' }}
                transition={transition}
              >
                {children}
              </motion.div>
            ) : null}
            {view === 'inspect' ? (
              <motion.div
                key="inspect"
                className="absolute inset-0"
                initial={{ opacity: 0, pointerEvents: 'none' }}
                animate={{ opacity: 1, pointerEvents: 'auto' }}
                exit={{ opacity: 0, pointerEvents: 'none' }}
                transition={transition}
              >
                <WebMCPInspectView />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <div className="flex shrink-0 justify-center pt-4 sm:pt-5">
          <Button
            type="button"
            size="xs"
            variant="link"
            onClick={() => setView((v) => (v === 'card' ? 'inspect' : 'card'))}
            className="tracking-tight text-muted-foreground"
          >
            {view === 'card' ? 'Inspect WebMCP' : 'Back'}
          </Button>
        </div>
      </div>
    </main>
  );
}
