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
import { useReducedMotion } from '@/hooks/use-reduced-motion';

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

function Section({
  label,
  sub,
  time,
  body,
  resolving,
}: {
  label: string;
  sub: string;
  time: string;
  body: string;
  resolving?: boolean;
}) {
  return (
    <div
      className="flex w-full flex-col gap-1.5 transition-[opacity,filter,transform] duration-400"
      style={{
        opacity: resolving ? 0.55 : 1,
        filter: resolving ? 'blur(0.5px)' : 'blur(0)',
        transform: resolving ? 'scale(0.985)' : 'scale(1)',
        transformOrigin: 'top left',
        transitionTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)',
        animation: 'fade-up 400ms cubic-bezier(0.23,1,0.32,1) both',
      }}
    >
      <div className="flex items-center gap-1 text-[12px] leading-[1.3]">
        <span className="font-medium text-ink">{label}</span>
        <span className="text-ink-2">{sub}</span>
        <span className="text-ink">· {time}</span>
      </div>
      <p className="text-[13px] leading-normal text-ink whitespace-pre-wrap">{body}</p>
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

  if (selector.includes('storefront') || selector.includes('overlay')) {
    return {
      x: rect.left - stageRect.left + rect.width / 2,
      y: rect.top - stageRect.top + rect.height * 0.42,
    };
  }

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
  const messagesScrollerRef = useRef<HTMLDivElement>(null);
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
  const [tab, setTab] = useState('Assistant');

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
  }, [messages.length, busy, statusText]);

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

  const isAgentAccess = visualPhase === 'entering' || visualPhase === 'operating';

  return (
    <div
      ref={stageRef}
      className="relative grid min-h-0 max-h-[80svh] flex-1 gap-6 grid-rows-[auto_minmax(0,1fr)] md:h-full md:max-h-[80svh] md:grid-cols-[minmax(20rem,1fr)_minmax(18rem,23rem)] md:grid-rows-none md:gap-8 lg:gap-12"
    >
      <AgentCursor
        visible={cursorVisible}
        x={cursorPos.x}
        y={cursorPos.y}
        reducedMotion={reducedMotion}
      />

      {/* LEFT: Full Simulated Business Website with Contextual Agent Interaction Overlay */}
      <div className="order-1 flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-xs md:h-full">
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

      {/* RIGHT: Customer's Personal Agent Conversation (Adopted Design & Framework) */}
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

        <div
          data-demo-target="chat"
          data-demo-playback={playbackState}
          className="flex h-full max-h-[80svh] min-h-0 w-full max-w-sm flex-col self-start overflow-hidden rounded-[14px] border border-line bg-surface shadow-card md:mx-0"
          role="region"
          aria-label="Agent conversation"
        >
          {/* header — tabs + actions */}
          <div className="flex shrink-0 items-center justify-between border-b border-line p-1.5">
            <div className="flex items-center">
              {['Assistant', 'Activity'].map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={tab === item}
                  onClick={() => setTab(item)}
                  className={`rounded-[6px] px-2 py-[3px] text-[13px] text-ink transition-[background-color,opacity] duration-100 ${tab === item ? 'bg-field' : 'opacity-50 hover:opacity-75'}`}
                >
                  {item}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1">
              {[
                <path key="p" d="M12 5v14M5 12h14" />,
                <g key="h"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></g>,
                <g key="e" fill="currentColor" stroke="none"><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></g>,
              ].map((icon, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label="Action"
                  className="flex size-6 items-center justify-center rounded-[6px] text-ink-3 transition-colors duration-100 hover:bg-hover hover:text-ink-2"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {icon}
                  </svg>
                </button>
              ))}
            </div>
          </div>

          {/* conversation — fixed region so the card never changes shape */}
          <div
            ref={messagesScrollerRef}
            className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-3 pt-2.5 pb-1"
          >
            {messages.map((msg) => {
              if (msg.role === 'user') {
                return (
                  <div key={msg.id} className="flex justify-end pl-10">
                    <div
                      className="rounded-xl bg-field px-3 py-1.5 text-[13px] leading-[1.4] text-ink transition-[opacity,transform] duration-300"
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
                <Section
                  key={msg.id}
                  label="Personal Agent"
                  sub={config.businessName}
                  time="now"
                  body={msg.text}
                />
              );
            })}

            {busy || visualPhase !== 'idle' ? (
              <Section
                label="Personal Agent"
                sub={visualPhase === 'operating' ? 'Website Access' : 'Consulting'}
                time="working"
                body={statusText ?? `Working with ${config.businessName}…`}
                resolving={true}
              />
            ) : null}
          </div>

          {/* composer */}
          <div className="mt-auto shrink-0 p-1.5">
            <div
              role="presentation"
              className="flex cursor-text flex-col gap-2 rounded-control border border-line bg-field p-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.035)] transition-[border-color,box-shadow] duration-150 focus-within:border-line-strong focus-within:shadow-[0_1px_2px_rgba(0,0,0,0.025)]"
            >
              <input
                value={
                  busy
                    ? 'Agent accessing business website…'
                    : playbackState === 'completed'
                      ? 'Walkthrough complete'
                      : 'Prompt or tag a service with @'
                }
                readOnly
                aria-label="Chat prompt"
                className="min-h-4.5 bg-transparent text-[13px] leading-[1.4] text-ink outline-none placeholder:text-ink-3"
              />
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-ink-3">
                  {footerLabel}
                </span>
                <button
                  type="button"
                  aria-label="Send"
                  disabled
                  className="flex size-7 items-center justify-center rounded-[8px] transition-[background-color,color,transform] duration-200"
                  style={{
                    background: 'var(--line-strong)',
                    color: 'var(--ink-2)',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
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
