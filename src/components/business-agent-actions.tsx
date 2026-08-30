'use client';

import { ArrowUpRightIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type BusinessAgentView = 'chatgpt' | 'demo' | 'inspect';

export interface BusinessAgentActionsProps {
  onSelectView: (view: BusinessAgentView) => void;
}

export function BusinessAgentActions({
  onSelectView,
}: BusinessAgentActionsProps) {
  return (
    <div className="flex flex-col gap-3">
      <Button
        size="lg"
        type="button"
        className="h-12 w-full text-base font-medium tracking-tight cursor-pointer"
        onClick={() => onSelectView('chatgpt')}
      >
        Book with ChatGPT
        <ArrowUpRightIcon className="size-[1em]" />
      </Button>

      <Button
        size="lg"
        type="button"
        variant="outline"
        className="h-12 w-full text-base font-medium tracking-tight cursor-pointer"
        onClick={() => onSelectView('demo')}
      >
        See how AI booking works
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="self-start px-0 text-muted-foreground hover:text-foreground cursor-pointer"
        onClick={() => onSelectView('inspect')}
      >
        Inspect tooling
      </Button>
    </div>
  );
}
