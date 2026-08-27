'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AgentActivity } from '@/components/demo/agent-activity';
import { AgentCursor } from '@/components/demo/agent-cursor';
import { BusinessWebsite } from '@/components/demo/business-website';
import { Bubble, BubbleContent } from '@/components/ui/bubble';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
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
import {
  playVisualSequence,
  WALKTHROUGH_VISUAL_TIMINGS,
  type VisualPhase,
} from '@/demo/visual-sequence';
import {
  CANONICAL_WALKTHROUGH_SCRIPT,
  isAbortError,
  playWalkthrough,
  waitAfterUserAppear,
  type PlaybackState,
  type WalkthroughScript,
} from '@/demo/walkthrough';
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
  /** Simulated-user script. Defaults to the canonical Acme walkthrough. */
  script?: WalkthroughScript;
  onPlaybackStateChange?: (state: PlaybackState) => void;
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
  script = CANONICAL_WALKTHROUGH_SCRIPT,
  onPlaybackStateChange,
  onBooked,
}: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const conversationRef = useRef<DemoConversationState>(emptyConversationState());
  const reducedMotion = useReducedMotion();
  const reducedMotionRef = useRef(reducedMotion);

  useEffect(() => {
    reducedMotionRef.current = reducedMotion;
  }, [reducedMotion]);

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
  const [playbackState, setPlaybackState] = useState<PlaybackState>('playing');

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

  const updatePlaybackState = useCallback(
    (state: PlaybackState) => {
      setPlaybackState(state);
      onPlaybackStateChange?.(state);
    },
    [onPlaybackStateChange],
  );

  async function runVisualThenReply(options: {
    activity: DemoActivityStep[];
    reply: string;
    signal: AbortSignal;
  }) {
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
      const preferReduced = reducedMotionRef.current;
      await playVisualSequence({
        activity: options.activity,
        reducedMotion: preferReduced,
        signal: options.signal,
        timings: preferReduced ? undefined : WALKTHROUGH_VISUAL_TIMINGS,
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
      if (isAbortError(error)) return;
      throw error;
    }

    if (options.signal.aborted) return;

    setActiveStepId(null);
    setVisualPhase('idle');
    setCursorVisible(false);
    setStatusText(null);
    setMessages((prev) => [
      ...prev,
      { id: `assistant_${crypto.randomUUID()}`, role: 'assistant', text: options.reply },
    ]);
  }

  async function executeScriptedTurn(message: string, signal: AbortSignal) {
    setBusy(true);
    setMessages((prev) => [
      ...prev,
      { id: `user_${crypto.randomUUID()}`, role: 'user', text: message },
    ]);

    try {
      await waitAfterUserAppear(signal);

      if (signal.aborted) {
        throw new DOMException('Aborted', 'AbortError');
      }

      const response = await fetch('/api/demo/turn', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          config,
          conversation: conversationRef.current,
          message,
        }),
        signal,
      });
      const payload = (await response.json()) as Partial<DemoTurnResponse> & {
        ok: boolean;
        reply?: string;
        error?: { message: string };
        activity?: DemoActivityStep[];
      };

      if (signal.aborted) {
        throw new DOMException('Aborted', 'AbortError');
      }

      const reply = payload.reply ?? payload.error?.message ?? 'I could not complete that request.';
      const turnActivity = payload.activity ?? [];

      if (payload.ok && payload.conversation) {
        conversationRef.current = payload.conversation;
        setConversation(payload.conversation);
        if (payload.conversation.phase === 'booked') onBooked?.();
      }
      if (payload.ok && payload.businessNotice) {
        setBusinessNotice(payload.businessNotice);
      }

      await runVisualThenReply({ activity: turnActivity, reply, signal });

      return { hadActivity: turnActivity.length > 0 };
    } catch (error) {
      if (isAbortError(error)) throw error;
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant_${crypto.randomUUID()}`,
          role: 'assistant',
          text: 'The demo could not reach the scheduling service. Check your connection and try again.',
        },
      ]);
      return { hadActivity: false };
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    abortRef.current = controller;

    conversationRef.current = emptyConversationState();

    void (async () => {
      try {
        await playWalkthrough({
          script,
          signal: controller.signal,
          runTurn: (message) => executeScriptedTurn(message, controller.signal),
          onStateChange: updatePlaybackState,
        });
      } catch (error) {
        if (isAbortError(error)) return;
        console.error('Walkthrough failed', error);
        updatePlaybackState('idle');
      }
    })();

    return () => {
      controller.abort();
      abortRef.current = null;
    };
    // Remount (Replay) creates a fresh instance; do not re-run on callback identity churn.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional mount-once autoplay
  }, []);

  const footerLabel =
    playbackState === 'completed'
      ? 'Walkthrough complete'
      : playbackState === 'playing'
        ? 'Product walkthrough'
        : 'Agent conversation';

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
            data-demo-playback={playbackState}
            className={cn(
              inter.className,
              'mx-auto flex h-full max-h-[80svh] min-h-0 w-full max-w-sm flex-col gap-0 rounded-3xl py-0 md:mx-0',
            )}
            role="region"
            aria-label="Agent conversation"
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

            <CardFooter className="rounded-b-3xl py-(--card-spacing)">
              <p className="w-full text-center text-xs tracking-tight text-muted-foreground">
                {footerLabel}
              </p>
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
