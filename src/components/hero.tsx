'use client';

import { useState } from 'react';
import { CustomerConversation } from '@/components/demo/customer-conversation';
import { SiteHeader } from '@/components/site-header';
import { cloneDemoConfig } from '@/demo/normalize';
import { getDefaultPreset } from '@/demo/presets';
import { CANONICAL_WALKTHROUGH_SCRIPT } from '@/demo/walkthrough';
import { playpenSansHebrew } from '@/lib/fonts';
import { cn } from '@/lib/utils';

export function Hero() {
  const [sessionKey] = useState(0);
  const preset = getDefaultPreset();
  const config = cloneDemoConfig(preset.config);

  return (
    <section className="landing-shell relative flex h-full min-h-0 flex-1 flex-col overflow-hidden px-4 pb-6 pt-5 sm:px-6 sm:pb-8 sm:pt-6 md:px-8 md:pt-7">
      <div className="container mx-auto flex h-full min-h-0 w-full max-w-[76rem] flex-1 flex-col">
        <SiteHeader landing />

        <div className="flex min-h-0 w-full flex-1 flex-col pt-3 sm:pt-4">
          <div className="landing-demo-block flex min-h-0 w-full flex-1 flex-col items-stretch gap-2">
            <div className="mx-auto max-w-xl shrink-0 px-2 text-center">
              <h1
                className={cn(
                  playpenSansHebrew.className,
                  'landing-headline text-xs font-medium tracking-tight text-balance leading-snug',
                )}
              >
                Your customers have agents. Let them book you.
              </h1>

              <p className="landing-subhead mt-0.5 text-xs text-muted-foreground">
                Protocol Tooling exposes your scheduling to personal AI agents through WebMCP.
              </p>
            </div>

            <div
              className="flex min-h-0 w-full flex-1 flex-col px-1 sm:px-2"
              aria-label="Product demo"
            >
              <CustomerConversation
                key={sessionKey}
                config={config}
                script={CANONICAL_WALKTHROUGH_SCRIPT}
                landing
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
