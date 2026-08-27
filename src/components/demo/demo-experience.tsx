'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { CustomerConversation } from '@/components/demo/customer-conversation';
import { cloneDemoConfig } from '@/demo/normalize';
import { getDefaultPreset } from '@/demo/presets';
import { CANONICAL_WALKTHROUGH_SCRIPT, type PlaybackState } from '@/demo/walkthrough';
import { ds, spacing } from '@/lib/design-system';
import { cn } from '@/lib/utils';

/**
 * Public product demo: one self-driving Acme walkthrough.
 * Salon/Auto presets remain in the codebase for architecture and tests;
 * they are not exposed as alternate autoplay scenarios here.
 */
export function DemoExperience() {
  const [sessionKey, setSessionKey] = useState(0);
  const [playbackState, setPlaybackState] = useState<PlaybackState>('idle');

  const preset = getDefaultPreset();
  const config = cloneDemoConfig(preset.config);

  const replay = useCallback(() => {
    setPlaybackState('idle');
    setSessionKey((k) => k + 1);
  }, []);

  return (
    <div className="flex flex-col">
      <section className={cn(ds.layout.container, spacing.x, 'pt-3 pb-8 md:pb-10')}>
        <h1 className="sr-only">Product demo</h1>

        <div className="mb-2 flex items-baseline justify-between gap-4">
          <p className="text-xs tracking-tight text-muted-foreground">Product walkthrough</p>
          <button
            type="button"
            className="text-xs tracking-tight text-muted-foreground underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            onClick={replay}
          >
            Replay
          </button>
        </div>

        <div
          className="flex min-h-0 max-h-[80svh] flex-col md:h-[80svh]"
          aria-label="Product demo"
        >
          <CustomerConversation
            key={sessionKey}
            config={config}
            script={CANONICAL_WALKTHROUGH_SCRIPT}
            onPlaybackStateChange={setPlaybackState}
          />
        </div>

        <div className="mt-8 max-w-2xl space-y-3 text-sm tracking-tight text-muted-foreground md:text-base">
          <p>
            Your customer talks to their agent. The agent uses capabilities exposed by your
            website. Your booking system stays yours.
          </p>
          {playbackState === 'completed' ? (
            <div className="pt-1">
              <Link
                href={preset.webmcpPath}
                className="font-medium text-foreground underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                Try the live WebMCP demo
              </Link>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
