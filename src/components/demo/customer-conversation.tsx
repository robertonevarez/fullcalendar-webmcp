'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { ArrowUpIcon } from 'lucide-react';
import { AgentActivity } from '@/components/demo/agent-activity';
import { AgentCursor } from '@/components/demo/agent-cursor';
import { BusinessWebsite } from '@/components/demo/business-website';
import { Bubble, BubbleContent } from '@/components/ui/bubble';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from '@/components/ui/input-group';
import { Marker, MarkerContent } from '@/components/ui/marker';
import { Message, MessageContent } from '@/components/ui/message';
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from '@/components/ui/message-scroller';
import { emptyConversationState } from '@/demo/engine';
import type {
  DemoActivityStep,
  DemoBusinessNotice,
  DemoConfig,
  DemoConversationState,
  DemoTurnResponse,
} from '@/demo/types';
import { playVisualSequence, type VisualPhase } from '@/demo/visual-sequence';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { inter } from '@/lib/fonts';
import { cn } from '@/lib/utils';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
};

type CursorTarget = 'chat' | 'storefront' | `activity-${string}`;

type Props = {
  config: DemoConfig;
  customerPrompt: string;
  onBooked?: () => void;
};

function pointInStage(
  stage: HTMLElement,
  selector: string,
): { x: number; y: number } | null {
  const el = stage.querySelector(selector);
  if (!el) return null;
  const stageRect = stage.getBoundingClientRect();
  const rect = el.getBoundingClientRect();
  return {
    x: rect.left - stageRect.left + Math.min(36, rect.width * 0.12),
    y: rect.top - stageRect.top + Math.min(28, rect.height * 0.18),
  };
}

export function CustomerConversation({
  config,
  customerPrompt,
  onBooked,
}: Props) {
  const formId = useId();
  const stageRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const reducedMotion = useReducedMotion();

  const [input, setInput] = useState(customerPrompt);
  const [busy, setBusy] = useState(false);
  const [conversation, setConversation] = useState<DemoConversationState>(() =>
    emptyConversationState(),
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [businessNotice, setBusinessNotice] = useState<DemoBusinessNotice | null>(null);

  const [visualPhase, setVisualPhase] = useState<VisualPhase>('idle');
  const [traceSteps, setTraceSteps] = useState<DemoActivityStep[]>([]);
  const [activeStepId, setActiveStepId] = useState<string | null>(null);
  const [cursorVisible, setCursorVisible] = useState(false);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [statusText, setStatusText] = useState<string | null>(null);

  const customerHasSpoken = messages.some((msg) => msg.role === 'user');

  const moveCursor = useCallback((target: CursorTarget) => {
    const stage = stageRef.current;
    if (!stage) return;
    const selector = `[data-demo-target="${target}"]`;
    const point = pointInStage(stage, selector);
    if (point) setCursorPos(point);
  }, []);

  useEffect(() => {
    if (visualPhase === 'entering') {
      moveCursor('storefront');
      return;
    }
    if (visualPhase === 'returning') {
      moveCursor('chat');
      return;
    }
    if (visualPhase === 'operating' && activeStepId) {
      moveCursor(`activity-${activeStepId}`);
    }
  }, [activeStepId, moveCursor, visualPhase, traceSteps.length]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  async function runVisualThenReply(options: {
    activity: DemoActivityStep[];
    reply: string;
  }) {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    if (!options.activity.length) {
      setMessages((prev) => [
        ...prev,
        { id: `assistant_${crypto.randomUUID()}`, role: 'assistant', text: options.reply },
      ]);
      return;
    }

    setActiveStepId(null);

    moveCursor('chat');
    setCursorVisible(true);
    setStatusText('Agent accessing business website…');

    try {
      await playVisualSequence({
        activity: options.activity,
        reducedMotion,
        signal: controller.signal,
        onPhase: (phase) => {
          setVisualPhase(phase);
          if (phase === 'entering') {
            setStatusText('Agent accessing business website…');
          }
          if (phase === 'returning') {
            setActiveStepId(null);
            setStatusText('Agent returning to conversation…');
          }
          if (phase === 'idle') {
            setCursorVisible(false);
            setStatusText(null);
          }
        },
        onStep: (step) => {
          if (step) {
            setTraceSteps((prev) => {
              if (prev.some((existing) => existing.id === step.id)) {
                return prev.map((existing) =>
                  existing.id === step.id ? step : existing,
                );
              }
              return [...prev, step];
            });
            setActiveStepId(step.id);
            setStatusText(`${step.label}${step.detail ? ` — ${step.detail}` : ''}`);
          } else {
            setActiveStepId(null);
          }
        },
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      throw error;
    }

    setActiveStepId(null);
    setVisualPhase('idle');
    setCursorVisible(false);
    setStatusText(null);
    setMessages((prev) => [
      ...prev,
      { id: `assistant_${crypto.randomUUID()}`, role: 'assistant', text: options.reply },
    ]);
  }

  async function sendMessage(raw: string) {
    const message = raw.trim();
    if (!message || busy) return;

    setBusy(true);
    setMessages((prev) => [
      ...prev,
      { id: `user_${crypto.randomUUID()}`, role: 'user', text: message },
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
      const payload = (await response.json()) as Partial<DemoTurnResponse> & {
        ok: boolean;
        reply?: string;
        error?: { message: string };
        activity?: DemoActivityStep[];
      };

      const reply = payload.reply ?? payload.error?.message ?? 'I could not complete that request.';
      const turnActivity = payload.activity ?? [];

      if (payload.ok && payload.conversation) {
        setConversation(payload.conversation);
        if (payload.conversation.phase === 'booked') onBooked?.();
      }
      if (payload.ok && payload.businessNotice) {
        setBusinessNotice(payload.businessNotice);
      }

      await runVisualThenReply({ activity: turnActivity, reply });
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
    <div
      ref={stageRef}
      className="relative grid min-h-0 max-h-[80svh] flex-1 gap-6 grid-rows-[auto_minmax(0,1fr)] md:h-full md:max-h-[80svh] md:grid-cols-[minmax(20rem,1fr)_minmax(17rem,22rem)] md:grid-rows-none md:gap-10 lg:gap-14"
    >
      <AgentCursor
        visible={cursorVisible}
        x={cursorPos.x}
        y={cursorPos.y}
        reducedMotion={reducedMotion}
      />

      <div className="order-1 flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-xs md:h-full">
        <div className="min-h-0 flex-[0.64] border-b border-border md:flex-[0.56]">
          <BusinessWebsite
            className="h-full min-h-0"
            config={config}
            lastBooking={conversation.lastBooking}
            businessNotice={businessNotice}
          />
        </div>
        <div className="min-h-0 flex-[0.36] md:flex-[0.44]">
          <AgentActivity
            className="h-full min-h-0"
            steps={traceSteps}
            activeStepId={activeStepId}
          />
        </div>
      </div>

      <div className="order-2 flex min-h-0 flex-col md:h-full">
        {statusText ? (
          <p
            className="mb-2 text-xs tracking-tight text-muted-foreground md:hidden"
            role="status"
            aria-live="polite"
          >
            {statusText}
          </p>
        ) : null}

        <MessageScrollerProvider autoScroll>
          <Card
            size="sm"
            data-demo-target="chat"
            className={cn(
              inter.className,
              'mx-auto flex h-full max-h-[80svh] min-h-0 w-full max-w-sm flex-col gap-0 rounded-3xl py-0 md:mx-0',
            )}
            role="region"
            aria-label="Conversation"
          >
            <CardContent className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-t-3xl p-0">
              <MessageScroller className="flex-1">
                <MessageScrollerViewport>
                  <MessageScrollerContent
                    aria-busy={busy || visualPhase !== 'idle'}
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

                    {busy || visualPhase !== 'idle' ? (
                      <MessageScrollerItem messageId="status-busy">
                        <Message align="start">
                          <Marker role="status">
                            <MarkerContent>
                              {statusText ?? `Working with ${config.businessName}…`}
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
                    disabled={busy || visualPhase !== 'idle'}
                    aria-busy={busy}
                  />
                  <InputGroupAddon align="block-end" className="pt-1">
                    <InputGroupButton
                      type="submit"
                      variant="default"
                      size="icon-sm"
                      disabled={busy || visualPhase !== 'idle' || !input.trim()}
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

      <p className="sr-only" role="status" aria-live="polite">
        {statusText}
      </p>
    </div>
  );
}
