'use client';

import { useWebMCPRegistrationState } from '@/components/webmcp-business-provider';
import { WEBMCP_TOOL_NAMES } from '@/webmcp/tools';
import type { WebMCPRegistrationState } from '@/webmcp/lifecycle';
import { cn } from '@/lib/utils';

function registrationLabel(state: WebMCPRegistrationState): string {
  switch (state.phase) {
    case 'waiting':
      return 'Waiting for WebMCP API…';
    case 'registering':
      return 'Registering tools…';
    case 'registered':
      return 'Tools registered on this page.';
    case 'failed':
      if (!state.supported && !state.attempted) {
        return 'WebMCP API not available in this browser.';
      }
      if (state.registered.length > 0) {
        return `Partial registration (${state.registered.length} tools).`;
      }
      return 'Tool registration failed.';
    default:
      return 'Unknown registration state.';
  }
}

const inspectType = 'font-mono text-xs leading-relaxed tracking-tight';

export function WebMCPInspectView({ className }: { className?: string }) {
  const state = useWebMCPRegistrationState();
  const isRegistered = state.phase === 'registered';
  const isPartial =
    state.phase === 'failed' && 'registered' in state && state.registered.length > 0;
  const available = isRegistered || isPartial;
  const tools = available ? state.registered : [...WEBMCP_TOOL_NAMES];
  const toolsCaption = available ? 'Available' : 'Expected';

  const showUnsupportedHint =
    state.phase === 'failed' && !state.supported && !state.attempted;

  return (
    <div
      className={cn(
        'relative flex h-full w-full flex-col justify-between p-6 sm:p-8 md:p-9 lg:p-10',
        inspectType,
        available ? 'text-green-600' : 'text-red-600',
        className,
      )}
      aria-labelledby="webmcp-inspect-heading"
    >
      <div>
        <h2 id="webmcp-inspect-heading" className="sr-only">
          WebMCP
        </h2>
        <p>{registrationLabel(state)}</p>
      </div>

      <div className="flex w-full flex-col gap-1">
        <p>{toolsCaption}</p>
        <ul>
          {tools.map((tool) => (
            <li key={tool} className="truncate">
              {tool}
            </li>
          ))}
        </ul>
        {showUnsupportedHint ? (
          <p>
            Use ChatGPT&apos;s in-app browser or Chrome with chrome://flags/#enable-webmcp-testing.
          </p>
        ) : null}
      </div>
    </div>
  );
}
