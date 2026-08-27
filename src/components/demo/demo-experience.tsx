'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CustomerConversation } from '@/components/demo/customer-conversation';
import { cloneDemoConfig } from '@/demo/normalize';
import { DEFAULT_PRESET_ID, getDemoPreset, type DemoPresetId } from '@/demo/presets';
import { ds, spacing } from '@/lib/design-system';
import { cn } from '@/lib/utils';

export function DemoExperience({ presetId = DEFAULT_PRESET_ID }: { presetId?: DemoPresetId }) {
  const [sessionKey, setSessionKey] = useState(0);

  const preset = getDemoPreset(presetId);
  const config = cloneDemoConfig(preset.config);

  function resetDemo() {
    setSessionKey((k) => k + 1);
  }

  return (
    <div className="flex flex-col">
      <section className={cn(ds.layout.container, spacing.x, 'pt-3 pb-8 md:pb-10')}>
        <h1 className="sr-only">Product demo</h1>

        <div
          className="flex min-h-0 max-h-[80svh] flex-col md:h-[80svh]"
          aria-label="Product demo"
        >
          <CustomerConversation
            key={`${presetId}-${sessionKey}`}
            config={config}
            customerPrompt={preset.customerPrompt}
          />
        </div>

        <div className="mt-3">
          <button
            type="button"
            className="text-xs tracking-tight text-muted-foreground underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            onClick={resetDemo}
          >
            Reset
          </button>
        </div>

        <div className="mt-8 max-w-2xl space-y-3 text-sm tracking-tight text-muted-foreground md:text-base">
          <p>
            Your customer talks to their agent. The agent uses capabilities exposed by your
            website. Your booking system stays yours.
          </p>
          <div className="pt-1">
            <Link
              href={preset.webmcpPath}
              className="font-medium text-foreground underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              Try the real WebMCP demo
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
