'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { BusinessTruthPanel } from '@/components/demo/business-truth-panel';
import { DEFAULT_CUSTOMER_PROMPT } from '@/demo/defaults';
import { emptyConversationState } from '@/demo/engine';
import type {
  DemoConfig,
  DemoConversationState,
  DemoTurnResponse,
} from '@/demo/types';
import { playpenSansHebrew } from '@/lib/fonts';
import { cn } from '@/lib/utils';

type ChatMessage = {
  id: string;
  role: 'customer' | 'agent' | 'system';
  text: string;
};

type Props = {
  config: DemoConfig;
  onBack: () => void;
  onReset: () => void;
};

export function CustomerConversation({ config, onBack, onReset }: Props) {
  const formId = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState(DEFAULT_CUSTOMER_PROMPT);
  const [busy, setBusy] = useState(false);
  const [conversation, setConversation] = useState<DemoConversationState>(() => emptyConversationState());
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'intro',
      role: 'system',
      text: 'This is a visualization of booking through a personal AI agent — not a Protocol Tooling chatbot product.',
    },
  ]);
  const [businessNotice, setBusinessNotice] = useState<DemoTurnResponse['businessNotice']>(null);

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
    <div className="flex w-full flex-col gap-8">
      <div className="mx-auto w-full max-w-2xl space-y-3 lg:mx-0 lg:max-w-none">
        <p className="text-sm font-medium tracking-tight text-muted-foreground">Step 3 of 3</p>
        <h2
          className={cn(
            playpenSansHebrew.className,
            'max-w-2xl text-3xl font-medium tracking-tighter text-balance md:text-4xl',
          )}
        >
          Now try booking it like a customer.
        </h2>
        <p className="max-w-2xl text-base tracking-tight text-foreground md:text-lg">
          Ask naturally. This is what a compatible AI agent could do when it visits an agent-ready
          business.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)] lg:items-start lg:gap-8">
        <BusinessTruthPanel
          className="order-2 lg:order-1"
          config={config}
          lastBooking={conversation.lastBooking}
          notificationEmail={
            businessNotice?.notification_email ?? config.notificationEmail
          }
        />

        <div className="order-1 flex min-h-[28rem] flex-col rounded-lg border border-border lg:order-2">
          <div className="border-b border-border px-3 py-3">
            <p className="text-sm font-medium tracking-tight">Customer · personal agent</p>
            <p className="text-xs text-muted-foreground tracking-tight">
              Talking about {config.businessName}
            </p>
          </div>

          <div
            ref={listRef}
            className="flex flex-1 flex-col gap-3 overflow-y-auto p-3"
            role="log"
            aria-live="polite"
            aria-relevant="additions"
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  'max-w-[95%] whitespace-pre-wrap text-sm tracking-tight md:text-base',
                  msg.role === 'customer' && 'ml-auto rounded-2xl bg-primary px-3 py-2 text-primary-foreground',
                  msg.role === 'agent' && 'mr-auto rounded-2xl bg-muted px-3 py-2 text-foreground',
                  msg.role === 'system' && 'mx-auto max-w-md text-center text-xs text-muted-foreground md:text-sm',
                )}
              >
                {msg.role !== 'system' ? (
                  <span className="sr-only">{msg.role === 'customer' ? 'You: ' : 'Agent: '}</span>
                ) : null}
                {msg.text}
              </div>
            ))}
            {busy ? (
              <p className="text-sm text-muted-foreground" aria-live="assertive">
                Checking with {config.businessName}…
              </p>
            ) : null}
          </div>

          <form
            className="flex flex-col gap-2 border-t border-border p-3"
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
              className="min-h-24 w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm tracking-tight outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={DEFAULT_CUSTOMER_PROMPT}
              disabled={busy}
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" disabled={busy || !input.trim()}>
                Send
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => setInput(DEFAULT_CUSTOMER_PROMPT)}
              >
                Use example prompt
              </Button>
            </div>
          </form>
        </div>
      </div>

      {conversation.phase === 'booked' ? (
        <section className="mx-auto w-full max-w-2xl space-y-4 border-t border-border pt-8 lg:mx-0 lg:max-w-3xl">
          <h3
            className={cn(
              playpenSansHebrew.className,
              'text-2xl font-medium tracking-tighter md:text-3xl',
            )}
          >
            That&apos;s Protocol Tooling.
          </h3>
          <p className="max-w-2xl text-base tracking-tight md:text-lg">
            Your booking system stays yours. Protocol Tooling gives AI agents a structured way to use
            it.
          </p>
          <p className="max-w-2xl text-sm tracking-tight text-muted-foreground md:text-base">
            In this demo, Protocol Tooling&apos;s reference scheduler provides the booking backend. In
            production, the same agent-access layer is designed to sit in front of an existing
            scheduling system.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button nativeButton={false} render={<Link href="/businesses/acme-hvac" />} size="lg">
              Try the real WebMCP demo with ChatGPT
            </Button>
            <Button type="button" variant="outline" size="lg" onClick={onReset}>
              Start over
            </Button>
            <Button type="button" variant="ghost" size="lg" onClick={onBack}>
              Edit business
            </Button>
          </div>
          <p className="max-w-2xl text-sm tracking-tight text-muted-foreground">
            Open the Acme Heating &amp; Air page in ChatGPT&apos;s in-app browser. Regular ChatGPT chat
            cannot globally invoke these tools — WebMCP works on the business page itself.
          </p>
        </section>
      ) : (
        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button type="button" variant="ghost" onClick={onReset}>
            Reset demo
          </Button>
        </div>
      )}
    </div>
  );
}
