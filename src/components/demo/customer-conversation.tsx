'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AgentCursor } from '@/components/demo/agent-cursor';
import {
  AgentInteractionOverlay,
  type VisualStepEvent,
} from '@/components/demo/agent-interaction-overlay';
import { BusinessWebsite } from '@/components/demo/business-website';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { spacing } from '@/lib/design-system';
import { inter } from '@/lib/fonts';
import { cn } from '@/lib/utils';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
};

type CursorTarget = 'chat' | 'storefront' | 'overlay';

type Props = {
  config: DemoConfig;
  /** Simulated-user script. Defaults to the canonical Acme walkthrough. */
  script?: WalkthroughScript;
  onPlaybackStateChange?: (state: PlaybackState) => void;
  onBooked?: () => void;
};

function AssistantMessage({
  text,
  resolving,
}: {
  text: string;
  resolving?: boolean;
}) {
  return (
    <div
      className="flex w-full flex-col transition-[opacity,filter,transform] duration-400"
      style={{
        opacity: resolving ? 0.55 : 1,
        filter: resolving ? 'blur(0.5px)' : 'blur(0)',
        transform: resolving ? 'scale(0.985)' : 'scale(1)',
        transformOrigin: 'top left',
        transitionTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)',
        animation: 'fade-up 400ms cubic-bezier(0.23,1,0.32,1) both',
      }}
    >
      <p className="text-[13px] leading-relaxed text-ink whitespace-pre-wrap">{text}</p>
    </div>
  );
}

function pointInStage(
  stage: HTMLElement,
  selector: string,
): { x: number; y: number } | null {
  const el = stage.querySelector(selector);
  if (!el) return null;
  const stageRect = stage.getBoundingClientRect();
  const rect = el.getBoundingClientRect();

  return {
    x: rect.left - stageRect.left + rect.width / 2,
    y: rect.top - stageRect.top + rect.height / 2,
  };
}

export function CustomerConversation({
  config,
  script = CANONICAL_WALKTHROUGH_SCRIPT,
  onPlaybackStateChange,
  onBooked,
}: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const messagesScrollerRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const conversationRef = useRef<DemoConversationState>(emptyConversationState());
  const reducedMotion = useReducedMotion();
  const reducedMotionRef = useRef(reducedMotion);

  useEffect(() => {
    reducedMotionRef.current = reducedMotion;
  }, [reducedMotion]);

  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState('');
  const [conversation, setConversation] = useState<DemoConversationState>(() =>
    emptyConversationState(),
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [businessNotice, setBusinessNotice] = useState<DemoBusinessNotice | null>(null);

  const [visualPhase, setVisualPhase] = useState<VisualPhase>('idle');
  const [overlayEvent, setOverlayEvent] = useState<VisualStepEvent | null>(null);
  const [cursorVisible, setCursorVisible] = useState(false);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [statusText, setStatusText] = useState<string | null>(null);
  const [playbackState, setPlaybackState] = useState<PlaybackState>('playing');

  // Auto-scroll messages
  useEffect(() => {
    if (messagesScrollerRef.current) {
      messagesScrollerRef.current.scrollTo({
        top: messagesScrollerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages.length, busy, statusText, draft]);

  const moveCursor = useCallback((target: CursorTarget) => {
    const stage = stageRef.current;
    if (!stage) return;
    const selector = `[data-demo-target="${target}"]`;
    const point = pointInStage(stage, selector);
    if (point) setCursorPos(point);
  }, []);

  useEffect(() => {
    if (visualPhase === 'entering' || visualPhase === 'operating') {
      moveCursor('storefront');
      return;
    }
    if (visualPhase === 'returning') {
      moveCursor('chat');
    }
  }, [moveCursor, visualPhase]);

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
      if (!reducedMotionRef.current) {
        setStatusText(`Working with ${config.businessName}…`);
        await new Promise<void>((resolve, reject) => {
          const t = setTimeout(resolve, 550);
          options.signal.addEventListener(
            'abort',
            () => {
              clearTimeout(t);
              reject(new DOMException('Aborted', 'AbortError'));
            },
            { once: true },
          );
        });
        if (options.signal.aborted) return;
        setStatusText(null);
      }
      setMessages((prev) => [
        ...prev,
        { id: `assistant_${crypto.randomUUID()}`, role: 'assistant', text: options.reply },
      ]);
      return;
    }

    setOverlayEvent(null);
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
            setOverlayEvent(null);
            setStatusText('Agent returning to conversation…');
          }
          if (phase === 'idle') {
            setCursorVisible(false);
            setStatusText(null);
          }
        },
        onStepEvent: (event) => {
          setOverlayEvent(event);
          if (event) {
            setStatusText(`${event.step.label}${event.step.detail ? ` — ${event.step.detail}` : ''}`);
          }
        },
      });
    } catch (error) {
      if (isAbortError(error)) return;
      throw error;
    }

    if (options.signal.aborted) return;

    setOverlayEvent(null);
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

    try {
      // Simulate user typing into the personal agent chat prompt
      if (!reducedMotionRef.current) {
        const chars = Array.from(message);
        const charDelay = Math.max(22, Math.min(38, Math.floor(600 / chars.length)));
        for (let i = 1; i <= chars.length; i++) {
          if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
          setDraft(message.slice(0, i));
          await new Promise<void>((resolve, reject) => {
            const t = setTimeout(resolve, charDelay);
            signal.addEventListener('abort', () => {
              clearTimeout(t);
              reject(new DOMException('Aborted', 'AbortError'));
            }, { once: true });
          });
        }
        await new Promise<void>((resolve, reject) => {
          const t = setTimeout(resolve, 140);
          signal.addEventListener('abort', () => {
            clearTimeout(t);
            reject(new DOMException('Aborted', 'AbortError'));
          }, { once: true });
        });
      }

      if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
      setDraft('');
      setMessages((prev) => [
        ...prev,
        { id: `user_${crypto.randomUUID()}`, role: 'user', text: message },
      ]);

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
      setDraft('');
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

  const isAgentAccess = visualPhase === 'entering' || visualPhase === 'operating';
  const canSend = draft.trim().length > 0;

  return (
    <div
      ref={stageRef}
      className={cn(
        'relative grid min-h-0 max-h-[80svh] flex-1 grid-rows-[auto_minmax(0,1fr)] md:h-full md:max-h-[80svh] md:grid-cols-[minmax(20rem,1fr)_minmax(18rem,23rem)] md:grid-rows-none',
        spacing.gap,
      )}
    >
      <AgentCursor
        visible={cursorVisible}
        x={cursorPos.x}
        y={cursorPos.y}
        reducedMotion={reducedMotion}
      />

      {/* LEFT: Full Business Surface Container */}
      <div className="order-1 flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground md:h-full">
        <BusinessWebsite
          className="h-full min-h-0"
          config={config}
          lastBooking={conversation.lastBooking}
          businessNotice={businessNotice}
          isAgentAccess={isAgentAccess}
          overlay={
            overlayEvent ? (
              <AgentInteractionOverlay
                step={overlayEvent.step}
                status={overlayEvent.status}
                completedSteps={overlayEvent.completedSteps}
                reducedMotion={reducedMotion}
              />
            ) : null
          }
        />
      </div>

      {/* RIGHT: Customer's Personal Agent Conversation (Inter font, simplified non-descriptive UI) */}
      <div className="order-2 flex min-h-0 flex-col md:h-full">
        <div
          data-demo-target="chat"
          data-demo-playback={playbackState}
          className={cn(
            inter.className,
            'flex h-full max-h-[80svh] min-h-0 w-full max-w-sm flex-col self-start overflow-hidden rounded-[14px] border border-line bg-surface md:mx-0',
          )}
          role="region"
          aria-label="Agent conversation"
        >
          {/* conversation — scrollable messages area */}
          <ScrollArea
            className="flex-1 min-h-0"
            viewportRef={messagesScrollerRef}
            viewportClassName="scroll-fade p-3.5 pb-4 flex flex-col gap-3.5"
          >
            {messages.map((msg) => {
              if (msg.role === 'user') {
                return (
                  <div key={msg.id} className="flex justify-end pl-10">
                    <div
                      className="rounded-full bg-[#007AFF] px-3.5 py-1.5 text-[13px] leading-[1.4] text-white transition-[opacity,transform] duration-300"
                      style={{
                        transitionTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)',
                      }}
                    >
                      {msg.text}
                    </div>
                  </div>
                );
              }
              return (
                <AssistantMessage
                  key={msg.id}
                  text={msg.text}
                />
              );
            })}

            {busy || visualPhase !== 'idle' ? (
              <AssistantMessage
                text={statusText || `Working with ${config.businessName}…`}
                resolving={true}
              />
            ) : null}
          </ScrollArea>

          {/* composer — prompt text area (non-interactive playback graphic) */}
          <div className="pointer-events-none mt-auto shrink-0 select-none p-2">
            <div
              role="presentation"
              className="flex flex-col gap-1.5 rounded-[12px] border border-line bg-background p-2 shadow-[0_1px_2px_rgba(0,0,0,0.035)]"
            >
              <input
                value={draft}
                readOnly
                tabIndex={-1}
                placeholder="Ask your agent anything…"
                aria-label="Chat prompt"
                className="pointer-events-none min-h-5 select-none bg-transparent text-[13px] leading-[1.4] text-ink outline-none placeholder:text-ink-3"
              />
              <div className="flex items-center justify-end">
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label="Send"
                  disabled={!canSend}
                  className="flex size-6.5 items-center justify-center rounded-full bg-muted text-muted-foreground transition-[background-color,color,transform] duration-200"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 19V5M5 12l7-7 7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {statusText}
      </p>
    </div>
  );
}
