'use client';

import { useWebMCPRegistrationState } from '@/components/WebMCPBusinessProvider';
import { WEBMCP_TOOL_NAMES } from '@/webmcp/tools';

interface WebMCPStatusProps {
  businessSlug: string;
  businessName: string;
}

function registrationLabel(state: ReturnType<typeof useWebMCPRegistrationState>): string {
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

export function WebMCPStatus({ businessSlug, businessName }: WebMCPStatusProps) {
  const state = useWebMCPRegistrationState();

  const showDevErrors =
    process.env.NODE_ENV !== 'production' && state.phase === 'failed' && state.errors.length > 0;

  return (
    <div className="status-panel" aria-labelledby="webmcp-status-heading">
      <h3 id="webmcp-status-heading">WebMCP status</h3>
      <p>
        <strong>Business context:</strong> {businessName} (<code>{businessSlug}</code>)
      </p>
      <p>
        <strong>WebMCP supported:</strong>{' '}
        {state.supported || state.phase === 'waiting' ? (state.supported ? 'yes' : 'pending') : 'no'}
      </p>
      <p>
        <strong>Registration attempted:</strong>{' '}
        {state.phase === 'waiting' ? 'pending' : state.attempted ? 'yes' : 'no'}
      </p>
      <p>
        <strong>Registration:</strong>{' '}
        {state.phase === 'registered' ? (
          <span className="status-ok">{registrationLabel(state)}</span>
        ) : state.phase === 'failed' ? (
          <span className="status-warn">{registrationLabel(state)}</span>
        ) : (
          registrationLabel(state)
        )}
      </p>
      {state.phase === 'registered' && (
        <>
          <p>
            <strong>Registered tools ({state.registered.length}):</strong>
          </p>
          <ul className="tool-list">
            {state.registered.map((tool) => (
              <li key={tool}>
                <code>{tool}</code>
              </li>
            ))}
          </ul>
        </>
      )}
      {state.phase === 'failed' && !state.supported && !state.attempted && (
        <p className="meta-line">
          Use ChatGPT&apos;s in-app browser (GPT-5.6 Sol or Terra) or Chrome with{' '}
          <code>chrome://flags/#enable-webmcp-testing</code>. Site tools require a compatible client
          — not a conventional browser tab.
        </p>
      )}
      {showDevErrors && (
        <details>
          <summary>Registration errors (development only)</summary>
          <ul>
            {state.errors.map((error, index) => (
              <li key={`${error.tool ?? 'general'}-${index}`}>
                {error.tool ? (
                  <>
                    <code>{error.tool}</code>: {error.message}
                  </>
                ) : (
                  error.message
                )}
              </li>
            ))}
          </ul>
        </details>
      )}
      <p className="expected-tools">
        <strong>Expected tools:</strong>{' '}
        {WEBMCP_TOOL_NAMES.map((name) => (
          <code key={name}>{name}</code>
        ))}
      </p>
    </div>
  );
}
