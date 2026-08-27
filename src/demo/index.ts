export type { DemoConfig, DemoConversationState, DemoTurnRequest, DemoTurnResponse } from '@/demo/types';
export { DEFAULT_CUSTOMER_PROMPT, DEFAULT_DEMO_CONFIG } from '@/demo/defaults';
export { cloneDemoConfig, normalizeDemoConfig } from '@/demo/normalize';
export { DemoBookingEngine, emptyConversationState } from '@/demo/engine';
export { processDemoTurn, processDemoTurnSafe } from '@/demo/conversation';
export {
  formatDaysLabel,
  formatHoursLabel,
  formatPriceCents,
  formatSlotWhen,
} from '@/demo/format';
