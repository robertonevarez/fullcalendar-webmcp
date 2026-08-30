import type { WebMCPRegistrationState } from '@/webmcp/lifecycle';

export type ChatGPTBookingGuideMode = 'checking' | 'ready' | 'unavailable';

/**
 * Map WebMCP registration phases to customer-facing guide modes.
 * Never treat `waiting` / `registering` as unsupported (avoids hydrate flash).
 */
export function bookingGuideMode(state: WebMCPRegistrationState): ChatGPTBookingGuideMode {
  switch (state.phase) {
    case 'waiting':
    case 'registering':
      return 'checking';
    case 'registered':
      return 'ready';
    case 'failed':
      return 'unavailable';
    default:
      return 'checking';
  }
}
