'use client';

import { useState } from 'react';
import { CustomerConversation } from '@/components/demo/customer-conversation';
import { cloneDemoConfig } from '@/demo/normalize';
import { getDefaultPreset } from '@/demo/presets';
import { CANONICAL_WALKTHROUGH_SCRIPT } from '@/demo/walkthrough';
import { playpenSansHebrew } from '@/lib/fonts';
import { ds, spacing } from '@/lib/design-system';
import { cn } from '@/lib/utils';

export function Hero() {
  const [sessionKey] = useState(0);
  const preset = getDefaultPreset();
  const config = cloneDemoConfig(preset.config);

  return (
    <section className="relative flex w-full flex-col overflow-hidden bg-background">
      <div
        className={cn(
          'relative z-10 mx-auto flex w-full max-w-6xl flex-col',
          ds.layout.container,
          spacing.page,
          'pt-3 pb-6 md:pt-4 md:pb-8',
        )}
      >
        {/* Compact Hero Header Copy */}
        <div className="mx-auto mb-3 max-w-2xl text-center md:mb-4">
          <h1
            className={cn(
              playpenSansHebrew.className,
              'text-2xl font-medium tracking-tight text-balance md:text-3xl lg:text-4xl lg:leading-[1.1]',
            )}
          >
            Your customers have agents. Let them book you.
          </h1>

          <p className="mt-1 text-xs text-muted-foreground md:text-sm">
            Protocol Tooling exposes your scheduling to personal AI agents through WebMCP.
          </p>
        </div>

        {/* Product Demo Centerpiece */}
        <div
          className="flex min-h-0 h-[72svh] max-h-[82svh] flex-col md:h-[75svh]"
          aria-label="Product demo"
        >
          <CustomerConversation
            key={sessionKey}
            config={config}
            script={CANONICAL_WALKTHROUGH_SCRIPT}
          />
        </div>
      </div>
    </section>
  );
}

