'use client';

import { useState } from 'react';
import { Panel } from '@/components/layout';
import { Button } from '@/components/ui/button';

export function CopyPrompt({ text, label = 'Copy prompt' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Panel>
      <pre className="whitespace-pre-wrap font-mono text-sm">{text}</pre>
      <Button type="button" variant="outline" onClick={onCopy}>
        {copied ? 'Copied' : label}
      </Button>
    </Panel>
  );
}
