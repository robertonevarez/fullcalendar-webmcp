'use client';

import { DEMO_PRESETS, type DemoPresetId } from '@/demo/presets';
import { cn } from '@/lib/utils';

type Props = {
  selectedId: DemoPresetId;
  onSelect: (id: DemoPresetId) => void;
  className?: string;
};

export function DemoPresetPicker({ selectedId, onSelect, className }: Props) {
  return (
    <div
      className={cn(
        'flex flex-col gap-1 rounded-xl bg-muted/40 p-1 md:flex-row',
        className,
      )}
      role="group"
      aria-label="Choose a demo business"
    >
      {DEMO_PRESETS.map((preset) => {
        const selected = preset.id === selectedId;
        return (
          <button
            key={preset.id}
            type="button"
            aria-pressed={selected}
            onClick={() => onSelect(preset.id)}
            className={cn(
              'flex w-full flex-col items-start gap-0.5 rounded-lg border border-transparent px-3 py-2 text-left outline-none transition-colors sm:flex-1',
              'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
              selected
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <span className="text-sm font-medium tracking-tight">{preset.label}</span>
            <span className="text-xs tracking-tight text-muted-foreground">{preset.blurb}</span>
          </button>
        );
      })}
    </div>
  );
}
