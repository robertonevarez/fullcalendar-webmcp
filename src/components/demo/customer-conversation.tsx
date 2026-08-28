'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AgentCursor } from '@/components/demo/agent-cursor';
import {
  AgentInteractionOverlay,
  type VisualStepEvent,
} from '@/components/demo/agent-interaction-overlay';
import type { BrowserState } from '@/components/demo/browser-toolbar';
import { BusinessWebsite } from '@/components/demo/business-website';
import { ThinkingTrace } from '@/components/demo/thinking-trace';
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
  /** Landing page: cap height so the window floats with surrounding whitespace. */
  landing?: boolean;
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
      <p className="text-xs leading-snug text-ink whitespace-pre-wrap">{text}</p>
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
  landing = false,
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

  const [isSplitView, setIsSplitView] = useState(false);
  const isSplitViewRef = useRef(false);

  const [showThinking, setShowThinking] = useState(false);

  const [browserState, setBrowserState] = useState<BrowserState>('blank');
  const browserStateRef = useRef<BrowserState>('blank');

  const [visualPhase, setVisualPhase] = useState<VisualPhase>('idle');
  const [overlayEvent, setOverlayEvent] = useState<VisualStepEvent | null>(null);
  const [cursorVisible, setCursorVisible] = useState(false);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [statusText, setStatusText] = useState<string | null>(null);
  const [playbackState, setPlaybackState] = useState<PlaybackState>('playing');

  const [scrollEdge, setScrollEdge] = useState<{ top: boolean; bottom: boolean }>({
    top: false,
    bottom: false,
  });

  const updateScrollFade = useCallback(() => {
    const el = messagesScrollerRef.current;
    if (!el) return;
    const isTop = el.scrollTop <= 2;
    const isBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= 2;
    setScrollEdge((prev) => {
      if (prev.top === !isTop && prev.bottom === !isBottom) return prev;
      return { top: !isTop, bottom: !isBottom };
    });
  }, []);

  // Auto-scroll messages
  useEffect(() => {
    if (messagesScrollerRef.current) {
      messagesScrollerRef.current.scrollTo({
        top: messagesScrollerRef.current.scrollHeight,
        behavior: 'smooth',
      });
      updateScrollFade();
    }
  }, [messages.length, busy, statusText, draft, showThinking, updateScrollFade]);

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
          const t = setTimeout(resolve, 750);
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

    // When agent accesses the business website for the first time:
    // 1. Show Thinking Trace in the chat
    // 2. Expand split-view to reveal in-app browser on the right
    // 3. Connect to WebMCP and load the page
    if (!isSplitViewRef.current) {
      setShowThinking(true);
      setStatusText(`Agent analyzing request & opening in-app browser…`);

      if (!reducedMotionRef.current) {
        await new Promise<void>((resolve, reject) => {
          const t = setTimeout(resolve, 600);
          options.signal.addEventListener(
            'abort',
            () => {
              clearTimeout(t);
              reject(new DOMException('Aborted', 'AbortError'));
            },
            { once: true },
          );
        });
      }
      if (options.signal.aborted) return;

      setIsSplitView(true);
      isSplitViewRef.current = true;
      setBrowserState('navigating');

      if (!reducedMotionRef.current) {
        await new Promise<void>((resolve, reject) => {
          const t = setTimeout(resolve, 500);
          options.signal.addEventListener(
            'abort',
            () => {
              clearTimeout(t);
              reject(new DOMException('Aborted', 'AbortError'));
            },
            { once: true },
          );
        });
      }
      if (options.signal.aborted) return;

      setBrowserState('loaded');
      browserStateRef.current = 'loaded';
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
    setShowThinking(false);
    setMessages((prev) => [
      ...prev,
      { id: `assistant_${crypto.randomUUID()}`, role: 'assistant', text: options.reply },
    ]);
  }

  async function executeScriptedTurn(message: string, signal: AbortSignal) {
    // 1. User typing phase: Agent remains idle
    setBusy(false);
    setStatusText(null);

    try {
      // Simulate user typing into the personal agent chat prompt
      if (!reducedMotionRef.current) {
        const chars = Array.from(message);
        const charDelay = Math.max(24, Math.min(40, Math.floor(650 / chars.length)));
        for (let i = 1; i <= chars.length; i++) {
          if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
          setDraft(message.slice(0, i));
          await new Promise<void>((resolve, reject) => {
            const t = setTimeout(resolve, charDelay);
            signal.addEventListener(
              'abort',
              () => {
                clearTimeout(t);
                reject(new DOMException('Aborted', 'AbortError'));
              },
              { once: true },
            );
          });
        }
        // Hesitation before pressing send
        await new Promise<void>((resolve, reject) => {
          const t = setTimeout(resolve, 220);
          signal.addEventListener(
            'abort',
            () => {
              clearTimeout(t);
              reject(new DOMException('Aborted', 'AbortError'));
            },
            { once: true },
          );
        });
      }

      if (signal.aborted) throw new DOMException('Aborted', 'AbortError');

      // 2. User confirms/sends the message: clear prompt, render user message bubble
      setDraft('');
      setMessages((prev) => [
        ...prev,
        { id: `user_${crypto.randomUUID()}`, role: 'user', text: message },
      ]);

      // 3. Post-send artificial beat: user message lands before agent reacts
      await waitAfterUserAppear(signal);

      if (signal.aborted) {
        throw new DOMException('Aborted', 'AbortError');
      }

      // 4. NOW the agent receives the message and becomes busy
      setBusy(true);

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
      setStatusText(null);
    }
  }

  const [restartCount, setRestartCount] = useState(0);

  const handleReset = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    setRestartCount((c) => c + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    abortRef.current = controller;

    conversationRef.current = emptyConversationState();
    setConversation(emptyConversationState());
    setBusinessNotice(null);
    setMessages([]);
    setDraft('');
    browserStateRef.current = 'blank';
    setBrowserState('blank');
    isSplitViewRef.current = false;
    setIsSplitView(false);
    setShowThinking(false);
    setStatusText(null);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restartCount]);

  const isAgentAccess = visualPhase === 'entering' || visualPhase === 'operating';
  const canSend = draft.trim().length > 0;

  return (
    <div
      ref={stageRef}
      className={cn(
        'relative flex h-full min-h-0 w-full max-w-[76rem] flex-1 flex-col items-stretch transition-all duration-700 ease-in-out',
      )}
    >
      <AgentCursor
        visible={cursorVisible}
        x={cursorPos.x}
        y={cursorPos.y}
        reducedMotion={reducedMotion}
      />

      {/* SINGLE UNIFIED WINDOW SHELL (Zero Gap!) */}
      <div
        className={cn(
          'flex w-full flex-col overflow-hidden rounded-[14px] border border-line bg-surface shadow-2xl transition-all duration-700 ease-in-out',
          landing
            ? 'min-h-0 h-full flex-1'
            : 'min-h-0 h-full max-h-full flex-1',
          isSplitView ? 'max-w-none' : 'max-w-[23.5rem] mx-auto',
        )}
      >
        {/* Top Unified Window Toolbar */}
        <div
          className="relative flex h-6 shrink-0 select-none items-center border-b border-line/50 bg-background/80 backdrop-blur-md text-xs text-muted-foreground"
          role="region"
          aria-label="Agent window toolbar"
        >
          {/* Left Header: Traffic Lights & Centered "AI Agent" Title */}
          <div
            className={cn(
              'flex h-full items-center justify-between px-2 transition-all duration-700 ease-in-out',
              isSplitView ? 'w-[18rem] sm:w-[20rem] md:w-[23.5rem] shrink-0 border-r border-line/50' : 'w-full',
            )}
          >
            <div className="flex w-12 items-center gap-1.5 opacity-60" aria-hidden="true">
              <span className="size-2 rounded-full bg-[#ff5f56]" />
              <span className="size-2 rounded-full bg-[#ffbd2e]" />
              <span className="size-2 rounded-full bg-[#27c93f]" />
            </div>

            <div className="flex flex-1 items-center justify-center text-xs font-medium text-foreground/85">
              <span>AI Agent</span>
            </div>

            <div className="w-12" aria-hidden="true" />
          </div>

          {/* Right Header: Centered In-App Browser Address Bar */}
          {isSplitView && (
            <div className="flex h-full flex-1 items-center justify-center px-2 animate-in fade-in duration-500">
              <div className="flex items-center justify-center gap-1 text-xs">
                <span className="font-medium text-foreground/85">https://acmehvac.com</span>
                <span className="inline-flex items-center gap-1 text-xs font-normal text-emerald-600 dark:text-emerald-400">
                  <span>·</span>
                  <span>WebMCP Active</span>
                </span>
                {browserState === 'navigating' && (
                  <span className="text-xs text-muted-foreground animate-pulse">
                    · Connecting…
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Window Interior: Left Chat Pane + Right Browser Pane (Zero Gap, Pixel-aligned!) */}
        <div className="flex min-h-0 flex-1 flex-row overflow-hidden">
          {/* LEFT: Customer's Personal Agent Conversation */}
          <div
            data-demo-target="chat"
            data-demo-playback={playbackState}
            className={cn(
              inter.className,
              'flex h-full min-h-0 flex-col bg-surface transition-all duration-700 ease-in-out',
              isSplitView ? 'w-[18rem] sm:w-[20rem] md:w-[23.5rem] shrink-0 border-r border-line/50' : 'w-full',
            )}
            role="region"
            aria-label="Agent conversation"
          >
            {/* conversation — scrollable messages area */}
            <ScrollArea
              hideScrollbar
              className="flex-1 min-h-0"
              viewportRef={messagesScrollerRef}
              onScroll={updateScrollFade}
              viewportClassName={cn(
                'p-2.5 pb-3 flex flex-col gap-2 transition-[mask-image] duration-200',
                scrollEdge.top && scrollEdge.bottom && 'scroll-fade',
                scrollEdge.top && !scrollEdge.bottom && 'scroll-fade-t',
                !scrollEdge.top && scrollEdge.bottom && 'scroll-fade-b',
              )}
            >
              {messages.map((msg) => {
                if (msg.role === 'user') {
                  return (
                    <div key={msg.id} className="flex justify-end pl-8">
                      <div
                        className="rounded-full bg-[#007AFF] px-2.5 py-1 text-xs leading-snug text-white transition-[opacity,transform] duration-300"
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

              {showThinking && (
                <ThinkingTrace
                  reducedMotion={reducedMotion}
                />
              )}

              {busy || visualPhase !== 'idle' ? (
                <AssistantMessage
                  text={statusText || `Working with ${config.businessName}…`}
                  resolving={true}
                />
              ) : null}
            </ScrollArea>

            {/* composer — prompt text area */}
            <div className="mt-auto shrink-0 p-1.5">
              <div
                role="presentation"
                className="flex flex-col gap-1 rounded-[10px] border border-line bg-background p-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.035)]"
              >
                <input
                  value={draft}
                  readOnly
                  tabIndex={-1}
                  placeholder={playbackState === 'completed' ? 'Conversation ended' : 'Ask your agent anything…'}
                  aria-label="Chat prompt"
                  className="pointer-events-none min-h-4 select-none bg-transparent text-xs leading-snug text-ink outline-none placeholder:text-ink-3"
                />
                <div className="flex items-center justify-end">
                  {playbackState === 'completed' ? (
                    <button
                      type="button"
                      onClick={handleReset}
                      aria-label="Reset demo"
                      className="flex size-6 items-center justify-center rounded-full bg-foreground text-background transition-[background-color,color,transform,opacity] duration-200 hover:opacity-85 active:scale-95 cursor-pointer shadow-xs"
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                        <path d="M3 3v5h5" />
                      </svg>
                    </button>
                  ) : (
                    <button
                      type="button"
                      tabIndex={-1}
                      aria-label="Send"
                      disabled={!canSend}
                      className="pointer-events-none flex size-6 select-none items-center justify-center rounded-full bg-muted text-muted-foreground transition-[background-color,color,transform] duration-200"
                    >
                      <svg
                        width="12"
                        height="12"
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
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: In-App Browser Surface Container (Seamless, zero gap!) */}
          {isSplitView && (
            <div className="flex min-h-0 flex-1 flex-col bg-white overflow-hidden animate-in fade-in duration-500">
              <BusinessWebsite
                className="h-full min-h-0 border-0 rounded-none"
                config={config}
                lastBooking={conversation.lastBooking}
                businessNotice={businessNotice}
                isAgentAccess={isAgentAccess}
                browserState={browserState}
                showHeader={false}
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
          )}
        </div>
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {statusText}
      </p>
    </div>
  );
}
