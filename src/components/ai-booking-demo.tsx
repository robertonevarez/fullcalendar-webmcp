'use client';

import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { Business, Service } from '@/domain/types';
import { Button } from '@/components/ui/button';
import { InlinePagePanel } from '@/components/inline-page-panel';
import { buildBookingDemoScenario } from '@/lib/booking-demo-scenario';
import { DURATION_FAST_S, EASE_IN_OUT } from '@/lib/motion';

export interface AiBookingDemoProps {
  onBack: () => void;
  business: Business;
  services: Service[];
}

const STEP_COUNT = 4;

export function AiBookingDemo({
  onBack,
  business,
  services,
}: AiBookingDemoProps) {
  const reduceMotion = useReducedMotion();
  const [step, setStep] = useState(0);
  const scenario = buildBookingDemoScenario(business, services);

  const steps = [
    {
      title: 'Finds the right service',
      body: (
        <>
          <p className="text-base tracking-tight text-foreground sm:text-lg">
            {scenario.serviceLabel}
            {scenario.service ? (
              <span className="text-muted-foreground"> · {scenario.priceLabel}</span>
            ) : null}
          </p>
          {scenario.service?.description ? (
            <p className="mt-2 text-sm tracking-tight text-muted-foreground sm:text-base">
              {scenario.service.description}
            </p>
          ) : null}
        </>
      ),
    },
    {
      title: scenario.locationTitle,
      body: (
        <p className="text-base tracking-tight text-foreground sm:text-lg">
          {scenario.locationDetail}
        </p>
      ),
    },
    {
      title: scenario.scheduleLabel,
      body: (
        <p className="text-base tracking-tight text-foreground sm:text-lg">
          {scenario.scheduleDetail}
        </p>
      ),
    },
    {
      title: 'Ready to book',
      body: (
        <div className="flex flex-col gap-4">
          <dl className="grid gap-3 text-base tracking-tight sm:text-lg">
            {scenario.summaryLines.map((line) => (
              <div key={line.label} className="flex justify-between gap-4 border-t border-border pt-3">
                <dt className="text-muted-foreground">{line.label}</dt>
                <dd className="text-right font-medium text-foreground">{line.value}</dd>
              </div>
            ))}
          </dl>
          <p className="text-base tracking-tight text-foreground sm:text-lg">
            {scenario.takeaway}
          </p>
        </div>
      ),
    },
  ] as const;

  const current = steps[step] ?? steps[0];
  const isLast = step >= STEP_COUNT - 1;

  return (
    <InlinePagePanel
      title="See how AI booking works"
      description="A short walkthrough using this business’s real services. Nothing is booked."
      onBack={onBack}
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-12 cursor-pointer text-base font-medium tracking-tight"
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
          >
            Previous
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="lg"
            className="h-12 cursor-pointer text-base font-medium tracking-tight"
            onClick={() => setStep(0)}
          >
            Restart
          </Button>
          {isLast ? (
            <Button
              type="button"
              size="lg"
              className="h-12 cursor-pointer text-base font-medium tracking-tight sm:ml-auto"
              onClick={onBack}
            >
              Done
            </Button>
          ) : (
            <Button
              type="button"
              size="lg"
              className="h-12 cursor-pointer text-base font-medium tracking-tight sm:ml-auto"
              onClick={() => setStep((s) => Math.min(STEP_COUNT - 1, s + 1))}
            >
              Next
            </Button>
          )}
        </>
      }
    >
      <figure className="border-t border-border pt-4">
        <figcaption className="mb-2 text-xs font-medium tracking-tight text-muted-foreground uppercase">
          Customer request
        </figcaption>
        <blockquote className="text-base tracking-tight text-foreground sm:text-lg">
          “{scenario.customerRequest}”
        </blockquote>
      </figure>

      <p className="text-xs font-medium tracking-tight text-muted-foreground uppercase">
        Step {step + 1} of {STEP_COUNT}
      </p>

      <div aria-live="polite" aria-atomic="true" className="min-h-[8rem]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            initial={reduceMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
            transition={{ duration: DURATION_FAST_S, ease: EASE_IN_OUT }}
          >
            <h2 className="text-xl font-medium tracking-tighter text-foreground sm:text-2xl">
              {current.title}
            </h2>
            <div className="mt-3">{current.body}</div>
          </motion.div>
        </AnimatePresence>
      </div>
    </InlinePagePanel>
  );
}
