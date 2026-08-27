'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { BusinessTruthPanel } from '@/components/demo/business-truth-panel';
import { emptyConversationState } from '@/demo/engine';
import type {
  DemoConfig,
  DemoConversationState,
  DemoTurnResponse,
} from '@/demo/types';
import { cn } from '@/lib/utils';

type ChatMessage = {
  id: string;
  role: 'customer' | 'agent';
  text: string;
};

type Props = {
  config: DemoConfig;
  customerPrompt: string;
  presetBlurb?: string;
  onBooked?: () => void;
};

export function CustomerConversation({
  config,
  customerPrompt,
  presetBlurb,
  onBooked,
}: Props) {
  const formId = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState(customerPrompt);
  const [busy, setBusy] = useState(false);
  const [conversation, setConversation] = useState<DemoConversationState>(() =>
    emptyConversationState(),
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [businessNotice, setBusinessNotice] = useState<DemoTurnResponse['businessNotice']>(null);

  const customerHasSpoken = messages.some((msg) => msg.role === 'customer');
  const booked = conversation.phase === 'booked';

  useEffect(() => {
    listRef.current?.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, busy]);

  async function sendMessage(raw: string) {
    const message = raw.trim();
    if (!message || busy) return;

    setBusy(true);
    setMessages((prev) => [
      ...prev,
      { id: `c_${crypto.randomUUID()}`, role: 'customer', text: message },
    ]);
    setInput('');

    try {
      const response = await fetch('/api/demo/turn', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          config,
          conversation,
          message,
        }),
      });
      const payload = (await response.json()) as DemoTurnResponse & {
        ok: boolean;
        reply?: string;
        error?: { message: string };
      };

      const reply = payload.reply ?? payload.error?.message ?? 'I could not complete that request.';
      setMessages((prev) => [
        ...prev,
        { id: `a_${crypto.randomUUID()}`, role: 'agent', text: reply },
      ]);

      if (payload.ok && payload.conversation) {
        setConversation(payload.conversation);
        if (payload.conversation.phase === 'booked') onBooked?.();
      }
      if (payload.ok) {
        setBusinessNotice(payload.businessNotice);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `a_${crypto.randomUUID()}`,
          role: 'agent',
          text: 'The demo could not reach the scheduling service. Check your connection and try again.',
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-0 flex-1 md:h-full md:grid-cols-[minmax(17rem,5fr)_minmax(0,7fr)]">
      <BusinessTruthPanel
        className="border-b border-border md:h-full md:overflow-y-auto md:border-r md:border-b-0"
        config={config}
        blurb={presetBlurb}
        lastBooking={conversation.lastBooking}
        notificationEmail={businessNotice?.notification_email ?? config.notificationEmail}
      />

      <div className="flex min-h-[24rem] flex-col overflow-hidden bg-background md:h-full md:min-h-0">
        <div className="space-y-1 border-b border-border px-4 py-3 md:px-5">
          <p className="text-sm font-medium tracking-tight">Customer&apos;s personal agent</p>
          <p className="text-xs tracking-tight text-muted-foreground">
            Asking {config.businessName}
            {booked ? ' · Booked' : null}
          </p>
          <p className="text-xs tracking-tight text-muted-foreground/80">
            A visualization of booking through a personal AI agent — not a Protocol Tooling
            chatbot.
          </p>
        </div>

        <div
          ref={listRef}
          className="flex flex-1 flex-col gap-5 overflow-y-auto px-4 py-5 md:px-5"
          role="log"
          aria-live="polite"
          aria-relevant="additions"
        >
          {messages.length === 0 && !busy ? (
            <p className="m-auto max-w-xs text-center text-sm tracking-tight text-muted-foreground">
              Send a request. The agent books against these rules.
            </p>
          ) : null}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                'flex max-w-[min(100%,28rem)] flex-col gap-1',
                msg.role === 'customer' ? 'ml-auto items-end' : 'mr-auto items-start',
              )}
            >
              <span className="text-xs tracking-tight text-muted-foreground">
                {msg.role === 'customer' ? 'You' : 'Agent'}
                <span className="sr-only">: </span>
              </span>
              <p
                className={cn(
                  'whitespace-pre-wrap text-sm tracking-tight md:text-[0.9375rem]',
                  msg.role === 'customer' && 'text-right',
                  msg.role === 'agent' &&
                    'rounded-xl rounded-tl-md bg-muted/70 px-3.5 py-2.5 text-foreground',
                )}
              >
                {msg.text}
              </p>
            </div>
          ))}

          {busy ? (
            <div
              className="mr-auto flex max-w-[min(100%,28rem)] items-center gap-2 rounded-xl rounded-tl-md bg-muted/70 px-3.5 py-2.5"
              aria-live="assertive"
            >
              <span className="flex items-center gap-1" aria-hidden>
                <span className="size-1.5 rounded-full bg-muted-foreground/70 animate-pulse" />
                <span className="size-1.5 rounded-full bg-muted-foreground/70 animate-pulse [animation-delay:150ms]" />
                <span className="size-1.5 rounded-full bg-muted-foreground/70 animate-pulse [animation-delay:300ms]" />
              </span>
              <span className="text-sm tracking-tight text-muted-foreground">
                Checking with {config.businessName}…
              </span>
            </div>
          ) : null}
        </div>

        <form
          className="border-t border-border p-3 md:px-4 md:py-3"
          onSubmit={(e) => {
            e.preventDefault();
            void sendMessage(input);
          }}
        >
          <label className="sr-only" htmlFor={formId}>
            Message to the agent
          </label>
          <textarea
            id={formId}
            rows={2}
            className="min-h-12 w-full resize-none bg-transparent px-1 py-2 text-sm tracking-tight outline-none placeholder:text-muted-foreground md:text-[0.9375rem]"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void sendMessage(input);
              }
            }}
            placeholder={customerHasSpoken ? 'Ask a follow-up' : customerPrompt}
            disabled={busy}
          />
          <div className="mt-1 flex items-center gap-2">
            {customerHasSpoken ? null : (
              <button
                type="button"
                disabled={busy}
                onClick={() => setInput(customerPrompt)}
                className="rounded-sm px-1 text-xs tracking-tight text-muted-foreground outline-none hover:text-foreground hover:underline hover:underline-offset-4 focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
              >
                Use example prompt
              </button>
            )}
            <Button type="submit" className="ml-auto" disabled={busy || !input.trim()}>
              Send
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
