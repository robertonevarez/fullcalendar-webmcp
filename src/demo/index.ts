export type {
  DemoActivityResult,
  DemoActivityStep,
  DemoActivityTarget,
  DemoBusinessNotice,
  DemoConfig,
  DemoConversationState,
  DemoPendingService,
  DemoTurnRequest,
  DemoTurnResponse,
} from '@/demo/types';
export { DEFAULT_CUSTOMER_PROMPT, DEFAULT_DEMO_CONFIG } from '@/demo/defaults';
export {
  DEMO_PRESETS,
  DEFAULT_PRESET_ID,
  getDemoPreset,
  getDefaultPreset,
  type DemoPreset,
  type DemoPresetId,
} from '@/demo/presets';
export { DEMO_AGENT_CAPABILITIES, mergeActivity } from '@/demo/capabilities';
export { cloneDemoConfig, normalizeDemoConfig } from '@/demo/normalize';
export { DemoBookingEngine, emptyConversationState } from '@/demo/engine';
export { processDemoTurn, processDemoTurnSafe } from '@/demo/conversation';
export { playVisualSequence, WALKTHROUGH_VISUAL_TIMINGS } from '@/demo/visual-sequence';
export {
  CANONICAL_WALKTHROUGH_SCRIPT,
  playWalkthrough,
  WALKTHROUGH_PACING,
  type PlaybackState,
  type WalkthroughScript,
} from '@/demo/walkthrough';
export {
  formatDaysLabel,
  formatHoursLabel,
  formatPriceCents,
  formatSlotWhen,
} from '@/demo/format';
