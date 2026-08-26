'use client';

import { useLayoutEffect, useState } from 'react';
import {
  logRegistrationState,
  registerPingTool,
  waitForModelContext,
} from '@/webmcp/lifecycle';
import { getModelContext, isWebMCPSupported } from '@/webmcp/tools';

type DebugState = {
  modelContextPresent: boolean;
  registration: Awaited<ReturnType<typeof registerPingTool>> | null;
};

export default function WebMCPDebugPage() {
  const [state, setState] = useState<DebugState>({
    modelContextPresent: isWebMCPSupported(),
    registration: null,
  });

  useLayoutEffect(() => {
    const controller = new AbortController();

    (async () => {
      await waitForModelContext({ signal: controller.signal });
      const registration = await registerPingTool(controller.signal);
      logRegistrationState(
        registration.registered.length
          ? { phase: 'registered', ...registration }
          : { phase: 'failed', ...registration },
      );
      setState({
        modelContextPresent: Boolean(getModelContext()?.registerTool),
        registration,
      });
    })();

    return () => controller.abort();
  }, []);

  const pingRegistered = state.registration?.registered.includes('ping') ?? false;

  const registrationPhase = state.registration
    ? state.registration.registered.length > 0
      ? 'registered'
      : 'failed'
    : 'pending';

  return (
    <main>
      <section className="business-hero">
        <h1>WebMCP debug</h1>
        <p className="meta-line">
          Minimal diagnostic surface: one read-only <code>ping</code> tool. Use this page to verify client
          discovery independently of business-page complexity.
        </p>
      </section>

      <section className="status-panel">
        <h2>Runtime</h2>
        <p>
          <strong>document.modelContext:</strong>{' '}
          {typeof document !== 'undefined' && 'modelContext' in document ? 'present' : 'absent'}
        </p>
        <p>
          <strong>registerTool callable:</strong> {state.modelContextPresent ? 'yes' : 'no'}
        </p>
        <p>
          <strong>Registration phase:</strong> {registrationPhase}
        </p>
        <p>
          <strong>Registered tools:</strong>{' '}
          {state.registration?.registered.length
            ? state.registration.registered.join(', ')
            : 'none yet'}
        </p>
        <p>
          <strong>Ping tool:</strong> {pingRegistered ? 'registered' : 'not registered'}
        </p>
        {process.env.NODE_ENV !== 'production' && state.registration?.errors.length ? (
          <ul>
            {state.registration.errors.map((error, index) => (
              <li key={index}>
                {error.tool ? `${error.tool}: ` : ''}
                {error.message}
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </main>
  );
}
