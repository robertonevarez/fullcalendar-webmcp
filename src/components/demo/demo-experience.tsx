'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CustomerConversation } from '@/components/demo/customer-conversation';
import { cloneDemoConfig } from '@/demo/normalize';
import {
  DEMO_PRESETS,
  DEFAULT_PRESET_ID,
  getDemoPreset,
  type DemoPresetId,
} from '@/demo/presets';
import { ds, spacing } from '@/lib/design-system';
import { cn } from '@/lib/utils';

export function DemoExperience() {
  const [presetId, setPresetId] = useState<DemoPresetId>(DEFAULT_PRESET_ID);
  const [sessionKey, setSessionKey] = useState(0);

  const preset = getDemoPreset(presetId);
  const config = cloneDemoConfig(preset.config);
  const otherPresets = DEMO_PRESETS.filter((p) => p.id !== presetId);

  function resetDemo() {
    setSessionKey((k) => k + 1);
  }

  function selectPreset(id: DemoPresetId) {
    setPresetId(id);
    setSessionKey((k) => k + 1);
  }

  return (
    <div className="flex flex-col">
      <section className={cn(ds.layout.container, spacing.x, 'pt-3 pb-8 md:pb-10')}>
        <h1 className="sr-only">Product demo</h1>

        <div
          className="flex min-h-0 flex-col md:h-[min(52rem,calc(100svh-6rem))] md:min-h-[40rem]"
          aria-label="Product demo"
        >
          <CustomerConversation
            key={`${presetId}-${sessionKey}`}
            config={config}
            customerPrompt={preset.customerPrompt}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm tracking-tight text-muted-foreground">
          <button
            type="button"
            className="text-foreground underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            onClick={resetDemo}
          >
            Reset
          </button>
          <span className="text-border" aria-hidden>
            ·
          </span>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>Try another example:</span>
            {otherPresets.map((p) => (
              <button
                key={p.id}
                type="button"
                className="text-foreground underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                onClick={() => selectPreset(p.id)}
              >
                {p.id === 'northline-salon'
                  ? 'Salon'
                  : p.id === 'mesa-auto'
                    ? 'Auto service'
                    : p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8 max-w-2xl space-y-3 text-sm tracking-tight text-muted-foreground md:text-base">
          <p>
            Your booking system stays yours. Protocol Tooling gives AI agents a structured way to
            use it.
          </p>
          <p>
            This browser demo visualizes the experience. The business page exposes the actual
            WebMCP tools to compatible agents.
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-2 pt-1">
            <Link
              href={preset.webmcpPath}
              className="font-medium text-foreground underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              Try the real WebMCP version in ChatGPT
            </Link>
            <Link
              href="/docs"
              className="underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              View documentation
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
