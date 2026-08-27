'use client';

import { useState } from 'react';
import { AgentReadyMoment } from '@/components/demo/agent-ready';
import { BusinessSetupForm } from '@/components/demo/business-setup-form';
import { CustomerConversation } from '@/components/demo/customer-conversation';
import { DEFAULT_DEMO_CONFIG } from '@/demo/defaults';
import { cloneDemoConfig } from '@/demo/normalize';
import type { DemoConfig } from '@/demo/types';
import { playpenSansHebrew } from '@/lib/fonts';
import { ds, spacing } from '@/lib/design-system';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type Stage = 'setup' | 'ready' | 'customer';

export function DemoExperience() {
  const [stage, setStage] = useState<Stage>('setup');
  const [config, setConfig] = useState<DemoConfig>(() => cloneDemoConfig(DEFAULT_DEMO_CONFIG));
  const [resetKey, setResetKey] = useState(0);

  function resetDemo() {
    setConfig(cloneDemoConfig(DEFAULT_DEMO_CONFIG));
    setStage('setup');
    setResetKey((k) => k + 1);
  }

  return (
    <div key={resetKey} className="flex flex-col">
      <header className={cn('border-b border-border', spacing.sectionY)}>
        <div className={cn(ds.layout.container, spacing.x, 'space-y-4')}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-3">
              <p className="text-sm font-medium tracking-tight text-muted-foreground">
                Product demo
              </p>
              <h1
                className={cn(
                  playpenSansHebrew.className,
                  'max-w-3xl text-4xl font-medium tracking-tighter text-balance md:text-5xl',
                )}
              >
                {stage === 'setup' && 'Tell us about your business.'}
                {stage === 'ready' && 'Your business is agent-ready.'}
                {stage === 'customer' && 'Book it like a customer.'}
              </h1>
              {stage === 'setup' ? (
                <p className="max-w-2xl text-base tracking-tight text-foreground md:text-lg">
                  We only need enough information to show how your customers&apos; agents could book
                  you. Start from the example, or change anything.
                </p>
              ) : null}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={resetDemo}>
              Reset demo
            </Button>
          </div>
        </div>
      </header>

      <div className={cn(ds.layout.container, spacing.x, spacing.sectionY)}>
        {stage === 'setup' ? (
          <BusinessSetupForm
            initialConfig={config}
            onSubmit={(next) => {
              setConfig(next);
              setStage('ready');
            }}
          />
        ) : null}

        {stage === 'ready' ? (
          <AgentReadyMoment
            config={config}
            onContinue={() => setStage('customer')}
            onBack={() => setStage('setup')}
          />
        ) : null}

        {stage === 'customer' ? (
          <CustomerConversation
            config={config}
            onBack={() => setStage('ready')}
            onReset={resetDemo}
          />
        ) : null}
      </div>
    </div>
  );
}
