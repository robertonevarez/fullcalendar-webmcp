'use client';

import { useId, useState } from 'react';
import { ArrowUpIcon } from 'lucide-react';
import { ProtocolToolingPanel } from '@/components/demo/protocol-tooling-panel';
import { Bubble, BubbleContent } from '@/components/ui/bubble';
import {
  Card,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from '@/components/ui/input-group';
import { Marker, MarkerContent } from '@/components/ui/marker';
import {
  Message,
  MessageContent,
} from '@/components/ui/message';
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from '@/components/ui/message-scroller';
import { mergeActivity } from '@/demo/capabilities';
import { emptyConversationState } from '@/demo/engine';
import type {
  DemoActivityStep,
  DemoBusinessNotice,
  DemoConfig,
  DemoConversationState,
  DemoTurnResponse,
} from '@/demo/types';
import { inter } from '@/lib/fonts';
import { cn } from '@/lib/utils';

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

export function CustomerConversation({
  config,
  customerPrompt,
  onBooked,
}: Props) {
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
    <div className="grid min-h-0 flex-1 gap-3 grid-rows-[minmax(28rem,auto)_auto] md:h-full md:grid-cols-[minmax(16rem,2fr)_minmax(18rem,3fr)] md:grid-rows-none md:gap-4">
      <div className="order-1 flex min-h-0 justify-center md:order-2 md:h-full">
        <MessageScrollerProvider autoScroll>
          <Card
            size="sm"
            className={cn(
              inter.className,
              'mx-auto h-full min-h-[28rem] w-full max-w-sm gap-0 rounded-3xl py-0 md:min-h-0',
            )}
            role="region"
            aria-label="Customer agent"
          >
            <CardContent className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-t-3xl p-0">
              <MessageScroller className="flex-1">
                <MessageScrollerViewport>
                  <MessageScrollerContent
                    aria-busy={busy}
                    className="gap-6 p-(--card-spacing)"
                  >
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
                              <Bubble
                                variant={isUser ? 'default' : 'secondary'}
                                align={isUser ? 'end' : 'start'}
                                className={
                                  isUser
                                    ? '*:data-[slot=bubble-content]:rounded-3xl *:data-[slot=bubble-content]:bg-[#007AFF] *:data-[slot=bubble-content]:text-white [&>[data-slot=bubble-content]:is(button,a):hover]:bg-[#007AFF]/90'
                                    : '*:data-[slot=bubble-content]:rounded-3xl'
                                }
                              >
                                <BubbleContent className="whitespace-pre-wrap rounded-3xl">
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
            </CardContent>

            <CardFooter className="flex-col gap-2 rounded-b-3xl py-(--card-spacing)">
              <form
                className="w-full"
                onSubmit={(e) => {
                  e.preventDefault();
                  void sendMessage(input);
                }}
              >
                <InputGroup className="rounded-3xl">
                  <InputGroupTextarea
                    id={formId}
                    aria-label="Message to the customer's agent"
                    className="min-h-14 rounded-3xl px-3 py-2.5"
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
                  <InputGroupAddon align="block-end" className="pt-1">
                    <InputGroupButton
                      type="submit"
                      variant="default"
                      size="icon-sm"
                      disabled={busy || !input.trim()}
                      className="ml-auto rounded-full bg-[#007AFF] text-white hover:bg-[#007AFF]/90"
                    >
                      <ArrowUpIcon />
                      <span className="sr-only">Send</span>
                    </InputGroupButton>
                  </InputGroupAddon>
                </InputGroup>
              </form>
            </CardFooter>
          </Card>
        </MessageScrollerProvider>
      </div>

      <ProtocolToolingPanel
        className="order-2 md:order-1"
        config={config}
        activity={activity}
        lastBooking={conversation.lastBooking}
        businessNotice={businessNotice}
      />
    </div>
  );
}
