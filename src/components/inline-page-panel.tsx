'use client';

import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowLeftIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DURATION_NORMAL_S, EASE_IN_OUT } from '@/lib/motion';

export interface InlinePagePanelProps {
  title: string;
  description: string;
  onBack: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * Full-page centered panel used when swapping away from the product layout.
 * No dialog/overlay — same page, quieter mode.
 */
export function InlinePagePanel({
  title,
  description,
  onBack,
  children,
  footer,
}: InlinePagePanelProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className="flex min-h-dvh w-full flex-col bg-background px-6 py-8 text-foreground lg:min-h-full lg:justify-center"
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION_NORMAL_S, ease: EASE_IN_OUT }}
    >
      <div className="mx-auto flex w-full max-w-lg flex-col gap-8">
        <div className="flex flex-col gap-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="self-start -ml-2 cursor-pointer text-muted-foreground hover:text-foreground"
            onClick={onBack}
          >
            <ArrowLeftIcon data-icon="inline-start" className="size-4" />
            Back
          </Button>

          <header className="flex flex-col gap-2">
            <h1 className="text-3xl font-medium tracking-tighter text-foreground sm:text-4xl">
              {title}
            </h1>
            <p className="text-base tracking-tight text-muted-foreground sm:text-lg">
              {description}
            </p>
          </header>
        </div>

        <div className="flex flex-col gap-6">{children}</div>

        {footer ? <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">{footer}</div> : null}
      </div>
    </motion.div>
  );
}
