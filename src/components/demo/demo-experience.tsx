'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { CustomerConversation } from '@/components/demo/customer-conversation';
import { DemoPresetPicker } from '@/components/demo/demo-preset-picker';
import { Button } from '@/components/ui/button';
import { cloneDemoConfig } from '@/demo/normalize';
import {
  DEFAULT_PRESET_ID,
  getDemoPreset,
  type DemoPresetId,
} from '@/demo/presets';
import { ds, spacing } from '@/lib/design-system';
import { playpenSansHebrew } from '@/lib/fonts';
import { cn } from '@/lib/utils';

export function DemoExperience() {
  const [presetId, setPresetId] = useState<DemoPresetId>(DEFAULT_PRESET_ID);
  const [sessionKey, setSessionKey] = useState(0);
  const [booked, setBooked] = useState(false);

  const preset = getDemoPreset(presetId);
  const config = cloneDemoConfig(preset.config);

  function resetDemo() {
    setPresetId(DEFAULT_PRESET_ID);
    setSessionKey((k) => k + 1);
    setBooked(false);
  }

  function selectPreset(id: DemoPresetId) {
    setPresetId(id);
    setSessionKey((k) => k + 1);
    setBooked(false);
  }

  return (
    <div className="flex flex-col">
      <section className={cn(ds.layout.container, spacing.x, 'pt-3 pb-12 md:pb-16')}>
        <h1 className="sr-only">Product demo</h1>
        <div
          className="flex flex-col overflow-hidden rounded-2xl border border-border md:h-[min(44rem,calc(100svh-8rem))] md:min-h-[36rem]"
          aria-label="Product demo"
        >
          <div className="flex shrink-0 flex-col gap-2 border-b border-border p-2 md:flex-row md:items-center md:gap-3 md:px-3 md:py-2">
            <DemoPresetPicker
              className="min-w-0 flex-1"
              selectedId={presetId}
              onSelect={selectPreset}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="self-start text-muted-foreground md:self-auto"
              onClick={resetDemo}
            >
              Reset demo
            </Button>
          </div>

          <CustomerConversation
            key={`${presetId}-${sessionKey}`}
            config={config}
            customerPrompt={preset.customerPrompt}
            presetBlurb={preset.blurb}
            onBooked={() => setBooked(true)}
          />
        </div>
      </section>

      {booked ? (
        <section className="scroll-mt-20 border-t border-border">
          <div className={cn(ds.layout.container, spacing.x, spacing.sectionY, 'space-y-4')}>
            <h2
              className={cn(
                playpenSansHebrew.className,
                'text-3xl font-medium tracking-tighter text-balance md:text-4xl',
              )}
            >
              That&apos;s Protocol Tooling.
            </h2>
            <p className="max-w-2xl text-base tracking-tight md:text-lg">
              Your booking system stays yours. Protocol Tooling gives AI agents a structured way
              to use it.
            </p>
            <p className="max-w-2xl text-sm tracking-tight text-muted-foreground md:text-base">
              In this demo, Protocol Tooling&apos;s reference scheduler provides the booking
              backend. In production, the same agent-access layer is designed to sit in front of
              an existing scheduling system.
            </p>
            <div className={cn('flex flex-wrap pt-2', spacing.gap)}>
              <Button nativeButton={false} render={<Link href={preset.webmcpPath} />} size="lg">
                Open {preset.config.businessName} in ChatGPT
                <ArrowRight />
              </Button>
              <Button type="button" variant="outline" size="lg" onClick={resetDemo}>
                Start over
              </Button>
            </div>
            <p className="max-w-2xl text-sm tracking-tight text-muted-foreground">
              Open this business page in ChatGPT&apos;s in-app browser. Regular ChatGPT chat cannot
              globally invoke these tools — WebMCP works on the business page itself.
            </p>
          </div>
        </section>
      ) : null}
    </div>
  );
}
