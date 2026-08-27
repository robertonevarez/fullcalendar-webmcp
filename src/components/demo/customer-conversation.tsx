'use client';

import { useId, useState } from 'react';
import { ProtocolToolingPanel } from '@/components/demo/protocol-tooling-panel';
import { Bubble, BubbleContent } from '@/components/ui/bubble';
import { Button } from '@/components/ui/button';
import { Marker, MarkerContent } from '@/components/ui/marker';
import {
  Message,
  MessageContent,
  MessageHeader,
} from '@/components/ui/message';
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from '@/components/ui/message-scroller';
import { Textarea } from '@/components/ui/textarea';
import { mergeActivity } from '@/demo/capabilities';
import { emptyConversationState } from '@/demo/engine';
import type {
  DemoActivityStep,
  DemoBusinessNotice,
  DemoConfig,
  DemoConversationState,
  DemoTurnResponse,
} from '@/demo/types';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
};

type Props = {
  config: DemoConfig;
  customerPrompt: string;
  onBooked?: () => void;
};

export function CustomerConversation({ config, customerPrompt, onBooked }: Props) {
  const formId = useId();
  const [input, setInput] = useState(customerPrompt);
  const [busy, setBusy] = useState(false);
  const [conversation, setConversation] = useState<DemoConversationState>(() =>
    emptyConversationState(),
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activity, setActivity] = useState<DemoActivityStep[]>([]);
  const [businessNotice, setBusinessNotice] = useState<DemoBusinessNotice | null>(null);

  const customerHasSpoken = messages.some((msg) => msg.role === 'user');

  async function sendMessage(raw: string) {
    const message = raw.trim();
    if (!message || busy) return;

    const userId = `user_${crypto.randomUUID()}`;
    setBusy(true);
    setMessages((prev) => [...prev, { id: userId, role: 'user', text: message }]);
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
      const payload = (await response.json()) as Partial<DemoTurnResponse> & {
        ok: boolean;
        reply?: string;
        error?: { message: string };
        activity?: DemoActivityStep[];
      };

      const reply = payload.reply ?? payload.error?.message ?? 'I could not complete that request.';
      setMessages((prev) => [
        ...prev,
        { id: `assistant_${crypto.randomUUID()}`, role: 'assistant', text: reply },
      ]);

      if (payload.activity?.length) {
        setActivity((prev) => mergeActivity(prev, payload.activity ?? []));
      }

      if (payload.ok && payload.conversation) {
        setConversation(payload.conversation);
        if (payload.conversation.phase === 'booked') onBooked?.();
      }
      if (payload.ok && payload.businessNotice) {
        setBusinessNotice(payload.businessNotice);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant_${crypto.randomUUID()}`,
          role: 'assistant',
          text: 'The demo could not reach the scheduling service. Check your connection and try again.',
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-0 flex-1 grid-rows-[minmax(24rem,1fr)_auto] md:h-full md:grid-cols-[minmax(16rem,2fr)_minmax(0,3fr)] md:grid-rows-none">
      {/* Mobile: conversation first for usability; desktop: Protocol Tooling | agent */}
      <div className="order-1 flex min-h-[24rem] flex-col overflow-hidden bg-background md:order-2 md:h-full md:min-h-0">
        <div className="space-y-1 border-b border-border px-4 py-3 md:px-5">
          <p className="text-sm font-medium tracking-tight">Customer&apos;s agent</p>
          <p className="text-xs tracking-tight text-muted-foreground">
            This represents the AI your customer already uses.
          </p>
        </div>

        <MessageScrollerProvider autoScroll>
          <div className="relative flex min-h-0 flex-1 flex-col">
            <MessageScroller className="flex-1">
              <MessageScrollerViewport>
                <MessageScrollerContent className="gap-6 p-4 md:p-5">
                  {messages.length === 0 && !busy ? (
                    <MessageScrollerItem messageId="empty">
                      <p className="mx-auto max-w-xs py-10 text-center text-sm tracking-tight text-muted-foreground">
                        Send a request. The agent books against Protocol Tooling.
                      </p>
                    </MessageScrollerItem>
                  ) : null}

                  {messages.map((msg) => {
                    const isUser = msg.role === 'user';
                    return (
                      <MessageScrollerItem
                        key={msg.id}
                        messageId={msg.id}
                        scrollAnchor={isUser}
                      >
                        <Message align={isUser ? 'end' : 'start'}>
                          <MessageContent>
                            <MessageHeader>{isUser ? 'You' : 'Agent'}</MessageHeader>
                            <Bubble
                              variant={isUser ? 'default' : 'secondary'}
                              align={isUser ? 'end' : 'start'}
                            >
                              <BubbleContent className="whitespace-pre-wrap">
                                {msg.text}
                              </BubbleContent>
                            </Bubble>
                          </MessageContent>
                        </Message>
                      </MessageScrollerItem>
                    );
                  })}

                  {busy ? (
                    <MessageScrollerItem messageId="status-busy">
                      <Message align="start">
                        <Marker role="status">
                          <MarkerContent>
                            Checking with {config.businessName}…
                          </MarkerContent>
                        </Marker>
                      </Message>
                    </MessageScrollerItem>
                  ) : null}
                </MessageScrollerContent>
              </MessageScrollerViewport>
              <MessageScrollerButton />
            </MessageScroller>
          </div>
        </MessageScrollerProvider>

        <form
          className="shrink-0 space-y-2 border-t border-border p-3 md:px-4 md:py-3"
          onSubmit={(e) => {
            e.preventDefault();
            void sendMessage(input);
          }}
        >
          <label className="sr-only" htmlFor={formId}>
            Message to the customer&apos;s agent
          </label>
          <Textarea
            id={formId}
            rows={2}
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
            aria-busy={busy}
          />
          <div className="flex items-center gap-2">
            {customerHasSpoken ? null : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() => setInput(customerPrompt)}
              >
                Use example prompt
              </Button>
            )}
            <Button type="submit" className="ml-auto" disabled={busy || !input.trim()}>
              Send
            </Button>
          </div>
        </form>
      </div>

      <ProtocolToolingPanel
        className="order-2 border-t border-border md:order-1 md:h-full md:overflow-y-auto md:border-t-0 md:border-r"
        config={config}
        activity={activity}
        lastBooking={conversation.lastBooking}
        businessNotice={businessNotice}
      />
    </div>
  );
}
