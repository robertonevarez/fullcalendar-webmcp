'use client';

import { useEffect, useId, useState } from 'react';
import type { Business, Service } from '@/domain/types';
import { Button } from '@/components/ui/button';
import { InlinePagePanel } from '@/components/inline-page-panel';
import { buildSuggestedBookingRequest } from '@/lib/booking-demo-scenario';
import { bookingGuideMode, type ChatGPTBookingGuideMode } from '@/lib/chatgpt-booking-guide-mode';
import { copyTextToClipboard } from '@/lib/clipboard';
import type { WebMCPRegistrationState } from '@/webmcp/lifecycle';

export interface ChatGPTBookingGuideProps {
  onBack: () => void;
  business: Business;
  services: Service[];
  registrationState: WebMCPRegistrationState;
}

function modeCopy(mode: ChatGPTBookingGuideMode): {
  status: string;
  body: string;
} {
  switch (mode) {
    case 'ready':
      return {
        status: 'Site Tools look available on this page.',
        body: 'Ask ChatGPT in this conversation. It can use this business’s available Site Tools to check services and availability.',
      };
    case 'checking':
      return {
        status: 'Getting ready…',
        body: 'Ask ChatGPT in this conversation. If Site Tools are available in this browser, it can check services and availability for this business.',
      };
    case 'unavailable':
      return {
        status: 'Open this page in ChatGPT’s built-in browser to book with ChatGPT.',
        body: 'Site Tools work in the ChatGPT desktop app’s built-in browser (with a supported model). Copy the request below, then ask ChatGPT once this page is open there.',
      };
  }
}

export function ChatGPTBookingGuide({
  onBack,
  business,
  services,
  registrationState,
}: ChatGPTBookingGuideProps) {
  const mode = bookingGuideMode(registrationState);
  const copy = modeCopy(mode);
  const suggestedRequest = buildSuggestedBookingRequest(business, services);
  const statusId = useId();
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!copyFeedback) return;
    const id = window.setTimeout(() => setCopyFeedback(null), 2500);
    return () => window.clearTimeout(id);
  }, [copyFeedback]);

  const handleCopy = async (text: string, label: string) => {
    const ok = await copyTextToClipboard(text);
    setCopyFeedback(ok ? `${label} copied` : `Couldn’t copy ${label.toLowerCase()}`);
  };

  const handleBack = () => {
    setCopyFeedback(null);
    onBack();
  };

  return (
    <InlinePagePanel
      title="Ask ChatGPT to book for you"
      description="This does not send a message or book an appointment. You ask ChatGPT; booking only happens after normal confirmation."
      onBack={handleBack}
      footer={
        <>
          <Button
            type="button"
            size="lg"
            className="h-12 cursor-pointer text-base font-medium tracking-tight"
            onClick={() => handleCopy(suggestedRequest, 'Request')}
          >
            Copy request
          </Button>
          {mode === 'unavailable' ? (
            <Button
              type="button"
              size="lg"
              variant="outline"
              className="h-12 cursor-pointer text-base font-medium tracking-tight"
              onClick={() => handleCopy(window.location.href, 'Page link')}
            >
              Copy page link
            </Button>
          ) : null}
        </>
      }
    >
      <p
        id={statusId}
        className="text-sm tracking-tight text-muted-foreground"
        role="status"
      >
        {copy.status}
      </p>
      <p className="text-base tracking-tight text-foreground sm:text-lg">{copy.body}</p>

      <figure className="border-t border-border pt-4">
        <figcaption className="mb-2 text-xs font-medium tracking-tight text-muted-foreground uppercase">
          Suggested request
        </figcaption>
        <blockquote className="text-base tracking-tight text-foreground sm:text-lg">
          “{suggestedRequest}”
        </blockquote>
      </figure>

      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {copyFeedback}
      </div>
      {copyFeedback ? (
        <p className="text-sm tracking-tight text-muted-foreground" aria-hidden="true">
          {copyFeedback}
        </p>
      ) : null}
    </InlinePagePanel>
  );
}
