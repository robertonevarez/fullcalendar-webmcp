'use client';

import type { WebMCPRegistrationState } from '@/webmcp/lifecycle';
import { WEBMCP_TOOL_NAMES } from '@/webmcp/tools';
import { InlinePagePanel } from '@/components/inline-page-panel';

export interface WebMCPInspectPanelProps {
  onBack: () => void;
  registrationState: WebMCPRegistrationState;
  businessName: string;
}

export function WebMCPInspectPanel({
  onBack,
  registrationState,
  businessName,
}: WebMCPInspectPanelProps) {
  const registeredNames =
    'registered' in registrationState && registrationState.registered.length > 0
      ? registrationState.registered
      : registrationState.phase === 'registered'
        ? [...WEBMCP_TOOL_NAMES]
        : [];

  const errors =
    'errors' in registrationState ? registrationState.errors : [];

  return (
    <InlinePagePanel
      title="Inspect tooling"
      description={`Technical status for ${businessName}. Not shown to typical customers.`}
      onBack={onBack}
    >
      <dl className="grid gap-3 border-t border-border pt-4 text-base tracking-tight">
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Phase</dt>
          <dd className="font-medium text-foreground">{registrationState.phase}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Supported</dt>
          <dd className="font-medium text-foreground">
            {registrationState.supported ? 'yes' : 'no'}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Attempted</dt>
          <dd className="font-medium text-foreground">
            {registrationState.attempted ? 'yes' : 'no'}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Registered tools</dt>
          <dd className="font-medium text-foreground">{registeredNames.length}</dd>
        </div>
      </dl>

      {registeredNames.length > 0 ? (
        <ul className="list-inside list-disc text-sm tracking-tight text-muted-foreground">
          {registeredNames.map((name) => (
            <li key={name} className="font-mono text-foreground">
              {name}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm tracking-tight text-muted-foreground">
          No tools registered yet. Expected suite:{' '}
          {WEBMCP_TOOL_NAMES.join(', ')}.
        </p>
      )}

      {errors.length > 0 ? (
        <ul className="list-inside list-disc text-sm tracking-tight text-destructive">
          {errors.map((error) => (
            <li key={`${error.tool}:${error.message}`}>
              {error.tool}: {error.message}
            </li>
          ))}
        </ul>
      ) : null}
    </InlinePagePanel>
  );
}
