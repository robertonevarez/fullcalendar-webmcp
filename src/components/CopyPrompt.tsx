'use client';

import { useState } from 'react';

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
    <div className="prompt-block">
      <pre>{text}</pre>
      <p className="prompt-block-actions">
        <button type="button" className="button" onClick={onCopy}>
          {copied ? 'Copied' : label}
        </button>
      </p>
    </div>
  );
}
